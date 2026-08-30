-- =========================================================
-- AETHER MINING — offline catch-up: diminishing returns instead of a
-- hard 6-hour cutoff (Phase 15)
--
-- This game has no energy system gating how long mining can run — the
-- rig just mines continuously for as long as it exists, online or off.
-- A hard cap (the old 6 hours, inherited from the pre-block-tick pending
-- cap) doesn't fit that: a player who's away for a full day or two
-- shouldn't just lose everything past hour 6.
--
-- Fix: no more hard cutoff. Instead:
--   - The first FULL_RATE_HOURS (8h) of absence are credited at the
--     full, normal rate — covers a full night's sleep or a work day
--     with zero discount.
--   - Beyond that, credited time keeps growing but on a decay curve
--     with a DECAY_HALF_LIFE_HOURS (24h) half-life, asymptotically
--     approaching a ceiling of about 8h + 24h/ln(2) ≈ 42.6 effective
--     hours no matter how long the real gap is. A 1-2 day absence still
--     gets nearly all of it (2 days = 48h raw → ~37.7h effective,
--     ~88% of the max); a month-long absence converges to roughly that
--     same ~42.6h ceiling instead of paying out 30x more.
-- =========================================================

create or replace function catch_up_offline_earnings(
  p_telegram_id bigint,
  p_hashrate numeric
)
returns table (credited numeric, elapsed_seconds numeric) -- credited pending (0 if none) + REAL (undiscounted) time away, for display
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
  v_full_rate_seconds constant numeric := 8 * 3600;       -- first 8h: no discount at all
  v_decay_half_life_seconds constant numeric := 24 * 3600; -- beyond that: halves every 24h
  v_safety_cap_seconds constant numeric := 90 * 24 * 3600; -- sanity bound only (e.g. a dormant test account) — the decay curve already makes this practically irrelevant
  v_max_supply constant numeric := 100000000;
  v_base_emission constant numeric := 500.0 / 60;
  v_ghost_hashrate constant numeric := 2e12;
  v_treasury_tax_rate constant numeric := 0.05;
  v_raw_elapsed_seconds numeric;   -- real wall-clock time away, capped only by the sanity bound — this is what gets shown to the player
  v_effective_seconds numeric;     -- after diminishing returns — this is what actually gets paid
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

  -- diminishing-returns curve: full credit up to 8h, then an
  -- exponentially-decaying trickle beyond that (see header)
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

  -- this player wasn't part of active_network_hashrate() while away (its
  -- 30s window excludes them), so add their own hashrate back in to
  -- estimate the share they'd have earned had they been online
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

grant execute on function catch_up_offline_earnings(bigint, numeric) to service_role;
