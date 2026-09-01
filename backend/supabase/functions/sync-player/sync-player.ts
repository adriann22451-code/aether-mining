// sync-player — self-contained version for manual deploy via the Supabase
// Dashboard (Edge Functions > Deploy a new function > paste this whole file).
//
// Login, fetch your own player row + inventory, and claim accrued AETHER.
// The server is the only thing that ever writes core/total_earned/
// total_mined/pending — the client just displays what this returns.
//
// AETHER_MAX_SUPPLY is a SHARED pool now (see migration 0004): actual
// claim math (the halving curve + splitting the emission rate by each
// player's share of currently-active hashrate) lives in the
// `claim_mining_reward` Postgres function so it can run inside one
// row-locked transaction — never duplicate that math here.
//
// POST body: { initData: string, action: "init" | "claim" | "heartbeat" | "network_stats" }

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

async function verifyTelegramInitData(initData: string, botToken: string): Promise<{ user: TelegramUser; authDate: number; startParam: string | null }> {
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
  // start_param is part of the HMAC-signed initData itself (set by Telegram
  // when the Mini App was opened via a t.me/<bot>?startapp=<code> link) —
  // reading it here means it can't be spoofed independently of a valid
  // signature, unlike a value the client just sent as a plain body field.
  return { user: JSON.parse(userRaw) as TelegramUser, authDate, startParam: params.get("start_param") || null };
}

// ---------- game data / formulas (hashrate calc only — reward math now
//             lives in the claim_mining_reward/preview_emission_share
//             Postgres functions from migration 0004) ----------
//
// Rebalance: NOT every rig category boosts hashrate anymore — only GPU and
// Rack do. Processor is now a % MULTIPLIER on top of GPU+Rack (matches
// data/parts.js statType on the client — keep both in sync if either
// changes). Cooling/Battery/Drone don't affect hashrate at all client-side
// (heat management, claim-cap, and bonus reward income respectively), so
// they're intentionally left out of this server-side hashrate calc too.
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

// ---------- handler ----------
// ---------- Daily mission rotation — kept in sync with the identical
// helper in game-actions-index.ts (both files are self-contained for
// manual deploy, so this small bit of logic is duplicated on purpose).
// Runs here too so opening the app (action=\"init\") already shows
// today's rotated mission set, without needing a claim first. ----------
const DAILY_MISSION_POOL = [101, 102, 103, 104, 105, 106, 107];
const DAILY_MISSION_SLOTS = 3;

function seededShuffle<T>(arr: T[], seed: string): T[] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    h = (h * 1103515245 + 12345) >>> 0;
    const j = h % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function pickDailyMissionSet(today: string): number[] {
  return seededShuffle(DAILY_MISSION_POOL, today).slice(0, DAILY_MISSION_SLOTS).sort((a, b) => a - b);
}

