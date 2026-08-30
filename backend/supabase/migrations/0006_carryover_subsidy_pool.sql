-- =========================================================
-- AETHER MINING — carryover pool + subsidy release + block log (Phase 6)
--
-- Problem this fixes: Phase 5 (0005_block_reward_tokenomics.sql) added
-- GHOST_HASHRATE so a lone small-hashrate player can't auto-claim the
-- entire fixed block reward. But whatever fraction they DIDN'T claim
-- (because their share < 100%) was just never minted at all — gone,
-- not banked anywhere. That's safe for the supply cap, but wasteful:
-- that AETHER could still be paid out fairly later once more real
-- players actually show up to mine it.
--
-- Fix — CARRYOVER POOL:
--   Every claim now splits the theoretical full block reward into:
--     base_reward    = full_reward * (p_hashrate / (real_active + GHOST))
--     carryover_delta = full_reward - base_reward   (the ghost's "share")
--   `carryover_delta` is ADDED to a running `game_state.carryover_pool`
--   instead of being discarded. Nothing is lost — it's just deferred.
--
-- SUBSIDY RELEASE:
--   Once REAL active network hashrate (excluding the ghost floor)
--   reaches SUBSIDY_UNLOCK_HASHRATE (100 TH/s — i.e. "enough real
--   players are mining that the network no longer needs the ghost
--   floor to feel populated"), the banked carryover pool starts
--   draining back out as an extra "subsidy" on top of the normal block
--   reward, split by real hashrate share (no ghost padding on this
--   part — only genuine players receive it). It drains on a half-life
--   curve (SUBSIDY_HALF_LIFE_SECONDS = 14 days) — same decaying shape
--   as the halving curve, so it never overshoots the banked amount and
--   tapers off naturally as the pool empties.
--
-- Net effect: game_state.total_mined (real circulating supply) plus
-- game_state.carryover_pool (banked-but-not-yet-minted) can never
-- exceed AETHER_MAX_SUPPLY between them — the 100M is fully accounted
-- for at all times, just split between "already in players' wallets"
-- and "reserved, waiting for the network to grow into it".
-- =========================================================

alter table game_state add column if not exists carryover_pool numeric not null default 0;

-- ---------------------------------------------------------
-- BLOCK EXPLORER LOG — one row per successful claim ("block"). Read-only
-- history for the in-game Network Stats > Block Explorer screen. Only
-- ever written by claim_mining_reward (security definer), so no RLS
-- policies are needed for inserts — same pattern as game_state.
-- ---------------------------------------------------------
create table if not exists mining_blocks (
  id bigserial primary key,
  block_time timestamptz not null default now(),
  player_id uuid references players(id) on delete set null,
  player_name text not null,
  hashrate numeric not null,
  base_reward numeric not null,
  subsidy_reward numeric not null default 0,
  total_reward numeric not null,
  halving_epoch int not null,
  global_total_mined_after numeric not null,
  carryover_pool_after numeric not null
);

create index if not exists mining_blocks_block_time_idx on mining_blocks (block_time desc);

alter table game_state enable row level security;
alter table mining_blocks enable row level security;
-- Both tables are only ever touched through SECURITY DEFINER functions
-- called from Edge Functions with the service role — same pattern as the
-- rest of this schema, so no direct client policies are added here.

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
  v_elapsed_seconds numeric;
  v_real_active_hashrate numeric;
  v_ghost_padded_hashrate numeric;
  v_share numeric;
  -- ---- BLOCK REWARD TOKENOMICS (see 0005) ----
  v_initial_block_reward constant numeric := 500;       -- AETHER/block, epoch 0, network-wide
  v_block_time_seconds constant numeric := 60;
  v_ghost_hashrate constant numeric := 20e12;            -- "network difficulty floor"
  v_base_emission constant numeric := 500.0 / 60;        -- AETHER/sec @ epoch 0
  v_max_supply constant numeric := 100000000;
  v_pending_cap_hours constant numeric := 6;
  -- ---- CARRYOVER / SUBSIDY (see header) ----
  v_subsidy_unlock_hashrate constant numeric := 100e12;  -- 100 TH/s of REAL hashrate unlocks the subsidy tap
  v_subsidy_half_life_seconds constant numeric := 14 * 24 * 3600; -- pool drains ~50% every 14 days once unlocked
  v_halving_mult numeric;
  v_emission_per_second numeric;
  v_potential numeric;       -- full block reward for this tick, before ghost dilution
  v_base_awarded numeric;    -- this player's share of v_potential
  v_carryover_delta numeric; -- the ghost's un-awarded share -> banked
  v_subsidy_awarded numeric;
  v_awarded numeric;
  v_epoch int;
begin
  select total_mined, carryover_pool into v_global_mined, v_carryover_pool from game_state where id = true for update;

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

  -- REAL active hashrate (no ghost) — used both for the ghost-padded share
  -- AND to decide whether the subsidy tap is unlocked
  v_real_active_hashrate := active_network_hashrate(v_now);
  v_ghost_padded_hashrate := v_real_active_hashrate + v_ghost_hashrate;

  v_share := p_hashrate / v_ghost_padded_hashrate;
  v_potential := v_emission_per_second * v_elapsed_seconds;
  v_base_awarded := v_potential * v_share;
  v_carryover_delta := greatest(0, v_potential - v_base_awarded);

  -- SUBSIDY: only flows once the REAL network has grown past the unlock
  -- threshold, split by REAL hashrate share (no ghost padding here — the
  -- ghost never gets a cut of the subsidy, only genuine players do)
  v_subsidy_awarded := 0;
  if v_real_active_hashrate >= v_subsidy_unlock_hashrate and v_carryover_pool > 0 and v_real_active_hashrate > 0 then
    v_subsidy_awarded := v_carryover_pool
      * (1 - power(0.5, v_elapsed_seconds / v_subsidy_half_life_seconds))
      * (p_hashrate / v_real_active_hashrate);
    v_subsidy_awarded := least(v_subsidy_awarded, v_carryover_pool);
  end if;

  v_awarded := greatest(0, v_base_awarded + v_subsidy_awarded + coalesce(v_pending, 0));
  -- belt-and-suspenders: never let minted+banked exceed the fixed supply cap
  v_awarded := least(v_awarded, v_max_supply - v_global_mined);

  update game_state set
    total_mined = v_global_mined + v_base_awarded + v_subsidy_awarded,
    carryover_pool = greatest(0, v_carryover_pool + v_carryover_delta - v_subsidy_awarded),
    updated_at = v_now
  where id = true;

  update players set
    core = v_core + v_awarded,
    total_earned = v_total_earned + v_awarded,
    total_mined = v_player_total_mined + v_awarded,
    pending = 0,
    updated_at = v_now
  where id = v_player_id;

  if v_base_awarded + v_subsidy_awarded > 0 then
    insert into mining_blocks (player_id, player_name, hashrate, base_reward, subsidy_reward, total_reward, halving_epoch, global_total_mined_after, carryover_pool_after)
    values (v_player_id, v_player_name, p_hashrate, v_base_awarded, v_subsidy_awarded, v_base_awarded + v_subsidy_awarded, v_epoch,
            v_global_mined + v_base_awarded + v_subsidy_awarded, greatest(0, v_carryover_pool + v_carryover_delta - v_subsidy_awarded));
  end if;

  return query select v_awarded, v_core + v_awarded, v_total_earned + v_awarded, v_player_total_mined + v_awarded, v_global_mined + v_base_awarded + v_subsidy_awarded;
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
  v_ghost_hashrate constant numeric := 20e12;
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

-- ---------------------------------------------------------
-- NETWORK STATS — one aggregated snapshot for the Network Stats screen
-- (Tokenomics tab). Read-only, stable, no locking.
-- ---------------------------------------------------------
create or replace function get_network_stats()
returns table (
  max_supply numeric,
  total_mined numeric,
  carryover_pool numeric,
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
  v_max_supply constant numeric := 100000000;
  v_initial_reward constant numeric := 500;
  v_block_time constant numeric := 60;
  v_halving_interval constant numeric := 100000;
  v_ghost constant numeric := 20e12;
  v_subsidy_unlock constant numeric := 100e12;
  v_epoch int;
  v_real_active numeric;
begin
  select total_mined, carryover_pool into v_global_mined, v_carryover from game_state where id = true;
  if v_global_mined >= v_max_supply - 1 then
    v_epoch := 64;
  else
    v_epoch := floor(-ln(1 - v_global_mined / v_max_supply) / ln(2));
  end if;
  v_real_active := active_network_hashrate(now());
  return query select
    v_max_supply, v_global_mined, v_carryover,
    v_block_time, v_initial_reward, v_halving_interval,
    v_epoch, v_initial_reward * power(0.5, v_epoch),
    v_ghost, v_real_active, v_subsidy_unlock,
    v_real_active >= v_subsidy_unlock;
end;
$$;

grant execute on function claim_mining_reward(bigint, numeric) to service_role;
grant execute on function preview_emission_share(numeric) to service_role;
grant execute on function get_network_stats() to service_role;
