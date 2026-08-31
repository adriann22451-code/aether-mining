// telegram-webhook — self-contained version for manual deploy via the
// Supabase Dashboard (Edge Functions > Deploy a new function > paste this
// whole file under the name "telegram-webhook").
//
// Receives Telegram's webhook updates and replies to the command-menu
// commands set by set-bot-commands.sh: /start, /help, /market,
// /networkstats. This is what actually makes the bot respond — the
// command menu itself only sets the labels shown in the "/" picker.
//
// Required secrets (same pattern as the other functions):
//   TELEGRAM_BOT_TOKEN   — from BotFather
//   MINI_APP_URL         — the deployed Mini App's https URL, e.g.
//                          https://your-app.example.com
// (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are injected automatically.)
//
// After deploying, point Telegram at this function once with:
//   ./set-webhook.sh
//
// POST body: whatever Telegram sends (a Update object) — see
// https://core.telegram.org/bots/api#update

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!;
const MINI_APP_URL = Deno.env.get("MINI_APP_URL") || "";

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

// ---------- small formatting helpers (mirror src/lib/format.js) ----------
function formatCore(n: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function formatInt(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}
function formatHashrate(hp: number): string {
  const units: [number, string][] = [[1e15, "PH/s"], [1e12, "TH/s"], [1e9, "GH/s"], [1e6, "MH/s"], [1e3, "KH/s"]];
  for (const [v, s] of units) {
    if (hp >= v) return `${(hp / v).toFixed(2)} ${s}`;
  }
  return `${Math.round(hp)} H/s`;
}

// ---------- Telegram send helpers ----------
async function sendMessage(chatId: number, text: string, replyMarkup?: unknown) {
  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      reply_markup: replyMarkup,
    }),
  });
}

function openAppKeyboard(label: string, tab?: string) {
  if (!MINI_APP_URL) return undefined;
  const url = tab ? `${MINI_APP_URL}${MINI_APP_URL.includes("?") ? "&" : "?"}tab=${tab}` : MINI_APP_URL;
  return { inline_keyboard: [[{ text: label, web_app: { url } }]] };
}

// ---------- command handlers ----------
async function handleStart(chatId: number) {
  await sendMessage(
    chatId,
    "⚡ <b>Welcome to Aether Mining</b>\n\nTap below to start mining AETHER.",
    openAppKeyboard("🚀 Launch Aether Mining"),
  );
}

async function handleHelp(chatId: number) {
  await sendMessage(
    chatId,
    "<b>Aether Mining — Commands</b>\n\n" +
      "/start — launch the game\n" +
      "/market — open the Marketplace\n" +
      "/networkstats — live network stats\n\n" +
      "Mine AETHER by upgrading your rig, claim it regularly, and complete " +
      "Missions and Events for bonus rewards. Trade spare parts and " +
      "materials with other players on the Marketplace.",
  );
}

async function handleMarket(chatId: number) {
  await sendMessage(chatId, "🛒 Open the Marketplace to trade with other miners:", openAppKeyboard("🛒 Open Marketplace", "market"));
}

async function handleNetworkStats(chatId: number) {
  const { data: rows, error } = await admin.rpc("get_network_stats");
  if (error || !rows?.[0]) {
    await sendMessage(chatId, "Couldn't fetch network stats right now — try again in a bit.");
    return;
  }
  const s = rows[0];
  const { count: activeMiners } = await admin.from("players").select("id", { count: "exact", head: true });

  const text =
    "📡 <b>Network Stats</b>\n\n" +
    `Total Mined: ${formatCore(Number(s.total_mined))} / ${formatInt(Number(s.max_supply))} AETHER\n` +
    `Current Block Reward: ${formatCore(Number(s.current_block_reward))} AETHER (epoch ${s.current_epoch})\n` +
    `Active Network Hashrate: ${formatHashrate(Number(s.real_active_hashrate))}\n` +
    `Treasury Pool: ${formatCore(Number(s.treasury_pool))} AETHER\n` +
    `Reserve Pool: ${formatCore(Number(s.reserve_pool))} AETHER\n` +
    (typeof activeMiners === "number" ? `Registered Miners: ${formatInt(activeMiners)}\n` : "") +
    (s.subsidy_active ? "\n🟢 Subsidy pool is currently active." : "");

  await sendMessage(chatId, text, openAppKeyboard("📡 View in App", "networkStats"));
}

// ---------- handler ----------
Deno.serve(async (req) => {
  try {
    const update = await req.json();
    const message = update.message;
    if (!message || typeof message.text !== "string") {
      // Nothing to do for non-text updates (reactions, edits, etc.) —
      // Telegram just needs a 200 so it doesn't retry.
      return new Response("ok");
    }

    const chatId: number = message.chat.id;
    // Strip a "@YourBotName" suffix, which Telegram appends in group chats.
    const command = message.text.trim().split(/\s+/)[0].split("@")[0].toLowerCase();

    if (command === "/start") await handleStart(chatId);
    else if (command === "/help") await handleHelp(chatId);
    else if (command === "/market") await handleMarket(chatId);
    else if (command === "/networkstats") await handleNetworkStats(chatId);
    // Unknown commands are ignored on purpose — no need to spam the chat.

    return new Response("ok");
  } catch (e) {
    // Always 200 back to Telegram even on internal errors, or it will
    // keep retrying the same failing update indefinitely.
    console.error("telegram-webhook error:", e);
    return new Response("ok");
  }
});
