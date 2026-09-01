-- =========================================================
-- AETHER MINING — per-pool IN/OUT tracking + real circulating supply
-- (Phase 16)
--
-- Problem this fixes:
--   1. Treasury/Reserve/Carryover pools only ever exposed their current
--      BALANCE — no way to see how much has ever flowed in vs. actually
--      flowed back out of each one, so there was no way to answer
--      "where did the AETHER that went into Treasury actually go?".
--   2. The "circulating supply" shown in Network Stats was just
--      `total_mined` — which already includes every AETHER cent sitting
--      un-spent inside treasury_pool (funds minted but not yet paid out
--      to any player). That overstates what's actually in players'
--      hands: money still parked in Treasury hasn't reached anyone yet,
--      so it isn't really "circulating".
--   3. Block Explorer rows always showed a "+X to miners" figure even
--      when it rounds to a near-zero sliver (ghost-hashrate floor with
--      few/no real active miners) — noisy, not the actual thing players
--      care about, which is just "who's mining right now and how much
--      hashrate do they have".
--
-- Fix:
--   - game_state gains six new running-total counters:
--       treasury_pool_in / treasury_pool_out
--       reserve_pool_in  / reserve_pool_out
--       carryover_pool_in / carryover_pool_out
--     Every function that already mutates a pool balance now also bumps
--     the matching in/out counter, so at all times
--       pool_balance == pool_in - pool_out
--     Existing balances at migration time are backfilled entirely into
--     the "_in" side (out defaults to 0) — we don't know the historical
--     breakdown, so this is the most honest starting point: everything
--     banked so far is treated as "in", and the counters are exact for
--     everything from this migration forward.
--   - get_network_stats() now also returns those six counters plus
--     circulating_supply = total_mined - treasury_pool (i.e. total
--     minted MINUS whatever is still sitting un-spent in Treasury —
--     only AETHER that has actually left Treasury, or never passed
--     through it, counts as circulating).
--   - Block Explorer's "to miners" figure is a frontend-only display
--     change (NetworkStatsScreen.jsx) — no schema change needed there.
-- =========================================================

alter table game_state add column if not exists treasury_pool_in numeric not null default 0;
alter table game_state add column if not exists treasury_pool_out numeric not null default 0;
alter table game_state add column if not exists reserve_pool_in numeric not null default 0;
alter table game_state add column if not exists reserve_pool_out numeric not null default 0;
alter table game_state add column if not exists carryover_pool_in numeric not null default 0;
alter table game_state add column if not exists carryover_pool_out numeric not null default 0;

