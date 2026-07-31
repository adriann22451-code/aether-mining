-- =========================================================
-- AETHER MINING — Supabase schema (Phase 1 + 2)
-- Run this in the Supabase SQL editor, or via `supabase db push`.
-- =========================================================

create extension if not exists "pgcrypto"; -- for gen_random_uuid()

-- ---------------------------------------------------------
-- GUILDS
-- ---------------------------------------------------------
create table if not exists guilds (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  tag text not null,
  color text not null default '#38bdf8',
  milestone_index int not null default 0,
  total_points numeric not null default 0,
  created_at timestamptz not null default now()
);

insert into guilds (name, tag, color) values
  ('Quantum Vanguard', 'QTV', '#38bdf8'),
  ('Aether Syndicate', 'AES', '#c084fc'),
  ('Genesis Collective', 'GNS', '#facc15')
on conflict (name) do nothing;

-- ---------------------------------------------------------
-- PLAYERS
-- One row per Telegram user. `core`/`total_earned`/etc. are the
-- server-authoritative source of truth — the client never writes
-- these directly, only Edge Functions (using the service role) do.
-- ---------------------------------------------------------
create table if not exists players (
  id uuid primary key default gen_random_uuid(),
  telegram_id bigint not null unique,
  username text not null default 'AETHER MINER',

  core numeric not null default 0,
  total_earned numeric not null default 0,
  total_mined numeric not null default 0,
  pending numeric not null default 0,

  owned_items jsonb not null default '{}'::jsonb,        -- { "gpu_0": 3, "cooling_1": 1, ... }
  unlocked_index int not null default 0,
  active_site_index int not null default 0,

  income_stats jsonb not null default '{}'::jsonb,
  spend_stats jsonb not null default '{}'::jsonb,

  claimed_mission_ids jsonb not null default '[]'::jsonb,
  claimed_event_ids jsonb not null default '[]'::jsonb,
  inbox_claimed_ids jsonb not null default '[]'::jsonb,

  market_owned jsonb not null default '{}'::jsonb,        -- special-item ownership counts
  auto_sell_enabled boolean not null default false,
  auto_claim_unlocked boolean not null default false,
  auto_claim_active boolean not null default true,
  prestige_count int not null default 0,
  boost_end_time timestamptz,

  login_streak int not null default 0,
  last_claim_date date,

  cached_hashrate numeric not null default 0,  -- refreshed every sync; powers the Leaderboard
  last_synced_at timestamptz not null default now(),

  guild_id uuid references guilds(id) on delete set null,
  guild_points numeric not null default 0,     -- this player's lifetime contribution to their guild

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_players_telegram_id on players(telegram_id);
create index if not exists idx_players_guild_id on players(guild_id);
create index if not exists idx_players_hashrate on players(cached_hashrate desc);
create index if not exists idx_players_total_earned on players(total_earned desc);

-- ---------------------------------------------------------
-- INVENTORY (materials & cosmetic items, quantity-tracked)
-- ---------------------------------------------------------
create table if not exists inventory_items (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references players(id) on delete cascade,
  name text not null,
  type text not null check (type in ('item', 'material')),
  qty int not null default 1,
  created_at timestamptz not null default now(),
  unique (player_id, name)
);

create index if not exists idx_inventory_player on inventory_items(player_id);

-- ---------------------------------------------------------
-- MARKETPLACE — real player-to-player listings
-- ---------------------------------------------------------
create table if not exists marketplace_listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references players(id) on delete cascade,
  item_name text not null,
  item_type text not null check (item_type in ('item', 'material')),
  price numeric not null check (price > 0),
  status text not null default 'active' check (status in ('active', 'sold', 'cancelled')),
  buyer_id uuid references players(id),
  created_at timestamptz not null default now(),
  sold_at timestamptz
);

create index if not exists idx_listings_status on marketplace_listings(status);
create index if not exists idx_listings_seller on marketplace_listings(seller_id);

-- ---------------------------------------------------------
-- PUBLIC VIEW — safe, read-only fields for Leaderboard / Guild
-- member lists / Marketplace seller names. Never exposes `core`.
-- ---------------------------------------------------------
create or replace view players_public as
  select id, username, cached_hashrate, total_earned, guild_id, guild_points, created_at
  from players;

-- ---------------------------------------------------------
-- ROW LEVEL SECURITY
-- The client only ever talks to Postgres through Edge Functions
-- using the SERVICE ROLE key (which bypasses RLS entirely), so
-- these policies are the fallback in case the anon/public key is
-- ever used directly — deny all writes, allow limited public reads.
-- ---------------------------------------------------------
alter table players enable row level security;
alter table inventory_items enable row level security;
alter table marketplace_listings enable row level security;
alter table guilds enable row level security;

create policy "guilds are publicly readable" on guilds
  for select using (true);

create policy "active listings are publicly readable" on marketplace_listings
  for select using (status = 'active');

-- No insert/update/delete policies are defined for the anon/authenticated
-- roles on players, inventory_items, or marketplace_listings — meaning
-- the public API key can never write to them. Only Edge Functions
-- (service role) can, which is where all validation happens.
