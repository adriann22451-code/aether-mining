-- =========================================================
-- AETHER MINING — shared global supply / difficulty pool (Phase 4)
--
-- Problem this fixes: `total_mined` (and the halving curve derived from
-- it) used to live per-player — every player effectively got their own
-- private 100,000,000 AETHER supply, so mining speed scaled with ONLY
-- that player's own hashrate and never slowed down no matter how many
-- (or how few) other people were playing.
--
-- This migration makes AETHER_MAX_SUPPLY a genuinely SHARED pool: one
-- singleton `game_state` row tracks how much of the 100M has ever been
-- mined, network-wide. Claiming now pays out a FIXED emission rate
-- (subject to the same halving curve, now driven by the GLOBAL total)
-- split proportionally by each player's share of currently-ACTIVE
-- hashrate — the same idea as Bitcoin difficulty: more active hashrate
-- competing for the same fixed emission means everyone's individual
-- share (and thus their AETHER/sec) goes down, and a single active
-- player can no longer out-earn the pool just by stacking rig upgrades,
-- since alone they already hold ~100% of the (tiny) active pool.
-- =========================================================

-- ---------------------------------------------------------
-- SINGLETON GLOBAL STATE — enforced to exactly one row via the
-- `id boolean primary key default true check (id)` trick: `id` can only
-- ever be the value `true`, and it's the primary key, so a second
-- insert is impossible.
-- ---------------------------------------------------------
create table if not exists game_state (
  id boolean primary key default true check (id),
  total_mined numeric not null default 0,
  updated_at timestamptz not null default now()
);

insert into game_state (id, total_mined) values (true, 0)
on conflict (id) do nothing;

-- ---------------------------------------------------------
-- "Active" window for the difficulty split — a player counts toward
-- the shared active-hashrate pool only if they've synced (claimed OR
-- sent a lightweight heartbeat) in the last 30 seconds. Stale/offline
-- players drop out automatically, so a lone active player always gets
-- the full emission rate to themselves — same as real mining difficulty
-- easing when hashrate leaves the network.
-- ---------------------------------------------------------
create or replace function active_network_hashrate(p_now timestamptz)
returns numeric
language sql
stable
as $$
  select coalesce(sum(cached_hashrate), 0)
  from players
  where last_synced_at > p_now - interval '30 seconds';
$$;

-- ---------------------------------------------------------
-- ATOMIC CLAIM — does the whole read-modify-write (global emission +
-- this player's share + the halving curve + writing both rows back)
-- inside one row-locked transaction, so two players (or two rapid
-- taps) claiming at the same instant can never double-count each
-- other's share or overshoot AETHER_MAX_SUPPLY.
-- ---------------------------------------------------------
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
  v_base_emission constant numeric := 0.15;    -- AETHER/sec the WHOLE network can emit at epoch 0 (tuned to feel like the old solo pace)
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
  -- the players table) already reflects it — otherwise a player who just
  -- upgraded their rig right before claiming would be undercounted in
  -- their own denominator
  update players set cached_hashrate = p_hashrate, last_synced_at = v_now where id = v_player_id;

  -- halving now keys off the GLOBAL total, not this player's own
  if v_global_mined >= v_max_supply - 1 then
    v_halving_mult := power(0.5, 64);
  else
    v_halving_mult := power(0.5, floor(-ln(1 - v_global_mined / v_max_supply) / ln(2)));
  end if;
  v_emission_per_second := v_base_emission * v_halving_mult;

  v_active_hashrate := active_network_hashrate(v_now);
  if v_active_hashrate <= 0 then
    v_share := 0;
  else
    v_share := p_hashrate / v_active_hashrate;
  end if;

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

-- ---------------------------------------------------------
-- LIVE PREVIEW — read-only estimate of the current global emission
-- rate and this player's share of it, used by `init`/`heartbeat` to
-- show a live-ish "pending" number between real claims. Not locked
-- (just a snapshot), since it never writes anything — the actual
-- award is always recomputed authoritatively inside claim_mining_reward.
-- ---------------------------------------------------------
create or replace function preview_emission_share(p_hashrate numeric)
returns table (emission_per_second numeric, my_share numeric, active_hashrate numeric)
language plpgsql
stable
as $$
declare
  v_global_mined numeric;
  v_max_supply constant numeric := 100000000;
  v_base_emission constant numeric := 0.15;
  v_halving_mult numeric;
  v_active numeric;
begin
  select total_mined into v_global_mined from game_state where id = true;
  if v_global_mined >= v_max_supply - 1 then
    v_halving_mult := power(0.5, 64);
  else
    v_halving_mult := power(0.5, floor(-ln(1 - v_global_mined / v_max_supply) / ln(2)));
  end if;
  v_active := greatest(active_network_hashrate(now()), p_hashrate);
  return query select
    v_base_emission * v_halving_mult,
    case when v_active <= 0 then 0 else p_hashrate / v_active end,
    v_active;
end;
$$;

grant execute on function claim_mining_reward(bigint, numeric) to service_role;
grant execute on function preview_emission_share(numeric) to service_role;
grant execute on function active_network_hashrate(timestamptz) to service_role;

-- game_state itself is only ever touched through the functions above
-- (SECURITY DEFINER, called with the service role from Edge Functions),
-- so — matching the rest of this schema — no direct client policies.
alter table game_state enable row level security;
