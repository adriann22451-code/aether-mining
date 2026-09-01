-- =========================================================
-- AETHER MINING — referral program (Phase 18)
--
-- Invite friends via a personal link (t.me/<bot>?startapp=<telegram_id>),
-- claim tiered AETHER rewards paid OUT of the Treasury pool once enough
-- friends have joined through that link. referral_count is the server's
-- own count (bumped once, atomically, the moment a NEW player's row is
-- created with this player as their referrer) — never a client-reported
-- number, same "server-authoritative" rule as missions/events.
-- =========================================================

alter table players add column if not exists referred_by bigint;
alter table players add column if not exists referral_count numeric not null default 0;
alter table players add column if not exists claimed_referral_ids jsonb not null default '[]'::jsonb;

create index if not exists idx_players_referred_by on players(referred_by);

-- Atomic +1 — called once, right when a brand-new player's row is first
-- inserted with a valid referrer (see sync-player.ts's init action).
create or replace function increment_referral_count(p_referrer_telegram_id bigint)
returns void
language sql
security definer
as $$
  update players set referral_count = referral_count + 1, updated_at = now()
  where telegram_id = p_referrer_telegram_id;
$$;

grant execute on function increment_referral_count(bigint) to service_role;