-- Backfill: treat whatever's already banked as "_in" with zero "_out" so
-- far. Safe to re-run — only fires if the counters are still at their
-- just-added default of 0 (i.e. this migration hasn't backfilled yet).
update game_state set
  treasury_pool_in = treasury_pool,
  reserve_pool_in = reserve_pool,
  carryover_pool_in = carryover_pool
where id = true
  and treasury_pool_in = 0 and reserve_pool_in = 0 and carryover_pool_in = 0
  and (treasury_pool > 0 or reserve_pool > 0 or carryover_pool > 0);

-- ---------------------------------------------------------
-- tick_block() — same math as 0013, plus bumping the three "_in"/"_out"
-- counters alongside the balances they already touch.
-- ---------------------------------------------------------
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
  v_treasury_cut numeric;
  v_remaining_after_treasury numeric;
  v_real_active_hashrate numeric;
  v_num_active int;
  v_ghost_padded numeric;
  v_captured_by_miners numeric;
  v_carryover_delta numeric;
  v_subsidy_release numeric;
  v_net_distributable numeric;
  v_newly_minted numeric;
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

  v_treasury_cut := v_block_reward * v_treasury_tax_rate;
  v_remaining_after_treasury := v_block_reward - v_treasury_cut;

  select coalesce(sum(cached_hashrate), 0), count(*)
    into v_real_active_hashrate, v_num_active
    from players where last_synced_at > v_now - interval '30 seconds';

  v_ghost_padded := v_real_active_hashrate + v_ghost_hashrate;
  v_captured_by_miners := case when v_ghost_padded > 0 then v_remaining_after_treasury * (v_real_active_hashrate / v_ghost_padded) else 0 end;
  v_carryover_delta := greatest(0, v_remaining_after_treasury - v_captured_by_miners);

  v_subsidy_release := 0;
  if v_real_active_hashrate >= v_subsidy_unlock_hashrate and v_carryover_pool > 0 then
    v_subsidy_release := v_carryover_pool * (1 - power(0.5, v_block_time_seconds / v_subsidy_half_life_seconds));
    v_subsidy_release := least(v_subsidy_release, v_carryover_pool);
  end if;

  v_net_distributable := v_captured_by_miners + v_subsidy_release;
  v_newly_minted := v_treasury_cut + v_captured_by_miners;
  v_newly_minted := least(v_newly_minted, v_max_supply - v_global_mined);

  if v_real_active_hashrate > 0 and v_net_distributable > 0 then
    update players
      set pending = pending + (v_net_distributable * cached_hashrate / v_real_active_hashrate)
      where last_synced_at > v_now - interval '30 seconds';
  end if;

  update game_state set
    total_mined = v_global_mined + v_newly_minted,
    carryover_pool = greatest(0, v_carryover_pool + v_carryover_delta - v_subsidy_release),
    treasury_pool = v_treasury_pool + v_treasury_cut,
    treasury_pool_in = treasury_pool_in + v_treasury_cut,
    carryover_pool_in = carryover_pool_in + v_carryover_delta,
    carryover_pool_out = carryover_pool_out + v_subsidy_release,
    last_block_at = v_now,
    updated_at = v_now
  where id = true;

  insert into mining_blocks (block_time, block_reward, total_reward, subsidy_reward, treasury_cut, active_miners, active_hashrate, halving_epoch, global_total_mined_after, carryover_pool_after)
  values (v_now, v_block_reward, v_net_distributable, v_subsidy_release, v_treasury_cut, v_num_active, v_real_active_hashrate, v_epoch,
          v_global_mined + v_newly_minted, greatest(0, v_carryover_pool + v_carryover_delta - v_subsidy_release));
end;
$$;

-- ---------------------------------------------------------
-- Treasury in/out (Lootbox cost -> in, Lootbox payout -> out)
-- ---------------------------------------------------------
create or replace function add_to_treasury_pool(p_amount numeric)
returns numeric
language sql
security definer
as $$
  update game_state set
    treasury_pool = treasury_pool + greatest(0, p_amount),
    treasury_pool_in = treasury_pool_in + greatest(0, p_amount),
    updated_at = now()
  where id = true
  returning treasury_pool;
$$;

create or replace function pay_from_treasury_pool(p_amount numeric)
returns numeric
language plpgsql
security definer
as $$
declare
  v_pool numeric;
  v_paid numeric;
begin
  select treasury_pool into v_pool from game_state where id = true for update;
  v_paid := least(greatest(0, p_amount), v_pool);
  update game_state set
    treasury_pool = v_pool - v_paid,
    treasury_pool_out = treasury_pool_out + v_paid,
    updated_at = now()
  where id = true;
  return v_paid;
end;
$$;

-- ---------------------------------------------------------
-- Reserve in (Shop/upgrades/crafting/site unlocks -> in). No "out" path
-- exists yet (earmarked for the future staking feature) — reserve_pool_out
-- stays 0 until that ships, and the column is already in place for it.
-- ---------------------------------------------------------
create or replace function add_to_reserve_pool(p_amount numeric)
returns numeric
language sql
security definer
as $$
  update game_state set
    reserve_pool = reserve_pool + greatest(0, p_amount),
    reserve_pool_in = reserve_pool_in + greatest(0, p_amount),
    updated_at = now()
  where id = true
  returning reserve_pool;
$$;

-- ---------------------------------------------------------
-- Offline catch-up also mints straight into Treasury (same 5% tax as a
-- live block tick) — needs the same treasury_pool_in bump.
-- ---------------------------------------------------------
create or replace function catch_up_offline_earnings(
  p_telegram_id bigint,
  p_hashrate numeric
)
returns table (credited numeric, elapsed_seconds numeric)
language plpgsql
security definer
as $$
declare
  v_player_id uuid;
  v_last_synced timestamptz;
  v_pending numeric;
  v_global_mined numeric;
  v_treasury_pool numeric;
  v_now timestamptz := now();
  v_min_away_seconds constant numeric := 30;
  v_full_rate_seconds constant numeric := 8 * 3600;
  v_decay_half_life_seconds constant numeric := 24 * 3600;
  v_safety_cap_seconds constant numeric := 90 * 24 * 3600;
  v_max_supply constant numeric := 100000000;
  v_base_emission constant numeric := 500.0 / 60;
  v_ghost_hashrate constant numeric := 2e12;
  v_treasury_tax_rate constant numeric := 0.05;
  v_raw_elapsed_seconds numeric;
  v_effective_seconds numeric;
  v_epoch int;
  v_halving_mult numeric;
  v_potential numeric;
  v_treasury_cut numeric;
  v_remaining numeric;
  v_real_active_hashrate numeric;
  v_ghost_padded numeric;
  v_share numeric;
  v_credited numeric;
  v_newly_minted numeric;
begin
  select id, last_synced_at, pending into v_player_id, v_last_synced, v_pending
    from players where telegram_id = p_telegram_id for update;

  if v_player_id is null then
    return query select 0::numeric, 0::numeric;
    return;
  end if;

  v_raw_elapsed_seconds := greatest(0, extract(epoch from (v_now - v_last_synced)));

  if v_raw_elapsed_seconds < v_min_away_seconds then
    update players set cached_hashrate = p_hashrate, last_synced_at = v_now, updated_at = v_now where id = v_player_id;
    return query select 0::numeric, v_raw_elapsed_seconds;
    return;
  end if;

  v_raw_elapsed_seconds := least(v_raw_elapsed_seconds, v_safety_cap_seconds);

  if v_raw_elapsed_seconds <= v_full_rate_seconds then
    v_effective_seconds := v_raw_elapsed_seconds;
  else
    v_effective_seconds := v_full_rate_seconds
      + (v_decay_half_life_seconds / ln(2)) * (1 - power(0.5, (v_raw_elapsed_seconds - v_full_rate_seconds) / v_decay_half_life_seconds));
  end if;

  select total_mined, treasury_pool into v_global_mined, v_treasury_pool from game_state where id = true for update;

  if v_global_mined >= v_max_supply - 1 then
    v_epoch := 64;
  else
    v_epoch := floor(-ln(1 - v_global_mined / v_max_supply) / ln(2));
  end if;
  v_halving_mult := power(0.5, v_epoch);

  v_potential := v_base_emission * v_halving_mult * v_effective_seconds;
  v_treasury_cut := v_potential * v_treasury_tax_rate;
  v_remaining := v_potential - v_treasury_cut;

  v_real_active_hashrate := active_network_hashrate(v_now);
  v_ghost_padded := v_real_active_hashrate + v_ghost_hashrate + p_hashrate;
  v_share := case when v_ghost_padded > 0 then p_hashrate / v_ghost_padded else 0 end;

  v_credited := v_remaining * v_share;
  v_newly_minted := least(v_treasury_cut + v_credited, v_max_supply - v_global_mined);
  if v_treasury_cut + v_credited > 0 then
    v_treasury_cut := v_newly_minted * (v_treasury_cut / (v_treasury_cut + v_credited));
    v_credited := v_newly_minted - v_treasury_cut;
  end if;

  update game_state set
    total_mined = v_global_mined + v_newly_minted,
    treasury_pool = v_treasury_pool + v_treasury_cut,
    treasury_pool_in = treasury_pool_in + v_treasury_cut,
    updated_at = v_now
  where id = true;

  update players set
    pending = v_pending + v_credited,
    cached_hashrate = p_hashrate,
    last_synced_at = v_now,
    updated_at = v_now
  where id = v_player_id;

  return query select v_credited, v_raw_elapsed_seconds;
end;
$$;

-- ---------------------------------------------------------
-- get_network_stats() — adds the six in/out counters plus a real
-- circulating_supply figure. Shape changed -> drop first (same reason
-- as migrations 0010/0012).
-- ---------------------------------------------------------
drop function if exists get_network_stats();

create or replace function get_network_stats()
returns table (
  max_supply numeric,
  total_mined numeric,
  circulating_supply numeric,
  carryover_pool numeric,
  carryover_pool_in numeric,
  carryover_pool_out numeric,
  treasury_pool numeric,
  treasury_pool_in numeric,
  treasury_pool_out numeric,
  reserve_pool numeric,
  reserve_pool_in numeric,
  reserve_pool_out numeric,
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
  v_carryover_in numeric;
  v_carryover_out numeric;
  v_treasury numeric;
  v_treasury_in numeric;
  v_treasury_out numeric;
  v_reserve numeric;
  v_reserve_in numeric;
  v_reserve_out numeric;
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
  select gs.total_mined, gs.carryover_pool, gs.carryover_pool_in, gs.carryover_pool_out,
         gs.treasury_pool, gs.treasury_pool_in, gs.treasury_pool_out,
         gs.reserve_pool, gs.reserve_pool_in, gs.reserve_pool_out,
         gs.last_block_at
    into v_global_mined, v_carryover, v_carryover_in, v_carryover_out,
         v_treasury, v_treasury_in, v_treasury_out,
         v_reserve, v_reserve_in, v_reserve_out,
         v_last_block_at
    from game_state gs where gs.id = true;
  if v_global_mined >= v_max_supply - 1 then
    v_epoch := 64;
  else
    v_epoch := floor(-ln(1 - v_global_mined / v_max_supply) / ln(2));
  end if;
  v_real_active := active_network_hashrate(now());
  return query select
    v_max_supply, v_global_mined, greatest(0, v_global_mined - v_treasury),
    v_carryover, v_carryover_in, v_carryover_out,
    v_treasury, v_treasury_in, v_treasury_out,
    v_reserve, v_reserve_in, v_reserve_out,
    v_treasury_tax_rate,
    v_block_time, v_initial_reward, v_halving_interval,
    v_epoch, v_initial_reward * power(0.5, v_epoch),
    v_ghost, v_real_active, v_subsidy_unlock,
    v_real_active >= v_subsidy_unlock,
    greatest(0, v_block_time - extract(epoch from (now() - v_last_block_at)));
end;
$$;

grant execute on function tick_block() to service_role, postgres;
grant execute on function add_to_treasury_pool(numeric) to service_role;
grant execute on function pay_from_treasury_pool(numeric) to service_role;
grant execute on function add_to_reserve_pool(numeric) to service_role;
grant execute on function catch_up_offline_earnings(bigint, numeric) to service_role;
grant execute on function get_network_stats() to service_role;
