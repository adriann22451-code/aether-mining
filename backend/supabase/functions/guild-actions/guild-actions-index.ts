// guild-actions — self-contained version for manual deploy via the
// Supabase Dashboard (Edge Functions > Deploy a new function > paste this
// whole file under the name "guild-actions").
//
// Real, server-authoritative guilds: creating one costs 500 AETHER (paid
// into the Reserve pool), only the owner can kick members, and the
// milestone reward payout is re-validated here (never trust a client-sent
// reward number) — same pattern as game-actions' claimMission/claimEvent.
//
// POST body:
//   { initData, action: "list" }
//   { initData, action: "create", name, tag, color, icon }
//   { initData, action: "join",   guildId }
//   { initData, action: "leave" }
//   { initData, action: "disband" }
//   { initData, action: "kick",   targetPlayerId }
//   { initData, action: "roster" }
//   { initData, action: "claimMilestone" }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const GUILD_CREATE_COST = 500;
const GUILD_MAX_MEMBERS = 50;

// Must stay in sync with GUILD_ICON_PRESETS in src/data/guild.js — only a
// preset *key* is ever stored, never an arbitrary string/URL.
const GUILD_ICON_KEYS = [
  "flame-core", "cyber-wolf", "quantum-shield", "storm-circuit", "golden-reactor",
  "iron-fortress", "phoenix-drive", "frost-node", "venom-byte", "star-array",
];
const DEFAULT_GUILD_ICON = GUILD_ICON_KEYS[0];