async function ensureDailyMissionSet(admin: ReturnType<typeof createClient>, player: Record<string, any>, today: string | undefined) {
  if (!today || player.mission_day === today) return player;
  const { data: updated, error } = await admin
    .from("players")
    .update({
      mission_day: today,
      active_mission_ids: pickDailyMissionSet(today),
      claimed_mission_ids: [],
      daily_upgrade_count: 0,
      daily_market_visited: false,
      daily_lootbox_count: 0,
      daily_craft_count: 0,
    })
    .eq("id", player.id)
    .select("*")
    .single();
  if (error) throw error;
  return updated;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { initData, action, today } = await req.json();
    if (!initData || !action) return json({ error: "Missing initData or action" }, 400);

    // Auth failures (bad/expired Telegram initData) are the ONLY thing
    // that should ever come back as 401 — kept in its own try/catch so a
    // completely unrelated internal error (a bad SQL call, a missing
    // column, etc.) further down can never get mislabeled as "you're not
    // logged in", which was hiding the real error before.
    let user: TelegramUser;
    let startParam: string | null = null;
    try {
      ({ user, startParam } = await verifyTelegramInitData(initData, BOT_TOKEN));
    } catch (authErr) {
      return json({ error: errorMessage(authErr) }, 401);
    }

    let { data: player, error } = await admin.from("players").select("*").eq("telegram_id", user.id).single();

    if (error && error.code === "PGRST116") {
      const username = user.username || user.first_name || "AETHER MINER";

      // Referral: start_param is only meaningful for a BRAND NEW player
      // (an existing player reopening the app via someone's link should
      // never retroactively become "referred"). Must be a real numeric
      // telegram_id, not the player's own id, and must belong to an
      // existing player — otherwise it's silently ignored, no error.
      let referredBy: number | null = null;
      const referrerId = startParam ? Number(startParam) : NaN;
      if (Number.isFinite(referrerId) && referrerId > 0 && referrerId !== user.id) {
        const { data: referrer } = await admin.from("players").select("telegram_id").eq("telegram_id", referrerId).single();
        if (referrer) referredBy = referrerId;
      }

      const insertRes = await admin
        .from("players")
        .insert({ telegram_id: user.id, username, last_synced_at: new Date().toISOString(), referred_by: referredBy })
        .select("*")
        .single();
      if (insertRes.error) throw insertRes.error;
      player = insertRes.data;

      if (referredBy) {
        await admin.rpc("increment_referral_count", { p_referrer_telegram_id: referredBy });
      }
    } else if (error) {
      throw error;
    }

    player = await ensureDailyMissionSet(admin, player, today);

    const hashrate = calcHashrate(player.owned_items || {});

    if (action === "heartbeat") {
      // lightweight "still here" ping — keeps this player counted in the
      // active-hashrate pool between real claims, WITHOUT touching
      // core/total_earned/pending. No lock needed: single-row update.
      const { data: updated, error: hbErr } = await admin
        .from("players")
        .update({ cached_hashrate: hashrate, last_synced_at: new Date().toISOString() })
        .eq("id", player.id)
        .select("*")
        .single();
      if (hbErr) throw hbErr;

      const { data: previewRows } = await admin.rpc("preview_emission_share", { p_hashrate: hashrate });
      const preview = previewRows?.[0] || { emission_per_second: 0, my_share: 0 };

      return json({ player: updated, myEmissionPerSecond: preview.emission_per_second * preview.my_share });
    }

    if (action === "init") {
      const { data: inventory, error: invErr } = await admin.from("inventory_items").select("name, type, qty").eq("player_id", player.id);
      if (invErr) throw invErr;

      const { data: guild } = player.guild_id ? await admin.from("guilds").select("*").eq("id", player.guild_id).single() : { data: null };

      // real, persisted catch-up for time spent away — replaces the old
      // logic here that only faked a bigger `pending` in the JSON
      // response without ever writing it to the database (see 0014)
      const { data: catchUpRows, error: catchUpErr } = await admin.rpc("catch_up_offline_earnings", {
        p_telegram_id: user.id,
        p_hashrate: hashrate,
      });
      if (catchUpErr) throw catchUpErr;
      const catchUp = catchUpRows?.[0] || { credited: 0, elapsed_seconds: 0 };
      const offlineEarnings = Number(catchUp.credited || 0);
      const offlineSeconds = Number(catchUp.elapsed_seconds || 0);

      const { data: refreshed, error: refetchErr } = await admin.from("players").select("*").eq("id", player.id).single();
      if (refetchErr) throw refetchErr;
      player = refreshed;

      const { data: gameState } = await admin.from("game_state").select("total_mined").eq("id", true).single();

      const { data: previewRows, error: previewErr } = await admin.rpc("preview_emission_share", { p_hashrate: hashrate });
      if (previewErr) throw previewErr;
      const preview = previewRows?.[0] || { emission_per_second: 0, my_share: 0, active_hashrate: hashrate };

      return json({
        player,
        inventory,
        guild,
        globalTotalMined: Number(gameState?.total_mined || 0),
        myEmissionPerSecond: preview.emission_per_second * preview.my_share,
        offlineEarnings,
        offlineSeconds,
      });
    }

    if (action === "claim") {
      const { data: rows, error: claimErr } = await admin.rpc("claim_mining_reward", {
        p_telegram_id: user.id,
        p_hashrate: hashrate,
      });
      if (claimErr) throw claimErr;
      const result = rows?.[0];
      if (!result) throw new Error("claim_mining_reward returned no result");

      // Server-authoritative claim_count (lifetime) / daily_claims (resets
      // on a new calendar day) — feeds the Mission/Event progress checks
      // in game-actions' claimMission/claimEvent. `today` is the client's
      // device-local toDateString(), same pattern as claimDaily, so the
      // "daily" reset follows the player's calendar day, not the server's.
      const lastClaimDay: string | null = player.last_claim_day || null;
      const newDailyClaims = typeof today === "string" && today && lastClaimDay === today
        ? (player.daily_claims || 0) + 1
        : 1;
      const { error: statErr } = await admin
        .from("players")
        .update({
          claim_count: (player.claim_count || 0) + 1,
          daily_claims: newDailyClaims,
          last_claim_day: typeof today === "string" && today ? today : lastClaimDay,
        })
        .eq("id", player.id);
      if (statErr) throw statErr;

      const { data: freshPlayer, error: fetchErr } = await admin.from("players").select("*").eq("id", player.id).single();
      if (fetchErr) throw fetchErr;

      const { data: previewRows } = await admin.rpc("preview_emission_share", { p_hashrate: hashrate });
      const preview = previewRows?.[0] || { emission_per_second: 0, my_share: 0 };

      return json({
        awarded: Number(result.awarded),
        player: freshPlayer,
        globalTotalMined: Number(result.new_global_total_mined),
        myEmissionPerSecond: preview.emission_per_second * preview.my_share,
      });
    }

    if (action === "network_stats") {
      const { data: statsRows, error: statsErr } = await admin.rpc("get_network_stats");
      if (statsErr) throw statsErr;
      const stats = statsRows?.[0];
      if (!stats) throw new Error("get_network_stats returned no result");

      const { data: blocks, error: blocksErr } = await admin
        .from("mining_blocks")
        .select("id, block_time, block_reward, total_reward, subsidy_reward, treasury_cut, active_miners, active_hashrate, halving_epoch, global_total_mined_after, carryover_pool_after")
        .order("block_time", { ascending: false })
        .limit(50);
      if (blocksErr) throw blocksErr;

      return json({ stats, blocks });
    }

    return json({ error: `Unknown action: ${action}` }, 400);
  } catch (e) {
    // any error THIS FAR IN is an internal failure (bad SQL, missing
    // table/column, etc.) — never 401, and never silently "Unknown error"
    // for non-Error throw shapes (Supabase/Postgres errors are plain
    // objects, not `instanceof Error`, so that check alone used to swallow
    // the real message).
    console.error("sync-player error:", e);
    return json({ error: errorMessage(e) }, 500);
  }
});

function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (e && typeof e === "object") {
    const anyE = e as Record<string, unknown>;
    return String(anyE.message || anyE.error_description || anyE.details || anyE.hint || JSON.stringify(e));
  }
  return String(e);
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
