-- =========================================================
-- AETHER MINING — Lootbox becomes server-authoritative + funds/draws the
-- Treasury pool (Phase 8)
--
-- Phase 7 (0007_treasury_reserve_pools.sql) created the Treasury pool but
-- nothing actually paid INTO or OUT of it yet except the 5% mining tax.
-- Meanwhile the Lootbox feature was 100% client-side: the 500 AETHER cost
-- just vanished (no record), and the AETHER reward was conjured straight
-- into the player's balance (no source) — exactly the "where does this
-- come from" problem Treasury was built to fix, and with the old reward
-- table (see data/lootbox.js) it paid out MORE AETHER on average than it
-- cost, which would have drained Treasury immediately once wired up.
--
-- This migration:
--   1. Adds add_to_treasury_pool() / pay_from_treasury_pool() — the
--      latter is a HARD CAP: it only ever pays out min(requested,
--      whatever's actually banked), so Treasury can never go negative
--      and a lootbox win can never out-pay what the pool can afford,
--      no matter how the reward table is tuned later.
--   2. Moves the Lootbox roll to game-actions (server-authoritative, same
--      pattern as buyPart/upgradePart/craftItem/unlockSite): the 500
--      AETHER cost goes straight into treasury_pool, and any AETHER win
--      is paid OUT of treasury_pool (capped) rather than minted fresh —
--      see the new "openLootbox" action in game-actions-index.ts.
-- =========================================================

create or replace function add_to_treasury_pool(p_amount numeric)
returns numeric
language sql
security definer
as $$
  update game_state set treasury_pool = treasury_pool + greatest(0, p_amount), updated_at = now() where id = true
  returning treasury_pool;
$$;

-- Pays out at most what's actually in the pool. Returns the amount ACTUALLY
-- paid (may be less than p_amount if the pool is running low) so the
-- caller can credit the player with the real, capped amount.
create or replace function pay_from_treasury_pool(p_amount numeric)
returns numeric
language plpgsql
security definer
as $$
declare
  v_pool numeric;
  v_paid numeric;
begin
  select treasury_pool into v_pool from game_state where id = true for update;
  v_paid := least(greatest(0, p_amount), v_pool);
  update game_state set treasury_pool = v_pool - v_paid, updated_at = now() where id = true;
  return v_paid;
end;
$$;

grant execute on function add_to_treasury_pool(numeric) to service_role;
grant execute on function pay_from_treasury_pool(numeric) to service_role;
