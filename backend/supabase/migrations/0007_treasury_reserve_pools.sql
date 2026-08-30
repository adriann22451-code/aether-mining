-- =========================================================
-- AETHER MINING — Treasury pool + Reserve pool (Phase 7)
--
-- Problem this fixes: every in-game reward that ISN'T mining (missions,
-- events, daily streak, guild payouts, loot boxes, the old inbox
-- "welcome bonus") was just `core += amount` conjured out of nowhere —
-- no accounted-for source, no way to reconcile it against the 100M
-- max supply. Symmetrically, every AETHER a player SPENT (Shop, part
-- upgrades, crafting, site unlocks) simply vanished — burned with no
-- record either.
--
-- This migration creates two new pools on `game_state` so every AETHER
-- that exists is always traceable to either a player's wallet or one of
-- four pools (carryover, treasury, reserve) — never just "from nowhere"
-- or "into nowhere":
--
--   TREASURY POOL — funded by a 5% tax on every block reward actually
--   paid out to a miner (base + subsidy, AFTER the ghost-hashrate/
--   carryover split from Phase 5/6, BEFORE it lands in the player's
--   wallet). This is the account that future missions/events/daily
--   streak/guild/loot-box rewards should draw down from, instead of
--   being minted from nothing — wiring each of those systems to
--   actually spend from this pool is a follow-up piece of work, this
--   migration just makes sure the pool itself is real, funded, and
--   trackable from block one.
--
--   RESERVE POOL — funded by every AETHER a player spends on Shop
--   purchases, part upgrades (single + bulk), crafting, and Mining
--   Site unlocks. Earmarked for the future AETHER staking-reward
--   feature — money players sink back into their rigs gets banked here
--   instead of disappearing, so staking payouts later have a real,
--   accounted-for source too.
--
-- Both pools are funded OUT OF already-minted supply (the treasury cut
-- comes out of what would've gone to the miner; the reserve pool is
-- money that already left a player's wallet) — neither one mints new
-- AETHER beyond the existing 100M cap. total_mined still only ever
-- grows by the same gross amount as before; the treasury tax just
-- redirects part of that mint from the miner's wallet to the treasury
-- account instead.
-- =========================================================

alter table game_state add column if not exists treasury_pool numeric not null default 0;
alter table game_state add column if not exists reserve_pool numeric not null default 0;

alter table mining_blocks add column if not exists treasury_cut numeric not null default 0;

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
  v_now timestamptz := now();
  v_player_id uuid;
  v_player_name text;
  v_last_synced timestamptz;
  v_core numeric;
  v_total_earned numeric;
  v_player_total_mined numeric;
  v_pending numeric;
  v_global_mined numeric;
  v_carryover_pool numeric;
  v_treasury_pool numeric;
  v_elapsed_seconds numeric;
  v_real_active_hashrate numeric;
  v_ghost_padded_hashrate numeric;
  v_share numeric;
  -- ---- BLOCK REWARD TOKENOMICS (see 0005) ----
  v_block_time_seconds constant numeric := 60;
  v_ghost_hashrate constant numeric := 20e12;
  v_base_emission constant numeric := 500.0 / 60;
  v_max_supply constant numeric := 100000000;
  v_pending_cap_hours constant numeric := 6;
  -- ---- CARRYOVER / SUBSIDY (see 0006) ----
  v_subsidy_unlock_hashrate constant numeric := 100e12;
  v_subsidy_half_life_seconds constant numeric := 14 * 24 * 3600;
  -- ---- TREASURY (see header) ----
  v_treasury_tax_rate constant numeric := 0.05; -- 5% of every paid-out block reward
  v_halving_mult numeric;
  v_emission_per_second numeric;
  v_potential numeric;
  v_base_awarded numeric;
  v_carryover_delta numeric;
  v_subsidy_awarded numeric;
  v_gross_reward numeric;   -- base + subsidy, before the treasury tax
  v_treasury_cut numeric;
  v_net_reward numeric;     -- what actually lands in the player's wallet
  v_awarded numeric;
  v_epoch int;
begin
  select total_mined, carryover_pool, treasury_pool into v_global_mined, v_carryover_pool, v_treasury_pool from game_state where id = true for update;

  select id, username, core, total_earned, total_mined, pending, last_synced_at
    into v_player_id, v_player_name, v_core, v_total_earned, v_player_total_mined, v_pending, v_last_synced
    from players where telegram_id = p_telegram_id for update;

  if v_player_id is null then
    raise exception 'player not found for telegram_id %', p_telegram_id;
  end if;

  v_elapsed_seconds := greatest(0, extract(epoch from (v_now - v_last_synced)));
  v_elapsed_seconds := least(v_elapsed_seconds, v_pending_cap_hours * 3600);

  update players set cached_hashrate = p_hashrate, last_synced_at = v_now where id = v_player_id;

  if v_global_mined >= v_max_supply - 1 then
    v_epoch := 64;
  else
    v_epoch := floor(-ln(1 - v_global_mined / v_max_supply) / ln(2));
  end if;
  v_halving_mult := power(0.5, v_epoch);
  v_emission_per_second := v_base_emission * v_halving_mult;

  v_real_active_hashrate := active_network_hashrate(v_now);
  v_ghost_padded_hashrate := v_real_active_hashrate + v_ghost_hashrate;

  v_share := p_hashrate / v_ghost_padded_hashrate;
  v_potential := v_emission_per_second * v_elapsed_seconds;
  v_base_awarded := v_potential * v_share;
  v_carryover_delta := greatest(0, v_potential - v_base_awarded);

  v_subsidy_awarded := 0;
  if v_real_active_hashrate >= v_subsidy_unlock_hashrate and v_carryover_pool > 0 and v_real_active_hashrate > 0 then
    v_subsidy_awarded := v_carryover_pool
      * (1 - power(0.5, v_elapsed_seconds / v_subsidy_half_life_seconds))
      * (p_hashrate / v_real_active_hashrate);
    v_subsidy_awarded := least(v_subsidy_awarded, v_carryover_pool);
  end if;

  -- ---- TREASURY TAX: 5% of the gross block reward, taken before it
  -- reaches the player's wallet, banked for future in-game rewards ----
  v_gross_reward := v_base_awarded + v_subsidy_awarded;
  v_treasury_cut := v_gross_reward * v_treasury_tax_rate;
  v_net_reward := v_gross_reward - v_treasury_cut;

  v_awarded := greatest(0, v_net_reward + coalesce(v_pending, 0));
  v_awarded := least(v_awarded, v_max_supply - v_global_mined);

  update game_state set
    total_mined = v_global_mined + v_gross_reward,
    carryover_pool = greatest(0, v_carryover_pool + v_carryover_delta - v_subsidy_awarded),
    treasury_pool = v_treasury_pool + v_treasury_cut,
    updated_at = v_now
  where id = true;

  update players set
    core = v_core + v_awarded,
    total_earned = v_total_earned + v_awarded,
    total_mined = v_player_total_mined + v_awarded,
    pending = 0,
    updated_at = v_now
  where id = v_player_id;

  if v_gross_reward > 0 then
    insert into mining_blocks (player_id, player_name, hashrate, base_reward, subsidy_reward, treasury_cut, total_reward, halving_epoch, global_total_mined_after, carryover_pool_after)
    values (v_player_id, v_player_name, p_hashrate, v_base_awarded, v_subsidy_awarded, v_treasury_cut, v_net_reward, v_epoch,
            v_global_mined + v_gross_reward, greatest(0, v_carryover_pool + v_carryover_delta - v_subsidy_awarded));
  end if;

  return query select v_awarded, v_core + v_awarded, v_total_earned + v_awarded, v_player_total_mined + v_awarded, v_global_mined + v_gross_reward;
end;
$$;

-- ---------------------------------------------------------
-- RESERVE POOL — every AETHER a player spends on Shop/upgrades/crafting/
-- site unlocks gets banked here (called from game-actions after each
-- successful spend). Simple atomic increment, no player-row locking
-- needed since it only touches the single game_state row.
-- ---------------------------------------------------------
create or replace function add_to_reserve_pool(p_amount numeric)
returns numeric
language sql
security definer
as $$
  update game_state set reserve_pool = reserve_pool + greatest(0, p_amount), updated_at = now() where id = true
  returning reserve_pool;
$$;

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
  subsidy_active boolean
)
language plpgsql
stable
as $$
declare
  v_global_mined numeric;
  v_carryover numeric;
  v_treasury numeric;
  v_reserve numeric;
  v_max_supply constant numeric := 100000000;
  v_initial_reward constant numeric := 500;
  v_block_time constant numeric := 60;
  v_halving_interval constant numeric := 100000;
  v_ghost constant numeric := 20e12;
  v_subsidy_unlock constant numeric := 100e12;
  v_treasury_tax_rate constant numeric := 0.05;
  v_epoch int;
  v_real_active numeric;
begin
  select total_mined, carryover_pool, treasury_pool, reserve_pool
    into v_global_mined, v_carryover, v_treasury, v_reserve
    from game_state where id = true;
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
    v_real_active >= v_subsidy_unlock;
end;
$$;

grant execute on function claim_mining_reward(bigint, numeric) to service_role;
grant execute on function add_to_reserve_pool(numeric) to service_role;
grant execute on function get_network_stats() to service_role;
