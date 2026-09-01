-- =========================================================
-- AETHER MINING — rotating daily missions (Phase 17)
--
-- Missions used to be a fixed list of 4, claimable exactly once per
-- player, forever — nothing ever reset them, so "Claim AETHER 3x today"
-- was really "claim this once, ever" despite the wording.
--
-- This adds the columns needed for a proper rotating daily set: 3 of 7
-- mission templates are "active" on any given player-local calendar day
-- (deterministic per date, so everyone sees the same 3 that day), and
-- everything below resets back to zero the moment that day rolls over.
-- The actual rotation logic lives in the edge functions
-- (sync-player/game-actions' `ensureDailyMissionSet`), same as the
-- existing daily_claims / last_claim_day pattern — this migration only
-- adds the storage for it.
-- =========================================================

alter table players add column if not exists mission_day text;
alter table players add column if not exists active_mission_ids jsonb not null default '[]'::jsonb;
alter table players add column if not exists daily_upgrade_count numeric not null default 0;
alter table players add column if not exists daily_market_visited boolean not null default false;
alter table players add column if not exists daily_lootbox_count numeric not null default 0;
alter table players add column if not exists daily_craft_count numeric not null default 0;
