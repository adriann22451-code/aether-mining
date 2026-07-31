// supabase/functions/sync-full-state/index.ts
//
// A bridge function. `sync-player` (claim) and `marketplace` (trading) are
// already fully server-authoritative — the client cannot cheat those.
// Everything else in the game (Shop purchases, Upgrades, Crafting, Guild,
// Daily Streak, Missions/Events, Loot Box, Auto-Sell, Prestige) still runs
// its logic in the browser for now, and calls this function to persist the
// result to Postgres instead of Telegram CloudStorage.
//
// This is NOT cheat-proof for those specific actions yet — a modified
// client could report bogus numbers here. It DOES solve the original ask
// ("data pemain tersimpan di server, bukan CloudStorage"). Turning each of
// those actions into its own authoritative Edge Function (matching the
// `sync-player` claim pattern) is the natural next step — see the
// project's backend/README.md roadmap.
//
// POST body: { initData, state: {...}, inventory: [...] }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyTelegramInitData } from "../_shared/telegram.ts";
import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { calcHashrate } from "../_shared/gameData.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// only these fields are accepted from the client — anything else in `state` is ignored
const ALLOWED_FIELDS = [
  "username", "owned_items", "unlocked_index", "active_site_index",
  "income_stats", "spend_stats", "claimed_mission_ids", "claimed_event_ids",
  "inbox_claimed_ids", "market_owned", "auto_sell_enabled", "auto_claim_unlocked",
  "auto_claim_active", "prestige_count", "boost_end_time", "login_streak",
  "last_claim_date", "guild_id", "guild_points",
  // NOTE: core / total_earned / total_mined / pending are deliberately NOT
  // in this list — those can only change via sync-player's claim action,
  // marketplace trades, or (once written) authoritative Shop/Upgrade/Craft
  // functions. A client can send whatever it wants for those fields here
  // and this function will silently ignore it.
];

Deno.serve(async (req) => {
  const preflight = handleCors(req);
  if (preflight) return preflight;

  try {
    const { initData, state, inventory } = await req.json();
    if (!initData) return json({ error: "Missing initData" }, 400);

    const { user } = await verifyTelegramInitData(initData, BOT_TOKEN);

    const { data: player, error: playerErr } = await admin.from("players").select("id, owned_items").eq("telegram_id", user.id).single();
    if (playerErr || !player) return json({ error: "Player not found — call sync-player with action=init first" }, 404);

    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (state && typeof state === "object") {
      for (const field of ALLOWED_FIELDS) {
        if (field in state) update[field] = state[field];
      }
    }
    // owned_items changing (e.g. from Shop/Upgrade/Craft) means the cached
    // hashrate used by the Leaderboard and mining-claim calc needs a refresh
    if ("owned_items" in update) {
      update.cached_hashrate = calcHashrate(update.owned_items as Record<string, number>);
    }

    const { error: updateErr } = await admin.from("players").update(update).eq("id", player.id);
    if (updateErr) throw updateErr;

    if (Array.isArray(inventory)) {
      // replace-all: simplest correct approach for a bridge function.
      // Cheap enough at this data size; can optimize to a diff later.
      await admin.from("inventory_items").delete().eq("player_id", player.id);
      const rows = inventory
        .filter((it: { name?: string; type?: string; qty?: number }) => it && it.name && it.type)
        .map((it: { name: string; type: string; qty?: number }) => ({
          player_id: player.id,
          name: it.name,
          type: it.type,
          qty: Math.max(1, Number(it.qty) || 1),
        }));
      if (rows.length > 0) {
        const { error: invErr } = await admin.from("inventory_items").insert(rows);
        if (invErr) throw invErr;
      }
    }

    return json({ ok: true });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 401);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
