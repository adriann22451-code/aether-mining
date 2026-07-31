// supabase/functions/sync-player/index.ts
//
// Single entry point for: logging in via Telegram, fetching your own
// player row + inventory, and claiming accrued AETHER. The server is the
// only thing that ever writes `core`, `total_earned`, `total_mined`, or
// `pending` — the client just displays what this function returns.
//
// POST body: { initData: string, action: "init" | "claim" }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyTelegramInitData } from "../_shared/telegram.ts";
import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { calcHashrate, miningHalvingMultiplier, INCOME_DIVISOR, PENDING_CAP_HOURS, AETHER_MAX_SUPPLY } from "../_shared/gameData.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

Deno.serve(async (req) => {
  const preflight = handleCors(req);
  if (preflight) return preflight;

  try {
    const { initData, action } = await req.json();
    if (!initData || !action) {
      return json({ error: "Missing initData or action" }, 400);
    }

    const { user } = await verifyTelegramInitData(initData, BOT_TOKEN);

    // find or create the player
    let { data: player, error } = await admin.from("players").select("*").eq("telegram_id", user.id).single();

    if (error && error.code === "PGRST116") {
      // no row yet — first time this Telegram user opens the Mini App
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

      // refresh cached_hashrate on every init so the Leaderboard stays current
      const hashrate = calcHashrate(player.owned_items || {});
      if (hashrate !== player.cached_hashrate) {
        await admin.from("players").update({ cached_hashrate: hashrate }).eq("id", player.id);
        player.cached_hashrate = hashrate;
      }

      return json({ player, inventory, guild });
    }

    if (action === "claim") {
      const now = Date.now();
      const lastSync = new Date(player.last_synced_at).getTime();
      const elapsedSeconds = Math.max(0, (now - lastSync) / 1000);
      const cappedSeconds = Math.min(elapsedSeconds, PENDING_CAP_HOURS * 3600);

      const hashrate = calcHashrate(player.owned_items || {});
      // NOTE: site bonus / prestige / boost multipliers are intentionally
      // left out of this MVP claim calc for simplicity — see the roadmap
      // note in the project's DEPLOY.md about porting those over too.
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
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
