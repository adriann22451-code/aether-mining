-- =========================================================
-- AETHER MINING — fix "column reference total_mined is ambiguous" in
-- get_network_stats() (Phase 10, bugfix)
--
-- get_network_stats() RETURNS TABLE declares an OUT parameter literally
-- named `total_mined` (same for carryover_pool/treasury_pool/reserve_pool)
-- — inside plpgsql that OUT parameter is also an in-scope variable with
-- that exact name, so `select total_mined from game_state` couldn't tell
-- whether it meant the table column or the OUT variable and threw
-- "column reference is ambiguous". This is why Network Stats / Block
-- Explorer was failing. Fix: qualify every column with the table alias.
-- =========================================================

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

grant execute on function get_network_stats() to service_role;
