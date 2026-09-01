// marketplace — self-contained version for manual deploy via the Supabase
// Dashboard (Edge Functions > Deploy a new function > paste this whole file
// under the name "marketplace"). Self-contained (no "../_shared/..."
// imports) because the Dashboard's single-file paste can't resolve
// relative imports to files that aren't uploaded alongside it.
//
// Real player-to-player trading. Every mutating action goes through a
// Postgres RPC function (see migrations/0002_marketplace_rpc.sql) so
// buys/sells/cancels are atomic — no race conditions, no double-spends.
//
// POST body:
//   { initData, action: "browse" }
//   { initData, action: "list",   itemName, itemType, price }
//   { initData, action: "buy",    listingId }
//   { initData, action: "cancel", listingId }

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

    // Auth failures are the ONLY thing that should ever come back as 401 —
    // kept in its own try/catch so an unrelated internal error further
    // down (bad RPC, missing column, etc.) never gets mislabeled as
    // "you're not logged in".
    let user: TelegramUser;
    try {
      ({ user } = await verifyTelegramInitData(initData, BOT_TOKEN));
    } catch (authErr) {
      return json({ error: errorMessage(authErr) }, 401);
    }

    const { data: player, error: playerErr } = await admin.from("players").select("id, core, market_visited, daily_market_visited").eq("telegram_id", user.id).single();
    if (playerErr || !player) return json({ error: "Player not found — call sync-player with action=init first" }, 404);

    if (action === "browse") {
      // server-authoritative flag for the "Visit the Marketplace" mission —
      // market_visited is a lifetime flag; daily_market_visited is the one
      // the rotating mission actually reads, and gets reset back to false
      // by ensureDailyMissionSet (sync-player/game-actions) whenever the
      // player's local day rolls over, so it's safe to just always set it
      // true here without worrying about which day it is.
      if (!player.market_visited || !player.daily_market_visited) {
        await admin.from("players").update({ market_visited: true, daily_market_visited: true }).eq("id", player.id);
      }

      const { data, error } = await admin
        .from("marketplace_listings")
        .select("id, item_name, item_type, price, created_at, seller:seller_id(username)")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return json({ listings: data });
    }

    if (action === "list") {
      const { itemName, itemType, price } = body;
      if (!itemName || !itemType || !price) return json({ error: "Missing itemName, itemType, or price" }, 400);
      const { data, error } = await admin.rpc("create_listing", {
        p_seller_id: player.id,
        p_item_name: itemName,
        p_item_type: itemType,
        p_price: price,
      });
      if (error) return json({ error: error.message }, 400);
      return json({ listing: data });
    }

    if (action === "buy") {
      const { listingId } = body;
      if (!listingId) return json({ error: "Missing listingId" }, 400);
      const { data, error } = await admin.rpc("buy_listing", { p_listing_id: listingId, p_buyer_id: player.id });
      if (error) return json({ error: error.message }, 400);
      return json({ listing: data });
    }

    if (action === "cancel") {
      const { listingId } = body;
      if (!listingId) return json({ error: "Missing listingId" }, 400);
      const { error } = await admin.rpc("cancel_listing", { p_listing_id: listingId, p_seller_id: player.id });
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    return json({ error: `Unknown action: ${action}` }, 400);
  } catch (e) {
    console.error("marketplace error:", e);
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
