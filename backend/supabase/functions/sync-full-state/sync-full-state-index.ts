// sync-full-state — self-contained version for manual deploy via the
// Supabase Dashboard (Edge Functions > Deploy a new function > paste this
// whole file under the name "sync-full-state").
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

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// ---------- CORS ----------
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ---------- Telegram initData verification ----------
const encoder = new TextEncoder();

async function hmacSha256(keyBytes: Uint8Array, message: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", keyBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return new Uint8Array(sig);
}
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}
interface TelegramUser { id: number; username?: string; first_name?: string; last_name?: string; }
const MAX_AUTH_AGE_SECONDS = 24 * 60 * 60;

async function verifyTelegramInitData(initData: string, botToken: string): Promise<{ user: TelegramUser }> {
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) throw new Error("Missing hash in initData");
  params.delete("hash");

  const dataCheckString = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");

  const secretKey = await hmacSha256(encoder.encode("WebAppData"), botToken);
  const expected = await hmacSha256(secretKey, dataCheckString);
  if (bytesToHex(expected) !== hash) throw new Error("Invalid Telegram initData signature");

  const authDate = Number(params.get("auth_date") || "0");
  if (!authDate || Date.now() / 1000 - authDate > MAX_AUTH_AGE_SECONDS) {
    throw new Error("Telegram initData has expired — reopen the Mini App");
  }

  const userRaw = params.get("user");
  if (!userRaw) throw new Error("Missing user in initData");
  return { user: JSON.parse(userRaw) as TelegramUser };
}

// ---------- hashrate calc (kept in sync with client's data/parts.js and
//             the other Edge Functions — see the note there: only
//             GPU+Rack contribute hashrate directly, Processor is a %
//             multiplier on top, Cooling/Battery/Drone don't touch
//             hashrate at all) ----------
const LEVEL_HP_GROWTH = 1.06;

const HASHRATE_PARTS: Record<string, number> = {
  gpu_0: 40e6, gpu_1: 180e6, gpu_2: 750e6, gpu_3: 3200e6, gpu_4: 14000e6,
  rack_0: 10e6, rack_1: 45e6, rack_2: 190e6, rack_3: 800e6, rack_4: 3400e6,
};
const HASHRATE_MULT_PARTS: Record<string, number> = {
  processor_0: 0.05, processor_1: 0.12, processor_2: 0.25, processor_3: 0.45, processor_4: 0.80,
};

function itemHpAtLevel(baseHp: number, level: number): number {
  if (level <= 0) return 0;
  return baseHp * Math.pow(LEVEL_HP_GROWTH, level - 1);
}
function calcHashrate(ownedItems: Record<string, number>): number {
  let total = 0;
  for (const [id, level] of Object.entries(ownedItems || {})) {
    const base = HASHRATE_PARTS[id];
    if (base && level > 0) total += itemHpAtLevel(base, level);
  }
  let multBonus = 0;
  for (const [id, level] of Object.entries(ownedItems || {})) {
    const base = HASHRATE_MULT_PARTS[id];
    if (base && level > 0) multBonus += itemHpAtLevel(base, level);
  }
  return total * (1 + multBonus);
}

// only these fields are accepted from the client — anything else in `state` is ignored
const ALLOWED_FIELDS = [
  "username", "owned_items", "unlocked_index", "active_site_index",
  "income_stats", "spend_stats",
  "inbox_claimed_ids", "market_owned", "auto_sell_enabled", "auto_claim_unlocked",
  "auto_claim_active", "prestige_count", "boost_end_time", "login_streak",
  "last_claim_date", "guild_points",
  // NOTE: core / total_earned / total_mined / pending are deliberately NOT
  // in this list — those can only change via sync-player's claim action,
  // marketplace trades, or (once written) authoritative Shop/Upgrade/Craft
  // functions. A client can send whatever it wants for those fields here
  // and this function will silently ignore it.
  //
  // claimed_referral_ids / referral_count / active_mission_ids / mission_day
  // / daily_* mission counters are also deliberately excluded, for the same
  // reason.
  //
  // guild_id is ALSO deliberately not in this list — it's a real
  // foreign-key relationship now (guilds table), not a soft progress
  // counter. Only guild-actions' create/join/leave/kick/disband may ever
  // write it; letting this autosave overwrite it risked desyncing a
  // player's membership from the guild's own member_count.
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

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
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
