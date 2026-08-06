// leaderboard — self-contained version for manual deploy via the Supabase
// Dashboard (Edge Functions > Deploy a new function > paste this whole file
// under the name "leaderboard").
//
// Real leaderboard, ranked from actual player data in Postgres.
//
// POST body: { initData, metric: "hashrate" | "earned" }
// Response: { rows: [{ username, value, isPlayer }], playerRank, totalPlayers }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { initData, metric } = await req.json();
    if (!initData) return json({ error: "Missing initData" }, 400);
    const column = metric === "earned" ? "total_earned" : "cached_hashrate";

    const { user } = await verifyTelegramInitData(initData, BOT_TOKEN);
    const { data: player, error: playerErr } = await admin.from("players").select("id, username").eq("telegram_id", user.id).single();
    if (playerErr || !player) return json({ error: "Player not found — call sync-player with action=init first" }, 404);

    const { data: top, error: topErr } = await admin
      .from("players_public")
      .select(`username, ${column}`)
      .order(column, { ascending: false })
      .limit(50);
    if (topErr) throw topErr;

    const rows = (top || []).map((r: Record<string, unknown>) => ({
      username: r.username as string,
      value: Number(r[column]),
      isPlayer: r.username === player.username,
    }));

    const { count, error: countErr } = await admin
      .from("players")
      .select("id", { count: "exact", head: true })
      .gt(column, (rows.find((r) => r.isPlayer)?.value ?? 0));
    if (countErr) throw countErr;

    const { count: totalPlayers } = await admin.from("players").select("id", { count: "exact", head: true });

    return json({ rows, playerRank: (count || 0) + 1, totalPlayers: totalPlayers || rows.length });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 401);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
