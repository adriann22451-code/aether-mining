import {
  Package,
} from "lucide-react";
import { parseInventoryQty } from "../data/inventory";
import { TRADE_ITEM_POOL } from "../data/market";

export const SUPABASE_FUNCTIONS_URL = "https://vcuvuslybplyhonywicg.supabase.co/functions/v1";

// TODO: paste your Supabase anon/public key here — find it in
// Project Settings > API > "anon public" key. Edge Functions require this
// in the request headers even though our own auth is Telegram-based.

export const SUPABASE_ANON_KEY = "sb_publishable_tbrTHKKV5vpQbB5fT1uQEg_nSMrImb0";

export function getTelegramWebApp() {
  return typeof window !== "undefined" && window.Telegram && window.Telegram.WebApp ? window.Telegram.WebApp : null;
}

export function getInitData() {
  const tg = getTelegramWebApp();
  return tg && tg.initData ? tg.initData : null;
}

// true only when both (a) we're inside Telegram with real initData, and
// (b) the anon key above has actually been filled in

export function isBackendConfigured() {
  return Boolean(getInitData()) && !SUPABASE_ANON_KEY.includes("YOUR-ANON-KEY");
}

async function callFunction(name, body) {
  const initData = getInitData();
  const res = await fetch(`${SUPABASE_FUNCTIONS_URL}/${name}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_ANON_KEY,
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ initData, ...body }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `${name} request failed`);
  return data;
}

// Postgres inventory rows are { name, type, qty } — this re-adds the
// icon/color/desc (looked up by name) and the "xN" tag string the UI expects.

export function resolveInventoryRow(row) {
  const ref = TRADE_ITEM_POOL.find((p) => p.name === row.name);
  return {
    id: row.name,
    name: row.name,
    type: row.type,
    tag: `x${row.qty}`,
    icon: ref ? ref.icon : Package,
    iconColor: ref ? ref.iconColor : "#94a3b8",
    selected: false,
    desc: ref ? ref.desc : "",
  };
}

export function inventoryToRows(inventory) {
  return inventory
    .filter((it) => it.type === "item" || it.type === "material")
    .map((it) => ({ name: it.name, type: it.type, qty: parseInventoryQty(it.tag) || 1 }));
}
