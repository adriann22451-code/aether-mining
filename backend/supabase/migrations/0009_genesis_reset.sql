-- =========================================================
-- AETHER MINING — GENESIS RESET (Phase 9)
--
-- *** THIS IS A ONE-TIME, FULLY DESTRUCTIVE DATA RESET — NOT A NORMAL
-- SCHEMA MIGRATION. It wipes every player's progress and every shared
-- network counter back to a clean slate. ***
--
-- Why: the tokenomics changed shape multiple times while the game was
-- already being played/tested (flat emission -> ghost hashrate ->
-- carryover pool -> treasury/reserve pools -> lootbox rebalance). By now
-- game_state.total_mined and every player's core/total_earned reflect a
-- mix of old and new rules. Rather than try to reconcile that, this
-- resets EVERYTHING to genesis so the finished tokenomics design starts
-- from a real, consistent block zero.
--
-- What gets reset:
--   - game_state: total_mined, carryover_pool, treasury_pool,
--     reserve_pool all back to 0.
--   - mining_blocks: cleared (block explorer starts empty).
--   - marketplace_listings: cleared (stale prices from the old economy).
--   - inventory_items: cleared (all banked materials wiped).
--   - EVERY player row: core/total_earned/total_mined/pending -> 0,
--     owned_items -> just the starter kit (GTX 1660 / Starter Rack /
--     Air Cooler / Lithium Battery / Basic Processor / Worker Drone,
--     each at level 1 — same as a brand-new player, see data/inbox.js),
--     unlocked_index/active_site_index -> 0, income_stats/spend_stats ->
--     empty, claimed_mission_ids/claimed_event_ids/inbox_claimed_ids ->
--     empty (so the Starter Kit inbox item shows as claimable again),
--     market_owned -> empty, auto_sell/auto_claim toggles -> off,
--     prestige_count/login_streak -> 0, boost_end_time/last_claim_date ->
--     null, cached_hashrate -> 0 (recomputed automatically on the
--     player's next sync), guild_points -> 0.
--   - guilds: total_points and milestone_index reset to 0 (they're just
--     an aggregate of the now-zeroed guild_points above).
--
-- Guild MEMBERSHIP itself (players.guild_id) is left untouched — this
-- resets economy/progression, not social structure.
--
-- Run this ONCE, deliberately, from the Supabase SQL editor or
-- `supabase db push` right before opening the game up for real. Do NOT
-- leave this in a migration chain that might get re-applied later
-- without meaning to — once it's run, consider deleting this file (or
-- at least never renumbering/reordering it) so it can't fire twice.
-- =========================================================

update game_state set
  total_mined = 0,
  carryover_pool = 0,
  treasury_pool = 0,
  reserve_pool = 0,
  updated_at = now()
where id = true;

truncate table mining_blocks;
truncate table marketplace_listings;
truncate table inventory_items;

update players set
  core = 0,
  total_earned = 0,
  total_mined = 0,
  pending = 0,
  owned_items = '{"gpu_0": 1, "rack_0": 1, "cooling_0": 1, "battery_0": 1, "processor_0": 1, "drone_0": 1}'::jsonb,
  unlocked_index = 0,
  active_site_index = 0,
  income_stats = '{}'::jsonb,
  spend_stats = '{}'::jsonb,
  claimed_mission_ids = '[]'::jsonb,
  claimed_event_ids = '[]'::jsonb,
  inbox_claimed_ids = '[]'::jsonb,
  market_owned = '{}'::jsonb,
  auto_sell_enabled = false,
  auto_claim_unlocked = false,
  auto_claim_active = true,
  prestige_count = 0,
  boost_end_time = null,
  login_streak = 0,
  last_claim_date = null,
  cached_hashrate = 0,
  guild_points = 0,
  last_synced_at = now(),
  updated_at = now();

update guilds set
  total_points = 0,
  milestone_index = 0;
