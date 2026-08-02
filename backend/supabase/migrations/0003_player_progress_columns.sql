-- =========================================================
-- AETHER MINING — additional player columns (Phase 3)
-- Needed so Missions/Events can be validated against real,
-- server-tracked progress instead of trusting the client.
-- =========================================================

alter table players
  add column if not exists claim_count int not null default 0,
  add column if not exists daily_claims int not null default 0,
  add column if not exists last_claim_day date,
  add column if not exists upgrade_count int not null default 0,
  add column if not exists market_visited boolean not null default false;
