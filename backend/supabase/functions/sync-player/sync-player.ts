// sync-player — self-contained version for manual deploy via the Supabase
// Dashboard (Edge Functions > Deploy a new function > paste this whole file).
//
// Login, fetch your own player row + inventory, and claim accrued AETHER.
// The server is the only thing that ever writes core/total_earned/
// total_mined/pending — the client just displays what this returns.
//
// POST body: { initData: string, action: "init" | "claim" }

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

async function verifyTelegramInitData(initData: string, botToken: string): Promise<{ user: TelegramUser; authDate: number }> {
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
  return { user: JSON.parse(userRaw) as TelegramUser, authDate };
}

// ---------- game data / formulas ----------
const LEVEL_HP_GROWTH = 1.06;
const INCOME_DIVISOR = 5e8;
const AETHER_MAX_SUPPLY = 100_000_000;
const PENDING_CAP_HOURS = 6;

const PART_HP: Record<string, { hp: number; category: string }> = {
  gpu_0: { hp: 40e6, category: "gpu" }, gpu_1: { hp: 180e6, category: "gpu" }, gpu_2: { hp: 750e6, category: "gpu" }, gpu_3: { hp: 3200e6, category: "gpu" }, gpu_4: { hp: 14000e6, category: "gpu" },
  rack_0: { hp: 10e6, category: "rack" }, rack_1: { hp: 45e6, category: "rack" }, rack_2: { hp: 190e6, category: "rack" }, rack_3: { hp: 800e6, category: "rack" }, rack_4: { hp: 3400e6, category: "rack" },
  cooling_0: { hp: 5e6, category: "cooling" }, cooling_1: { hp: 22e6, category: "cooling" }, cooling_2: { hp: 95e6, category: "cooling" }, cooling_3: { hp: 400e6, category: "cooling" }, cooling_4: { hp: 1700e6, category: "cooling" },
  battery_0: { hp: 5e6, category: "battery" }, battery_1: { hp: 22e6, category: "battery" }, battery_2: { hp: 95e6, category: "battery" }, battery_3: { hp: 400e6, category: "battery" }, battery_4: { hp: 1700e6, category: "battery" },
  processor_0: { hp: 8e6, category: "processor" }, processor_1: { hp: 36e6, category: "processor" }, processor_2: { hp: 150e6, category: "processor" }, processor_3: { hp: 640e6, category: "processor" }, processor_4: { hp: 2700e6, category: "processor" },
  drone_0: { hp: 6e6, category: "drone" }, drone_1: { hp: 60e6, category: "drone" }, drone_2: { hp: 500e6, category: "drone" },
};

function itemHpAtLevel(baseHp: number, level: number): number {
  if (level <= 0) return 0;
  return baseHp * Math.pow(LEVEL_HP_GROWTH, level - 1);
}
function calcHashrate(ownedItems: Record<string, number>): number {
  let total = 0;
  for (const [id, level] of Object.entries(ownedItems || {})) {
    const part = PART_HP[id];
    if (part && level > 0) total += itemHpAtLevel(part.hp, level);
  }
  return total;
}
function miningHalvingMultiplier(totalMined: number): number {
  if (totalMined >= AETHER_MAX_SUPPLY - 1) return Math.pow(0.5, 64);
  const fractionRemaining = 1 - totalMined / AETHER_MAX_SUPPLY;
  const epoch = Math.max(0, Math.floor(-Math.log2(fractionRemaining)));
  return Math.pow(0.5, epoch);
}

// ---------- handler ----------
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { initData, action } = await req.json();
    if (!initData || !action) return json({ error: "Missing initData or action" }, 400);

    const { user } = await verifyTelegramInitData(initData, BOT_TOKEN);

    let { data: player, error } = await admin.from("players").select("*").eq("telegram_id", user.id).single();

    if (error && error.code === "PGRST116") {
      const username = user.username || user.first_name || "AETHER MINER";
      const insertRes = await admin
        .from("players")
        .insert({ telegram_id: user.id, username, last_synced_at: new Date().toISOString() })
        .select("*")
        .single();
      if (insertRes.error) throw insertRes.error;
      player = insertRes.data;
    } else if (error) {
      throw error;
    }

    if (action === "init") {
      const { data: inventory, error: invErr } = await admin.from("inventory_items").select("name, type, qty").eq("player_id", player.id);
      if (invErr) throw invErr;

      const { data: guild } = player.guild_id ? await admin.from("guilds").select("*").eq("id", player.guild_id).single() : { data: null };

      const hashrate = calcHashrate(player.owned_items || {});
      if (hashrate !== player.cached_hashrate) {
        await admin.from("players").update({ cached_hashrate: hashrate }).eq("id", player.id);
        player.cached_hashrate = hashrate;
      }

      // preview what a "claim" would award right now, so the Claim button on the
      // client shows the real accrued amount instead of starting back at 0
      const elapsedSeconds = Math.max(0, (Date.now() - new Date(player.last_synced_at).getTime()) / 1000);
      const cappedSeconds = Math.min(elapsedSeconds, PENDING_CAP_HOURS * 3600);
      const halving = miningHalvingMultiplier(player.total_mined);
      const perSecond = (hashrate / INCOME_DIVISOR) * halving;
      player.pending = perSecond * cappedSeconds + Number(player.pending || 0);

      return json({ player, inventory, guild });
    }

    if (action === "claim") {
      const now = Date.now();
      const lastSync = new Date(player.last_synced_at).getTime();
      const elapsedSeconds = Math.max(0, (now - lastSync) / 1000);
      const cappedSeconds = Math.min(elapsedSeconds, PENDING_CAP_HOURS * 3600);

      const hashrate = calcHashrate(player.owned_items || {});
      const halving = miningHalvingMultiplier(player.total_mined);
      const perSecond = (hashrate / INCOME_DIVISOR) * halving;
      const awarded = Math.max(0, perSecond * cappedSeconds + Number(player.pending || 0));

      const newTotalMined = Math.min(AETHER_MAX_SUPPLY, Number(player.total_mined) + awarded);

      const updateRes = await admin
        .from("players")
        .update({
          core: Number(player.core) + awarded,
          total_earned: Number(player.total_earned) + awarded,
          total_mined: newTotalMined,
          pending: 0,
          cached_hashrate: hashrate,
          last_synced_at: new Date(now).toISOString(),
          updated_at: new Date(now).toISOString(),
        })
        .eq("id", player.id)
        .select("*")
        .single();
      if (updateRes.error) throw updateRes.error;

      return json({ awarded, player: updateRes.data });
    }

    return json({ error: `Unknown action: ${action}` }, 400);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 401);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
