-- =========================================================
-- AETHER MINING — real block ticks + treasury-per-block (Phase 12)
--
-- Problem this fixes: "blocks" weren't really blocks — every player
-- claim ran its own private emission calculation over its own elapsed
-- time, and mining_blocks logged one row PER CLAIM. That's a claim
-- ledger, not a block explorer, and it meant the 5% Treasury tax was
-- computed on whatever a player happened to claim, not on a fixed
-- per-block reward.
--
-- Fix — a real block tick:
--   - tick_block() is scheduled via pg_cron to run every 60 seconds,
--     completely independent of anyone claiming anything. Each tick:
--       1. Computes THIS block's reward from the halving curve (500
--          AETHER at epoch 0, halving every 100,000 blocks — unchanged).
--       2. Splits it by real-active-hashrate vs the ghost-hashrate floor
--          (unchanged concept from Phase 5/6) — the ghost's uncaptured
--          share is banked into carryover_pool, exactly as before.
--       3. Releases carryover-pool subsidy the same way as before, once
--          real active hashrate clears the unlock threshold.
--       4. Takes 5% of THAT BLOCK's distributable total for Treasury —
--          a tax on the block, not on any individual's claim.
--       5. Splits the remaining 95% across every CURRENTLY ACTIVE player
--         (synced in the last 30s — same window active_network_hashrate
--          already used) by hashrate share, crediting it straight to
--          each player's `pending` balance.
--       6. Logs exactly ONE row to mining_blocks for the whole network —
--          a real block explorer entry, not a per-claim receipt.
--
--   - claim_mining_reward() is now trivial: it just moves whatever has
--     already accumulated in a player's `pending` (from ticks since they
--     last claimed) into their spendable `core`. No emission math left
--     in it at all — that all happens in tick_block() now.
-- =========================================================

-- game_state needs to know when the last block was minted, so the UI can
-- show a "next block in Xs" countdown.
alter table game_state add column if not exists last_block_at timestamptz not null default now();

-- mining_blocks becomes a block-level ledger (one row per tick) instead
-- of a per-claim one.
alter table mining_blocks drop column if exists player_id;
alter table mining_blocks drop column if exists player_name;
alter table mining_blocks drop column if exists hashrate;
alter table mining_blocks drop column if exists base_reward;
alter table mining_blocks add column if not exists active_miners int not null default 0;
alter table mining_blocks add column if not exists active_hashrate numeric not null default 0;
-- total_reward/subsidy_reward/treasury_cut/halving_epoch/global_total_mined_after/
-- carryover_pool_after already exist from earlier migrations and are reused
-- as block-level totals instead of per-player ones.

create or replace function tick_block()
returns void
language plpgsql
security definer
as $$
declare
  v_global_mined numeric;
  v_carryover_pool numeric;
  v_treasury_pool numeric;
  v_max_supply constant numeric := 100000000;
  v_initial_reward constant numeric := 500;
  v_block_time_seconds constant numeric := 60;
  v_ghost_hashrate constant numeric := 2e12;
  v_subsidy_unlock_hashrate constant numeric := 10e12;
  v_subsidy_half_life_seconds constant numeric := 14 * 24 * 3600;
  v_treasury_tax_rate constant numeric := 0.05;
  v_epoch int;
  v_halving_mult numeric;
  v_block_reward numeric;
  v_real_active_hashrate numeric;
  v_num_active int;
  v_ghost_padded numeric;
  v_captured_by_miners numeric;
  v_carryover_delta numeric;
  v_subsidy_release numeric;
  v_distributable numeric;
  v_treasury_cut numeric;
  v_net_distributable numeric;
  v_now timestamptz := now();
begin
  select total_mined, carryover_pool, treasury_pool into v_global_mined, v_carryover_pool, v_treasury_pool from game_state where id = true for update;

  if v_global_mined >= v_max_supply - 1 then
    v_epoch := 64;
  else
    v_epoch := floor(-ln(1 - v_global_mined / v_max_supply) / ln(2));
  end if;
  v_halving_mult := power(0.5, v_epoch);
  v_block_reward := v_initial_reward * v_halving_mult;

  select coalesce(sum(cached_hashrate), 0), count(*)
    into v_real_active_hashrate, v_num_active
    from players where last_synced_at > v_now - interval '30 seconds';

  v_ghost_padded := v_real_active_hashrate + v_ghost_hashrate;
  v_captured_by_miners := case when v_ghost_padded > 0 then v_block_reward * (v_real_active_hashrate / v_ghost_padded) else 0 end;
  v_carryover_delta := greatest(0, v_block_reward - v_captured_by_miners);

  v_subsidy_release := 0;
  if v_real_active_hashrate >= v_subsidy_unlock_hashrate and v_carryover_pool > 0 then
    v_subsidy_release := v_carryover_pool * (1 - power(0.5, v_block_time_seconds / v_subsidy_half_life_seconds));
    v_subsidy_release := least(v_subsidy_release, v_carryover_pool);
  end if;

  v_distributable := v_captured_by_miners + v_subsidy_release;
  -- TREASURY TAX: 5% of THIS BLOCK's distributable reward, every tick,
  -- regardless of whether anyone claims anything this minute
  v_treasury_cut := v_distributable * v_treasury_tax_rate;
  v_net_distributable := v_distributable - v_treasury_cut;
  v_net_distributable := least(v_net_distributable, v_max_supply - v_global_mined);

  if v_real_active_hashrate > 0 and v_net_distributable > 0 then
    update players
      set pending = pending + (v_net_distributable * cached_hashrate / v_real_active_hashrate)
      where last_synced_at > v_now - interval '30 seconds';
  end if;

  update game_state set
    total_mined = v_global_mined + v_net_distributable + v_treasury_cut,
    carryover_pool = greatest(0, v_carryover_pool + v_carryover_delta - v_subsidy_release),
    treasury_pool = v_treasury_pool + v_treasury_cut,
    last_block_at = v_now,
    updated_at = v_now
  where id = true;

  insert into mining_blocks (block_time, total_reward, subsidy_reward, treasury_cut, active_miners, active_hashrate, halving_epoch, global_total_mined_after, carryover_pool_after)
  values (v_now, v_net_distributable, v_subsidy_release, v_treasury_cut, v_num_active, v_real_active_hashrate, v_epoch,
          v_global_mined + v_net_distributable + v_treasury_cut, greatest(0, v_carryover_pool + v_carryover_delta - v_subsidy_release));
