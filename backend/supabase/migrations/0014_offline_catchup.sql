-- =========================================================
-- AETHER MINING — real offline catch-up, persisted server-side (Phase 14)
--
-- Two overlapping bugs caused "claim pending AETHER doesn't land in
-- balance after being offline a while":
--
--   1. tick_block() (Phase 12) only distributes each block's reward to
--      players whose last_synced_at is within the last 30 seconds — a
--      player who closed the app is, correctly, not part of any block
--      while they're away. But nothing ever credited them for that gap
--      when they came back, so long-offline players earned nothing at
--      all for the entire time they were gone.
--
--   2. sync-player's "init" action still had leftover logic from BEFORE
--      the block-tick rewrite: it computed a "myEmissionPerSecond *
--      elapsed" estimate and put it on the in-memory `player.pending`
--      value in the JSON response — but never wrote it to the
--      database. So the Claim button displayed a plausible-looking
--      pending amount, but the real `players.pending` column in
--      Postgres was still whatever it actually was (often 0), and
--      claim_mining_reward (now just "cash out real pending") paid out
--      that real, much smaller number — the UI's number and the
--      database's number had quietly diverged.
--
-- Fix: a dedicated, row-locked function that actually credits pending
-- in the database for the time a player was away, run once whenever
-- they reconnect (on "init"). It approximates their fair share using
-- the network's current epoch/active-hashrate as a stand-in for what
-- was happening while they were gone (a perfect historical replay isn't
-- possible without a way heavier per-second block-by-block simulation),
-- capped at the same 6-hour horizon the rest of the game already uses,
-- and applies the same 5% Treasury tax as every real block tick so the
-- economy accounting stays consistent.
-- =========================================================

create or replace function catch_up_offline_earnings(
  p_telegram_id bigint,
  p_hashrate numeric
)
returns table (credited numeric, elapsed_seconds numeric) -- credited pending (0 if none) + how long they were away (capped)
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
  v_offline_cap_seconds constant numeric := 6 * 3600;
  v_max_supply constant numeric := 100000000;
  v_base_emission constant numeric := 500.0 / 60;
  v_ghost_hashrate constant numeric := 2e12;
  v_treasury_tax_rate constant numeric := 0.05;
  v_elapsed_seconds numeric;
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

  v_elapsed_seconds := greatest(0, extract(epoch from (v_now - v_last_synced)));

  if v_elapsed_seconds < v_min_away_seconds then
    update players set cached_hashrate = p_hashrate, last_synced_at = v_now, updated_at = v_now where id = v_player_id;
    return query select 0::numeric, v_elapsed_seconds;
    return;
  end if;

  v_elapsed_seconds := least(v_elapsed_seconds, v_offline_cap_seconds);

  select total_mined, treasury_pool into v_global_mined, v_treasury_pool from game_state where id = true for update;

  if v_global_mined >= v_max_supply - 1 then
    v_epoch := 64;
  else
    v_epoch := floor(-ln(1 - v_global_mined / v_max_supply) / ln(2));
  end if;
  v_halving_mult := power(0.5, v_epoch);

  v_potential := v_base_emission * v_halving_mult * v_elapsed_seconds;
  v_treasury_cut := v_potential * v_treasury_tax_rate;
  v_remaining := v_potential - v_treasury_cut;

  -- this player wasn't part of active_network_hashrate() while away (its
  -- 30s window excludes them), so add their own hashrate back in to
  -- estimate the share they'd have earned had they been online
  v_real_active_hashrate := active_network_hashrate(v_now);
  v_ghost_padded := v_real_active_hashrate + v_ghost_hashrate + p_hashrate;
  v_share := case when v_ghost_padded > 0 then p_hashrate / v_ghost_padded else 0 end;

  v_credited := v_remaining * v_share;
  v_newly_minted := least(v_treasury_cut + v_credited, v_max_supply - v_global_mined);
  -- keep the treasury/credited split proportional if we hit the supply cap
  if v_treasury_cut + v_credited > 0 then
    v_treasury_cut := v_newly_minted * (v_treasury_cut / (v_treasury_cut + v_credited));
    v_credited := v_newly_minted - v_treasury_cut;
  end if;

  update game_state set
    total_mined = v_global_mined + v_newly_minted,
    treasury_pool = v_treasury_pool + v_treasury_cut,
    updated_at = v_now
  where id = true;

  update players set
    pending = v_pending + v_credited,
    cached_hashrate = p_hashrate,
    last_synced_at = v_now,
    updated_at = v_now
  where id = v_player_id;

  return query select v_credited, v_elapsed_seconds;
end;
$$;

grant execute on function catch_up_offline_earnings(bigint, numeric) to service_role;
