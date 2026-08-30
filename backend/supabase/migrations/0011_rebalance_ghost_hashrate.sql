-- =========================================================
-- AETHER MINING — rebalance GHOST_HASHRATE (Phase 11, bugfix)
--
-- Problem: GHOST_HASHRATE was set to 20 TH/s assuming that was roughly a
-- "mid-game rig". In practice a brand-new player starts around 0.04–0.26
-- TH/s (40 MH/s starter GPU, or a couple hundred MH/s during an early
-- boost) — five to six orders of magnitude smaller than 20 TH/s. Their
-- share = p_hashrate / (real_active + 20e12) came out to roughly
-- 0.001–0.01%, so `claim_mining_reward` was paying out amounts so tiny
-- they rounded to "0.00 AETHER" every single claim — mining looked
-- completely dead even though it was technically still running.
--
-- Fix: drop GHOST_HASHRATE from 20 TH/s to 2 TH/s (and
-- SUBSIDY_UNLOCK_HASHRATE from 100 TH/s to 10 TH/s, keeping the same 5x
-- ratio between them). A starter-GPU player now gets a small but real,
-- visible share (~2%) instead of an effectively-zero one; an
-- established player already up around 20-30 TH/s barely notices the
-- change since they were already dominating the ghost floor either way.
-- =========================================================

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
  v_block_time_seconds constant numeric := 60;
  v_ghost_hashrate constant numeric := 2e12;             -- was 20e12 — see header
  v_base_emission constant numeric := 500.0 / 60;
  v_max_supply constant numeric := 100000000;
  v_pending_cap_hours constant numeric := 6;
  v_subsidy_unlock_hashrate constant numeric := 10e12;   -- was 100e12 — keeps the 5x ratio to ghost hashrate
  v_subsidy_half_life_seconds constant numeric := 14 * 24 * 3600;
  v_treasury_tax_rate constant numeric := 0.05;
  v_halving_mult numeric;
  v_emission_per_second numeric;
  v_potential numeric;
  v_base_awarded numeric;
  v_carryover_delta numeric;
  v_subsidy_awarded numeric;
  v_gross_reward numeric;
  v_treasury_cut numeric;
  v_net_reward numeric;
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

create or replace function preview_emission_share(p_hashrate numeric)
returns table (emission_per_second numeric, my_share numeric, active_hashrate numeric)
language plpgsql
stable
as $$
declare
  v_global_mined numeric;
  v_max_supply constant numeric := 100000000;
  v_base_emission constant numeric := 500.0 / 60;
  v_ghost_hashrate constant numeric := 2e12; -- was 20e12 — see 0011 header
  v_halving_mult numeric;
  v_active numeric;
begin
  select total_mined into v_global_mined from game_state where id = true;
  if v_global_mined >= v_max_supply - 1 then
    v_halving_mult := power(0.5, 64);
  else
    v_halving_mult := power(0.5, floor(-ln(1 - v_global_mined / v_max_supply) / ln(2)));
  end if;
  v_active := active_network_hashrate(now()) + v_ghost_hashrate;
  return query select
    v_base_emission * v_halving_mult,
    case when v_active <= 0 then 0 else p_hashrate / v_active end,
    v_active;
end;
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
  v_ghost constant numeric := 2e12;              -- was 20e12 — see header
  v_subsidy_unlock constant numeric := 10e12;    -- was 100e12 — see header
  v_treasury_tax_rate constant numeric := 0.05;
  v_epoch int;
  v_real_active numeric;
begin
  select gs.total_mined, gs.carryover_pool, gs.treasury_pool, gs.reserve_pool
    into v_global_mined, v_carryover, v_treasury, v_reserve
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
    v_real_active >= v_subsidy_unlock;
end;
$$;

grant execute on function claim_mining_reward(bigint, numeric) to service_role;
grant execute on function preview_emission_share(numeric) to service_role;
grant execute on function get_network_stats() to service_role;
