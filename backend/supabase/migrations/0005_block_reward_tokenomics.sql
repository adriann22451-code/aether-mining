-- =========================================================
-- AETHER MINING — Bitcoin-style block reward tokenomics + "ghost
-- hashrate" difficulty floor (Phase 5)
--
-- Phase 4 (0004_global_supply.sql) made AETHER_MAX_SUPPLY a real shared
-- pool and split the emission by each player's share of ACTIVE network
-- hashrate. Two things were still fuzzy:
--
--   1. The emission was only ever described as "0.15 AETHER/sec at
--      epoch 0" — no block time, no block reward, no halving interval.
--      This migration reframes the exact same math in Bitcoin terms so
--      it's actually legible:
--
--        MAX_SUPPLY        = 100,000,000 AETHER            (unchanged)
--        BLOCK_TIME         = 60 seconds  (1 "block" / minute)
--        INITIAL_BLOCK_REWARD = 500 AETHER / block  (epoch 0, network-wide)
--        HALVING_INTERVAL    = 100,000 blocks (~69.4 days / ~2.3 months
--                               of continuous mining at the reference
--                               pace defined below)
--
--      500 AETHER/block / 60s = 8.3333.. AETHER/sec at epoch 0 — this
--      REPLACES the old flat 0.15 AETHER/sec constant. Reward halves
--      500 -> 250 -> 125 -> 62.5 -> ... every HALVING_INTERVAL blocks,
--      same shape as Bitcoin's 50 -> 25 -> 12.5 BTC every 210,000 blocks.
--      Like Bitcoin, sum of every era = INITIAL_BLOCK_REWARD *
--      HALVING_INTERVAL * 2 = 100,000,000 = MAX_SUPPLY exactly, asymptotic
--      and never overshot.
--
--      We don't track a literal block counter (there's no chain here) —
--      exactly like Phase 4, the halving epoch is still derived from what
--      fraction of MAX_SUPPLY has actually been mined network-wide
--      (miningHalvingEpoch). That is mathematically the SAME curve as a
--      fixed-block-count halving would produce IF the network mined at
--      exactly the reference pace below — but it self-corrects (halvings
--      simply take longer) if real participation is lower, and can never
--      mint faster than the pool allows. So "100,000 blocks per halving"
--      is the EXPECTED pace at the reference hashrate, not a hard block
--      height.
--
--   2. A single active player always got p_hashrate / active_hashrate =
--      p_hashrate / p_hashrate = 100% share, REGARDLESS of how small
--      their hashrate was. A player with just a starter GTX 1660 (40
--      MH/s) mining alone claimed the exact same 8.3333 AETHER/sec as a
--      maxed-out endgame rig would, just because nobody else happened to
--      be online. That's the "reward gets drained by 1 player" problem.
--
--      Fix: add a constant GHOST_HASHRATE ("network difficulty floor") to
--      the denominator of every share calculation, always — whether
--      you're alone or not:
--
--        share = p_hashrate / (active_network_hashrate + GHOST_HASHRATE)
--
--      GHOST_HASHRATE = 20 TH/s (20e12), roughly a mid-game player's rig.
--      A lone tiny-hashrate player now only claims a small slice of the
--      fixed block reward — the REST is simply never minted that block
--      (exactly like Bitcoin: nobody mines faster just because fewer
--      miners are competing for the same fixed reward). As a player
--      upgrades toward ~20 TH/s their share climbs toward 100%; multiple
--      real players mining together can still push total active hashrate
--      (and thus everyone's absolute AETHER/sec) up, same as Phase 4.
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
  v_last_synced timestamptz;
  v_core numeric;
  v_total_earned numeric;
  v_player_total_mined numeric;
  v_pending numeric;
  v_global_mined numeric;
  v_elapsed_seconds numeric;
  v_active_hashrate numeric;
  v_share numeric;
  -- ---- BLOCK REWARD TOKENOMICS (see header) ----
  v_block_time_seconds constant numeric := 60;         -- 1 block = 1 minute
  v_initial_block_reward constant numeric := 500;       -- AETHER / block, epoch 0, network-wide
  v_halving_interval_blocks constant numeric := 100000; -- expected blocks per halving @ reference hashrate
  v_ghost_hashrate constant numeric := 20e12;           -- "network difficulty floor" — see header
  v_base_emission constant numeric := 500.0 / 60;       -- = 8.3333.. AETHER/sec @ epoch 0 (500 AETHER/block / 60s)
  v_max_supply constant numeric := 100000000;
  v_pending_cap_hours constant numeric := 6;
  v_halving_mult numeric;
  v_emission_per_second numeric;
  v_awarded numeric;
begin
  -- lock the global row first, then this player's row — always in this
  -- order everywhere in this function, so two concurrent claims can
  -- never deadlock against each other
  select total_mined into v_global_mined from game_state where id = true for update;

  select id, core, total_earned, total_mined, pending, last_synced_at
    into v_player_id, v_core, v_total_earned, v_player_total_mined, v_pending, v_last_synced
    from players where telegram_id = p_telegram_id for update;

  if v_player_id is null then
    raise exception 'player not found for telegram_id %', p_telegram_id;
  end if;

  v_elapsed_seconds := greatest(0, extract(epoch from (v_now - v_last_synced)));
  v_elapsed_seconds := least(v_elapsed_seconds, v_pending_cap_hours * 3600);

  -- write this player's fresh hashrate + sync time FIRST, so the
  -- active-network sum below (which reads cached_hashrate straight from
  -- the players table) already reflects it
  update players set cached_hashrate = p_hashrate, last_synced_at = v_now where id = v_player_id;

  -- halving keys off the GLOBAL total mined — see header for why this is
  -- equivalent to a fixed block-count halving at the reference pace
  if v_global_mined >= v_max_supply - 1 then
    v_halving_mult := power(0.5, 64);
  else
    v_halving_mult := power(0.5, floor(-ln(1 - v_global_mined / v_max_supply) / ln(2)));
  end if;
  v_emission_per_second := v_base_emission * v_halving_mult;

  -- GHOST HASHRATE FLOOR: always padded into the denominator, so a lone
  -- (or collectively small) active network never auto-claims 100% of the
  -- fixed block reward just by being the only one present
  v_active_hashrate := active_network_hashrate(v_now) + v_ghost_hashrate;
  v_share := p_hashrate / v_active_hashrate;

  v_awarded := greatest(0, v_emission_per_second * v_share * v_elapsed_seconds + coalesce(v_pending, 0));
  -- never let the network mint past the fixed supply cap
  v_awarded := least(v_awarded, v_max_supply - v_global_mined);

  update game_state set total_mined = v_global_mined + v_awarded, updated_at = v_now where id = true;

  update players set
    core = v_core + v_awarded,
    total_earned = v_total_earned + v_awarded,
    total_mined = v_player_total_mined + v_awarded,
    pending = 0,
    updated_at = v_now
  where id = v_player_id;

  return query select v_awarded, v_core + v_awarded, v_total_earned + v_awarded, v_player_total_mined + v_awarded, v_global_mined + v_awarded;
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
  v_base_emission constant numeric := 500.0 / 60; -- keep in sync with claim_mining_reward above
  v_ghost_hashrate constant numeric := 20e12;      -- keep in sync with claim_mining_reward above
  v_halving_mult numeric;
  v_active numeric;
begin
  select total_mined into v_global_mined from game_state where id = true;
  if v_global_mined >= v_max_supply - 1 then
    v_halving_mult := power(0.5, 64);
  else
    v_halving_mult := power(0.5, floor(-ln(1 - v_global_mined / v_max_supply) / ln(2)));
  end if;
  -- ghost hashrate always padded in, same as the real claim function, so
  -- the live preview matches what an actual claim would pay out
  v_active := active_network_hashrate(now()) + v_ghost_hashrate;
  return query select
    v_base_emission * v_halving_mult,
    case when v_active <= 0 then 0 else p_hashrate / v_active end,
    v_active;
end;
$$;

grant execute on function claim_mining_reward(bigint, numeric) to service_role;
grant execute on function preview_emission_share(numeric) to service_role;
