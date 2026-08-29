// game-actions — self-contained version for manual deploy via the Supabase
// Dashboard (Edge Functions > Deploy a new function > paste this whole file
// under the name "game-actions").
//
// Makes Shop purchases, Part upgrades (single + bulk), Crafting, and Site
// unlocks server-authoritative — the server validates cost/eligibility and
// is the only thing that changes `core`/`owned_items`/inventory for these
// actions, same pattern as sync-player's "claim".
//
// POST body:
//   { initData, action: "buyPart",    itemId }
//   { initData, action: "upgradePart", itemId }
//   { initData, action: "upgradeAll" }
//   { initData, action: "craftItem",  recipeId }
//   { initData, action: "unlockSite" }

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

// ---------- game data ----------
const MAX_LEVEL = 50;
const LEVEL_HP_GROWTH = 1.06;
const LEVEL_COST_GROWTH = 1.16; // kept in sync with client's data/parts.js (rebalanced from 1.12)
const LEVEL_COST_BASE_RATIO = 0.08;

// Rebalance: NOT every category boosts hashrate anymore. GPU/Rack = raw
// hashrate. Processor = % MULTIPLIER on GPU+Rack (its `hp` here is a
// fraction, e.g. 0.25 = +25%). Cooling/Battery/Drone don't affect hashrate
// at all (heat management, claim-cap bonus, bonus reward income — all
// client-side only). Keep this in sync with data/parts.js on the client.
const PART_DATA: Record<string, { hp: number; buyCost: number; category: "gpu" | "rack" | "cooling" | "battery" | "processor" | "drone" }> = {
  gpu_0: { hp: 40e6, buyCost: 0, category: "gpu" }, gpu_1: { hp: 180e6, buyCost: 2000, category: "gpu" }, gpu_2: { hp: 750e6, buyCost: 9000, category: "gpu" }, gpu_3: { hp: 3200e6, buyCost: 42000, category: "gpu" }, gpu_4: { hp: 14000e6, buyCost: 190000, category: "gpu" },
  rack_0: { hp: 10e6, buyCost: 0, category: "rack" }, rack_1: { hp: 45e6, buyCost: 1500, category: "rack" }, rack_2: { hp: 190e6, buyCost: 7000, category: "rack" }, rack_3: { hp: 800e6, buyCost: 32000, category: "rack" }, rack_4: { hp: 3400e6, buyCost: 150000, category: "rack" },
  cooling_0: { hp: 5e6, buyCost: 0, category: "cooling" }, cooling_1: { hp: 22e6, buyCost: 1200, category: "cooling" }, cooling_2: { hp: 95e6, buyCost: 5500, category: "cooling" }, cooling_3: { hp: 400e6, buyCost: 26000, category: "cooling" }, cooling_4: { hp: 1700e6, buyCost: 120000, category: "cooling" },
  battery_0: { hp: 0.25, buyCost: 0, category: "battery" }, battery_1: { hp: 0.75, buyCost: 1200, category: "battery" }, battery_2: { hp: 2, buyCost: 5500, category: "battery" }, battery_3: { hp: 5, buyCost: 26000, category: "battery" }, battery_4: { hp: 12, buyCost: 120000, category: "battery" },
  processor_0: { hp: 0.05, buyCost: 0, category: "processor" }, processor_1: { hp: 0.12, buyCost: 1800, category: "processor" }, processor_2: { hp: 0.25, buyCost: 8200, category: "processor" }, processor_3: { hp: 0.45, buyCost: 38000, category: "processor" }, processor_4: { hp: 0.80, buyCost: 175000, category: "processor" },
  drone_0: { hp: 0.03, buyCost: 0, category: "drone" }, drone_1: { hp: 0.15, buyCost: 4000, category: "drone" }, drone_2: { hp: 0.40, buyCost: 60000, category: "drone" },
};

const SITE_COST: number[] = [0, 3000, 10000, 30000, 80000, 180000, 350000, 650000, 1100000, 1800000, 3000000];