end;
$$;

-- claim_mining_reward is now just "cash out my accumulated pending balance
-- into core" — all the emission/halving/ghost-hashrate/treasury math moved
-- into tick_block() above, which runs on its own schedule.
create or replace function claim_mining_reward(
  p_telegram_id bigint,
  p_hashrate numeric
)
returns table (
  awarded numeric,
  new_core numeric,
  new_total_earned numeric,
  new_player_total_mined numeric,
  new_global_total_mined numeric
)
language plpgsql
security definer
as $$
declare
  v_player_id uuid;
  v_core numeric;
  v_total_earned numeric;
  v_player_total_mined numeric;
  v_pending numeric;
  v_global_mined numeric;
  v_now timestamptz := now();
begin
  select id, core, total_earned, total_mined, pending
    into v_player_id, v_core, v_total_earned, v_player_total_mined, v_pending
    from players where telegram_id = p_telegram_id for update;

  if v_player_id is null then
    raise exception 'player not found for telegram_id %', p_telegram_id;
  end if;

  update players set cached_hashrate = p_hashrate, last_synced_at = v_now where id = v_player_id;

  update players set
    core = v_core + coalesce(v_pending, 0),
    total_earned = v_total_earned + coalesce(v_pending, 0),
    total_mined = v_player_total_mined + coalesce(v_pending, 0),
    pending = 0,
    updated_at = v_now
  where id = v_player_id;

  select total_mined into v_global_mined from game_state where id = true;

  return query select coalesce(v_pending, 0), v_core + coalesce(v_pending, 0), v_total_earned + coalesce(v_pending, 0), v_player_total_mined + coalesce(v_pending, 0), v_global_mined;
end;
$$;

-- get_network_stats() gained a new column (next_block_in_seconds) —
-- Postgres refuses CREATE OR REPLACE when the OUT-parameter shape
-- changes, so drop it first (same issue as migration 0010).
drop function if exists get_network_stats();

create or replace function get_network_stats()
returns table (
  max_supply numeric,
  total_mined numeric,
  carryover_pool numeric,
  treasury_pool numeric,
  reserve_pool numeric,
  treasury_tax_rate numeric,
  block_time_seconds numeric,
  initial_block_reward numeric,
  halving_interval_blocks numeric,
  current_epoch int,
  current_block_reward numeric,
  ghost_hashrate numeric,
  real_active_hashrate numeric,
  subsidy_unlock_hashrate numeric,
  subsidy_active boolean,
  next_block_in_seconds numeric
)
language plpgsql
stable
as $$
declare
  v_global_mined numeric;
  v_carryover numeric;
  v_treasury numeric;
  v_reserve numeric;
  v_last_block_at timestamptz;
  v_max_supply constant numeric := 100000000;
  v_initial_reward constant numeric := 500;
  v_block_time constant numeric := 60;
  v_halving_interval constant numeric := 100000;
  v_ghost constant numeric := 2e12;
  v_subsidy_unlock constant numeric := 10e12;
  v_treasury_tax_rate constant numeric := 0.05;
  v_epoch int;
  v_real_active numeric;
begin
  select gs.total_mined, gs.carryover_pool, gs.treasury_pool, gs.reserve_pool, gs.last_block_at
    into v_global_mined, v_carryover, v_treasury, v_reserve, v_last_block_at
    from game_state gs where gs.id = true;
  if v_global_mined >= v_max_supply - 1 then
    v_epoch := 64;
  else
    v_epoch := floor(-ln(1 - v_global_mined / v_max_supply) / ln(2));
  end if;
  v_real_active := active_network_hashrate(now());
  return query select
    v_max_supply, v_global_mined, v_carryover, v_treasury, v_reserve, v_treasury_tax_rate,
    v_block_time, v_initial_reward, v_halving_interval,
    v_epoch, v_initial_reward * power(0.5, v_epoch),
    v_ghost, v_real_active, v_subsidy_unlock,
    v_real_active >= v_subsidy_unlock,
    greatest(0, v_block_time - extract(epoch from (now() - v_last_block_at)));
end;
$$;

grant execute on function tick_block() to service_role, postgres;
grant execute on function claim_mining_reward(bigint, numeric) to service_role;
grant execute on function get_network_stats() to service_role;

-- ---------------------------------------------------------
-- SCHEDULE: run tick_block() every 60 seconds, forever, independent of
-- any player action. Requires the pg_cron extension (Database >
-- Extensions in the Supabase dashboard — available on all plans
-- including Free). Re-running this migration is safe: it unschedules
-- any existing job with the same name first.
-- ---------------------------------------------------------
create extension if not exists pg_cron;

do $$
begin
  perform cron.unschedule('aether-block-tick');
exception when others then
  null; -- job didn't exist yet — fine on first run
end $$;

select cron.schedule('aether-block-tick', '* * * * *', $$select tick_block();$$);
