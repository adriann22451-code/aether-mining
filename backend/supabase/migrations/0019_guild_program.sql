-- =========================================================
-- AETHER MINING — real guilds (Phase 19)
--
-- The `guilds` table already existed (migration 0001) but nothing ever
-- actually wired up to it correctly: the client picked from a hardcoded
-- fake list (data/guild.js's GUILDS, with fake string ids like
-- "vanguard" and entirely made-up "members") and wrote that fake id
-- straight into players.guild_id — a uuid column — which the DB would've
-- rejected outright. So "joining a guild" never really worked; it just
-- looked like it did on screen.
--
-- This migration:
--   - adds owner_telegram_id + member_count to guilds (every guild from
--     here on is player-created, with a real owner who can kick members)
--   - deletes the 3 old fake seed guilds (Quantum Vanguard / Aether
--     Syndicate / Genesis Collective) — they have no real owner and no
--     real members ever actually joined them (see above), so they don't
--     fit the new model. ON DELETE SET NULL on players.guild_id makes
--     this safe.
--   - adds a small atomic helper for member_count, same pattern as the
--     Treasury/Reserve pool counters and referral_count.
-- =========================================================

alter table guilds add column if not exists owner_telegram_id bigint;
alter table guilds add column if not exists member_count int not null default 1;

delete from guilds;

create index if not exists idx_guilds_owner on guilds(owner_telegram_id);

create or replace function guild_member_delta(p_guild_id uuid, p_delta int)
returns void
language sql
security definer
as $$
  update guilds set member_count = greatest(0, member_count + p_delta) where id = p_guild_id;
$$;

grant execute on function guild_member_delta(uuid, int) to service_role;