const CRAFT_RECIPES: Record<string, { targetId: string; materials: { name: string; qty: number }[]; aetherCost: number }> = {
  craft_cooling2: { targetId: "cooling_2", materials: [{ name: "Metal Plate", qty: 4 }, { name: "Nano Alloy", qty: 2 }], aetherCost: 500 },
  craft_battery2: { targetId: "battery_2", materials: [{ name: "Metal Ingot", qty: 3 }, { name: "Core Crystal", qty: 2 }], aetherCost: 500 },
  craft_processor2: { targetId: "processor_2", materials: [{ name: "Nano Alloy", qty: 3 }, { name: "Core Crystal", qty: 2 }], aetherCost: 800 },
  craft_rack2: { targetId: "rack_2", materials: [{ name: "Metal Ingot", qty: 5 }, { name: "Carbon Fiber", qty: 3 }], aetherCost: 700 },
  craft_gpu2: { targetId: "gpu_2", materials: [{ name: "Nano Alloy", qty: 4 }, { name: "Quantum Alloy", qty: 2 }], aetherCost: 4000 },
  craft_cooling3: { targetId: "cooling_3", materials: [{ name: "Quantum Alloy", qty: 3 }, { name: "Carbon Fiber", qty: 5 }], aetherCost: 12000 },
  craft_battery3: { targetId: "battery_3", materials: [{ name: "Quantum Alloy", qty: 3 }, { name: "Core Crystal", qty: 3 }], aetherCost: 12000 },
};

function itemHpAtLevel(baseHp: number, level: number): number {
  if (level <= 0) return 0;
  return baseHp * Math.pow(LEVEL_HP_GROWTH, level - 1);
}
function itemLevelUpCost(buyCost: number, level: number): number {
  const base = Math.max(buyCost, 500) * LEVEL_COST_BASE_RATIO;
  return Math.ceil(base * Math.pow(LEVEL_COST_GROWTH, level - 1));
}
function calcHashrate(ownedItems: Record<string, number>): number {
  let total = 0;
  let multBonus = 0;
  for (const [id, level] of Object.entries(ownedItems || {})) {
    const part = PART_DATA[id];
    if (!part || level <= 0) continue;
    if (part.category === "gpu" || part.category === "rack") {
      total += itemHpAtLevel(part.hp, level);
    } else if (part.category === "processor") {
      multBonus += itemHpAtLevel(part.hp, level);
    }
  }
  return total * (1 + multBonus);
}

