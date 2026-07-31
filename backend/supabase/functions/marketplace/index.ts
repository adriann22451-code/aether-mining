// supabase/functions/marketplace/index.ts
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
import { verifyTelegramInitData } from "../_shared/telegram.ts";
import { corsHeaders, handleCors } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

Deno.serve(async (req) => {
  const preflight = handleCors(req);
  if (preflight) return preflight;

  try {
    const body = await req.json();
    const { initData, action } = body;
    if (!initData || !action) return json({ error: "Missing initData or action" }, 400);

    const { user } = await verifyTelegramInitData(initData, BOT_TOKEN);

    const { data: player, error: playerErr } = await admin.from("players").select("id, core").eq("telegram_id", user.id).single();
    if (playerErr || !player) return json({ error: "Player not found — call sync-player with action=init first" }, 404);

    if (action === "browse") {
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
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 401);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
