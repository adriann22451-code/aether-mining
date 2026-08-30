-- =========================================================
-- AETHER MINING — Treasury taxes the FULL block reward + block numbers
-- (Phase 13, bugfix)
--
-- Problem: tick_block() (Phase 12) took the 5% Treasury cut AFTER the
-- ghost-hashrate split — i.e. 5% of whatever tiny sliver of the 500
-- AETHER block reward actually reached active miners, not 5% of the
-- block reward itself. With a lone small-hashrate miner, the ghost floor
-- swallows ~99.99% of the block into carryover_pool, so Treasury's 5%
-- of the remaining scraps rounded to nothing — Treasury basically never
-- grew, regardless of how many blocks minted.
--
-- Fix — tax the block FIRST, split what's left SECOND:
--   1. block_reward = 500 AETHER (epoch 0, halving as before) — full,
--      fixed, unconditional every single tick.
--   2. treasury_cut = 5% of block_reward, ALWAYS — e.g. exactly 25
--      AETHER every block at epoch 0, no matter how many players are
--      active or what anyone claims. This is what actually makes
--      Treasury a predictable, minute-by-minute funding source.
--   3. The remaining 95% (e.g. 475 AETHER) is what gets split by the
--      ghost-hashrate floor between active miners (-> their `pending`)
--      and carryover_pool (the ghost's uncaptured share) — same concept
--      as before, just applied to the post-tax remainder instead of the
--      full block.
--   4. Subsidy released from carryover_pool is NOT taxed again — it was
--      already taxed at step 2 back when it was originally banked.
--
-- Also: mining_blocks now has a real block number (its own `id`, already
-- a bigserial — just exposed to the client) and a `block_reward` column
-- so the explorer can show "Block #14 — 500 AETHER minted" instead of
-- just the tiny distributed-to-miners sliver.
-- =========================================================

alter table mining_blocks add column if not exists block_reward numeric not null default 0;

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
  v_newly_minted numeric; -- treasury_cut + captured_by_miners — the only genuinely NEW mint this tick (subsidy just moves already-minted carryover into circulation)
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

  -- TREASURY TAX: 5% of the FULL block reward, unconditionally, before
  -- anything else is split — this is the fix
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
    last_block_at = v_now,
    updated_at = v_now
  where id = true;

  insert into mining_blocks (block_time, block_reward, total_reward, subsidy_reward, treasury_cut, active_miners, active_hashrate, halving_epoch, global_total_mined_after, carryover_pool_after)
  values (v_now, v_block_reward, v_net_distributable, v_subsidy_release, v_treasury_cut, v_num_active, v_real_active_hashrate, v_epoch,
          v_global_mined + v_newly_minted, greatest(0, v_carryover_pool + v_carryover_delta - v_subsidy_release));
end;
$$;

grant execute on function tick_block() to service_role, postgres;