// ---------- handler ----------
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    const { initData, action } = body;
    if (!initData || !action) return json({ error: "Missing initData or action" }, 400);

    const { user } = await verifyTelegramInitData(initData, BOT_TOKEN);
    const { data: player, error: playerErr } = await admin.from("players").select("*").eq("telegram_id", user.id).single();
    if (playerErr || !player) return json({ error: "Player not found — call sync-player with action=init first" }, 404);

    const ownedItems: Record<string, number> = player.owned_items || {};
    const spendStats: Record<string, number> = player.spend_stats || {};

    // ---------- buy a part from the Shop ----------
    if (action === "buyPart") {
      const { itemId } = body;
      const part = PART_DATA[itemId];
      if (!part) return json({ error: "Unknown item" }, 400);
      if (ownedItems[itemId]) return json({ error: "You already own this part" }, 400);
      if (Number(player.core) < part.buyCost) return json({ error: "Not enough AETHER" }, 400);

      const newOwned = { ...ownedItems, [itemId]: 1 };
      const newCore = Number(player.core) - part.buyCost;
      const newSpend = { ...spendStats, shop: (spendStats.shop || 0) + part.buyCost };

      const { data: updated, error } = await admin
        .from("players")
        .update({ core: newCore, owned_items: newOwned, spend_stats: newSpend, cached_hashrate: calcHashrate(newOwned), updated_at: new Date().toISOString() })
        .eq("id", player.id)
        .select("*")
        .single();
      if (error) throw error;
      return json({ player: updated });
    }

    // ---------- level up one part ----------
    if (action === "upgradePart") {
      const { itemId } = body;
      const part = PART_DATA[itemId];
      const level = ownedItems[itemId] || 0;
      if (!part) return json({ error: "Unknown item" }, 400);
      if (level <= 0) return json({ error: "You don't own this part yet" }, 400);
      if (level >= MAX_LEVEL) return json({ error: "Already at max level" }, 400);

      const cost = itemLevelUpCost(part.buyCost, level);
      if (Number(player.core) < cost) return json({ error: "Not enough AETHER" }, 400);

      const newOwned = { ...ownedItems, [itemId]: level + 1 };
      const newCore = Number(player.core) - cost;
      const newSpend = { ...spendStats, upgrades: (spendStats.upgrades || 0) + cost };

      const { data: updated, error } = await admin
        .from("players")
        .update({
          core: newCore, owned_items: newOwned, spend_stats: newSpend,
          upgrade_count: (player.upgrade_count || 0) + 1,
          cached_hashrate: calcHashrate(newOwned), updated_at: new Date().toISOString(),
        })
        .eq("id", player.id)
        .select("*")
        .single();
      if (error) throw error;
      return json({ player: updated });
    }

    // ---------- bulk upgrade: cheapest available upgrade repeatedly until funds run out ----------
    if (action === "upgradeAll") {
      let budget = Number(player.core);
      const items = { ...ownedItems };
      let totalSpent = 0;
      let totalLevels = 0;

      for (let safety = 0; safety < 5000; safety++) {
        let bestId: string | null = null;
        let bestCost = Infinity;
        for (const [id, part] of Object.entries(PART_DATA)) {
          const level = items[id] || 0;
          if (level <= 0 || level >= MAX_LEVEL) continue;
          const cost = itemLevelUpCost(part.buyCost, level);
          if (cost < bestCost) { bestCost = cost; bestId = id; }
        }
        if (bestId === null || bestCost > budget) break;
        budget -= bestCost;
        items[bestId] = (items[bestId] || 0) + 1;
        totalSpent += bestCost;
        totalLevels += 1;
      }

      if (totalLevels === 0) return json({ awarded: 0, totalLevels: 0, player });

      const newSpend = { ...spendStats, upgrades: (spendStats.upgrades || 0) + totalSpent };
      const { data: updated, error } = await admin
        .from("players")
        .update({
          core: Number(player.core) - totalSpent, owned_items: items, spend_stats: newSpend,
          upgrade_count: (player.upgrade_count || 0) + totalLevels,
          cached_hashrate: calcHashrate(items), updated_at: new Date().toISOString(),
        })
        .eq("id", player.id)
        .select("*")
        .single();
      if (error) throw error;
      return json({ totalLevels, totalSpent, player: updated });
    }

    // ---------- craft a part from Materials + AETHER ----------
    if (action === "craftItem") {
      const { recipeId } = body;
      const recipe = CRAFT_RECIPES[recipeId];
      if (!recipe) return json({ error: "Unknown recipe" }, 400);
      if (Number(player.core) < recipe.aetherCost) return json({ error: "Not enough AETHER" }, 400);

      const { data: invRows, error: invErr } = await admin
        .from("inventory_items")
        .select("id, name, qty")
        .eq("player_id", player.id)
        .in("name", recipe.materials.map((m) => m.name));
      if (invErr) throw invErr;

      for (const need of recipe.materials) {
        const row = invRows?.find((r) => r.name === need.name);
        if (!row || row.qty < need.qty) return json({ error: `Not enough ${need.name}` }, 400);
      }

      for (const need of recipe.materials) {
        const row = invRows!.find((r) => r.name === need.name)!;
        const remaining = row.qty - need.qty;
        if (remaining <= 0) {
          await admin.from("inventory_items").delete().eq("id", row.id);
        } else {
          await admin.from("inventory_items").update({ qty: remaining }).eq("id", row.id);
        }
      }

      const currentLevel = ownedItems[recipe.targetId] || 0;
      const newOwned = { ...ownedItems, [recipe.targetId]: Math.max(1, Math.min(MAX_LEVEL, currentLevel + 1)) };
      const newSpend = { ...spendStats, crafting: (spendStats.crafting || 0) + recipe.aetherCost };

      const { data: updated, error } = await admin
        .from("players")
        .update({
          core: Number(player.core) - recipe.aetherCost, owned_items: newOwned, spend_stats: newSpend,
          cached_hashrate: calcHashrate(newOwned), updated_at: new Date().toISOString(),
        })
        .eq("id", player.id)
        .select("*")
        .single();
      if (error) throw error;
      return json({ player: updated });
    }

    // ---------- unlock the next Mining Site ----------
    if (action === "unlockSite") {
      const next = (player.unlocked_index || 0) + 1;
      if (next >= SITE_COST.length) return json({ error: "All sites already unlocked" }, 400);
      const cost = SITE_COST[next];
      if (Number(player.core) < cost) return json({ error: "Not enough AETHER" }, 400);

      const newSpend = { ...spendStats, sites: (spendStats.sites || 0) + cost };
      const { data: updated, error } = await admin
        .from("players")
        .update({
          core: Number(player.core) - cost, unlocked_index: next, active_site_index: next,
          spend_stats: newSpend, updated_at: new Date().toISOString(),
        })
        .eq("id", player.id)
        .select("*")
        .single();
      if (error) throw error;
      return json({ player: updated });
    }

    return json({ error: `Unknown action: ${action}` }, 400);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 401);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