function guildMilestoneFor(n: number): number {
  return Math.round(3000 * Math.pow(1.6, n));
}
function guildRewardFor(n: number): number {
  return Math.round(2000 * Math.pow(1.5, n));
}

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
  const dataCheckString = Array.from(params.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${v}`).join("\n");
  const secretKey = await hmacSha256(encoder.encode("WebAppData"), botToken);
  const expected = await hmacSha256(secretKey, dataCheckString);
  if (bytesToHex(expected) !== hash) throw new Error("Invalid Telegram initData signature");
  const authDate = Number(params.get("auth_date") || "0");
  if (!authDate || Date.now() / 1000 - authDate > MAX_AUTH_AGE_SECONDS) throw new Error("Telegram initData has expired — reopen the Mini App");
  const userRaw = params.get("user");
  if (!userRaw) throw new Error("Missing user in initData");
  return { user: JSON.parse(userRaw) as TelegramUser };
}

// ---------- handler ----------
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    const { initData, action } = body;
    if (!initData || !action) return json({ error: "Missing initData or action" }, 400);

    let user: TelegramUser;
    try {
      ({ user } = await verifyTelegramInitData(initData, BOT_TOKEN));
    } catch (authErr) {
      return json({ error: errorMessage(authErr) }, 401);
    }

    const { data: player, error: playerErr } = await admin
      .from("players")
      .select("id, telegram_id, core, guild_id, guild_points")
      .eq("telegram_id", user.id)
      .single();
    if (playerErr || !player) return json({ error: "Player not found — call sync-player with action=init first" }, 404);

    // ---------- browse guilds ----------
    if (action === "list") {
      const { data: guilds, error } = await admin
        .from("guilds")
        .select("id, name, tag, color, icon, member_count, total_points, owner_telegram_id")
        .order("member_count", { ascending: false })
        .limit(50);
      if (error) throw error;

      const ownerIds = [...new Set((guilds || []).map((g) => g.owner_telegram_id).filter(Boolean))];
      const { data: owners } = ownerIds.length
        ? await admin.from("players").select("telegram_id, username").in("telegram_id", ownerIds)
        : { data: [] as { telegram_id: number; username: string }[] };
      const ownerMap = new Map((owners || []).map((o) => [o.telegram_id, o.username]));

      return json({
        guilds: (guilds || []).map((g) => ({ ...g, ownerName: ownerMap.get(g.owner_telegram_id) || "?", full: g.member_count >= GUILD_MAX_MEMBERS })),
      });
    }

    // ---------- create a guild — costs 500 AETHER, paid into the Reserve pool ----------
    if (action === "create") {
      if (player.guild_id) return json({ error: "Leave your current guild first" }, 400);

      const name = String(body.name || "").trim().slice(0, 24);
      const tag = String(body.tag || "").trim().toUpperCase().slice(0, 5);
      const color = /^#[0-9a-fA-F]{6}$/.test(body.color) ? body.color : "#38bdf8";
      const icon = GUILD_ICON_KEYS.includes(body.icon) ? body.icon : DEFAULT_GUILD_ICON;
      if (name.length < 3) return json({ error: "Guild name needs at least 3 characters" }, 400);
      if (tag.length < 2) return json({ error: "Tag needs at least 2 characters" }, 400);
      if (Number(player.core) < GUILD_CREATE_COST) return json({ error: "Not enough AETHER" }, 400);

      const { data: newGuild, error: insertErr } = await admin
        .from("guilds")
        .insert({ name, tag, color, icon, owner_telegram_id: user.id, member_count: 1 })
        .select("*")
        .single();
      if (insertErr) {
        if (String(insertErr.message || "").includes("duplicate")) return json({ error: "A guild with that name already exists" }, 400);
        throw insertErr;
      }

      await admin.rpc("add_to_reserve_pool", { p_amount: GUILD_CREATE_COST });

      const { data: updated, error } = await admin
        .from("players")
        .update({ core: Number(player.core) - GUILD_CREATE_COST, guild_id: newGuild.id, guild_points: 0, updated_at: new Date().toISOString() })
        .eq("id", player.id)
        .select("*")
        .single();
      if (error) throw error;
      return json({ player: updated, guild: newGuild });
    }

    // ---------- join an existing guild ----------
    if (action === "join") {
      if (player.guild_id) return json({ error: "Leave your current guild first" }, 400);
      const { guildId } = body;
      const { data: guild, error: guildErr } = await admin.from("guilds").select("*").eq("id", guildId).single();
      if (guildErr || !guild) return json({ error: "Guild not found" }, 404);
      if (guild.member_count >= GUILD_MAX_MEMBERS) return json({ error: "That guild is full" }, 400);

      const { data: updated, error } = await admin
        .from("players")
        .update({ guild_id: guildId, guild_points: 0, updated_at: new Date().toISOString() })
        .eq("id", player.id)
        .select("*")
        .single();
      if (error) throw error;
      await admin.rpc("guild_member_delta", { p_guild_id: guildId, p_delta: 1 });
      return json({ player: updated, guild });
    }

    // ---------- leave (owners must disband instead) ----------
    if (action === "leave") {
      if (!player.guild_id) return json({ error: "You're not in a guild" }, 400);
      const { data: guild } = await admin.from("guilds").select("owner_telegram_id").eq("id", player.guild_id).single();
      if (guild && guild.owner_telegram_id === user.id) {
        return json({ error: "You own this guild — disband it or transfer ownership isn't supported yet" }, 400);
      }
      const guildId = player.guild_id;
      const { data: updated, error } = await admin
        .from("players")
        .update({ guild_id: null, guild_points: 0, updated_at: new Date().toISOString() })
        .eq("id", player.id)
        .select("*")
        .single();
      if (error) throw error;
      await admin.rpc("guild_member_delta", { p_guild_id: guildId, p_delta: -1 });
      return json({ player: updated });
    }

    // ---------- disband (owner only) — deletes the guild; ON DELETE SET
    // NULL on players.guild_id clears every member's membership for free ----------
    if (action === "disband") {
      if (!player.guild_id) return json({ error: "You're not in a guild" }, 400);
      const { data: guild } = await admin.from("guilds").select("owner_telegram_id").eq("id", player.guild_id).single();
      if (!guild || guild.owner_telegram_id !== user.id) return json({ error: "Only the guild owner can disband it" }, 400);

      const { error: delErr } = await admin.from("guilds").delete().eq("id", player.guild_id);
      if (delErr) throw delErr;

      const { data: updated, error } = await admin.from("players").select("*").eq("id", player.id).single();
      if (error) throw error;
      return json({ player: updated });
    }

    // ---------- kick a member (owner only) ----------
    if (action === "kick") {
      if (!player.guild_id) return json({ error: "You're not in a guild" }, 400);
      const { targetPlayerId } = body;
      if (!targetPlayerId || targetPlayerId === player.id) return json({ error: "Invalid target" }, 400);

      const { data: guild } = await admin.from("guilds").select("owner_telegram_id").eq("id", player.guild_id).single();
      if (!guild || guild.owner_telegram_id !== user.id) return json({ error: "Only the guild owner can kick members" }, 400);

      const { data: target } = await admin.from("players").select("id, guild_id").eq("id", targetPlayerId).single();
      if (!target || target.guild_id !== player.guild_id) return json({ error: "That player isn't in your guild" }, 400);

      const { error } = await admin.from("players").update({ guild_id: null, guild_points: 0, updated_at: new Date().toISOString() }).eq("id", targetPlayerId);
      if (error) throw error;
      await admin.rpc("guild_member_delta", { p_guild_id: player.guild_id, p_delta: -1 });
      return json({ ok: true });
    }

    // ---------- member roster ----------
    if (action === "roster") {
      if (!player.guild_id) return json({ error: "You're not in a guild" }, 400);
      const { data: guild, error: guildErr } = await admin.from("guilds").select("*").eq("id", player.guild_id).single();
      if (guildErr || !guild) return json({ error: "Guild not found" }, 404);

      const { data: members, error } = await admin
        .from("players")
        .select("id, telegram_id, username, cached_hashrate, guild_points")
        .eq("guild_id", player.guild_id)
        .order("guild_points", { ascending: false });
      if (error) throw error;

      return json({
        guild,
        members: (members || []).map((m) => ({
          id: m.id,
          username: m.username,
          cachedHashrate: m.cached_hashrate,
          guildPoints: m.guild_points,
          isOwner: m.telegram_id === guild.owner_telegram_id,
          isYou: m.id === player.id,
        })),
      });
    }

    // ---------- claim the guild's current milestone reward — paid OUT of
    // Treasury pool, re-validated here rather than trusting the client's
    // locally-ticked guildPoints number ----------
    if (action === "claimMilestone") {
      if (!player.guild_id) return json({ error: "You're not in a guild" }, 400);
      const { data: guild, error: guildErr } = await admin.from("guilds").select("*").eq("id", player.guild_id).single();
      if (guildErr || !guild) return json({ error: "Guild not found" }, 404);

      const milestone = guildMilestoneFor(guild.milestone_index);
      if (Number(player.guild_points) < milestone) return json({ error: "Milestone not reached yet" }, 400);

      const { data: paidAmount, error: payErr } = await admin.rpc("pay_from_treasury_pool", { p_amount: guildRewardFor(guild.milestone_index) });
      if (payErr) throw payErr;
      const reward = Number(paidAmount || 0);

      const { data: currentPlayer, error: curErr } = await admin.from("players").select("core, total_earned, guild_points").eq("id", player.id).single();
      if (curErr) throw curErr;

      const { data: updated, error } = await admin
        .from("players")
        .update({
          core: Number(currentPlayer.core) + reward,
          total_earned: Number(currentPlayer.total_earned) + reward,
          guild_points: Number(currentPlayer.guild_points) - milestone,
          updated_at: new Date().toISOString(),
        })
        .eq("id", player.id)
        .select("*")
        .single();
      if (error) throw error;

      await admin.from("guilds").update({ milestone_index: guild.milestone_index + 1 }).eq("id", guild.id);
      return json({ reward, player: updated, milestoneIndex: guild.milestone_index + 1 });
    }

    return json({ error: `Unknown action: ${action}` }, 400);
  } catch (e) {
    console.error("guild-actions error:", e);
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
