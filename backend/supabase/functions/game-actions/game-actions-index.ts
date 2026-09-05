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

const SITE_COST: number[] = [0, 300, 1000, 3000, 5000, 10000, 20000, 30000, 50000, 75000, 100000];

// ---------- Daily login streak — keep in sync with data/dailyStreak.js on
// the client. Client sends its own device-local `today` (toDateString())
// since the login day should follow the player's calendar day, not the
// server's UTC day; server just re-runs the same day-diff logic against
// the player's stored last_claim_date so it can't be replayed/spoofed.
const DAILY_STREAK_REWARDS = [5, 6, 7, 8, 9, 10, 10];
// Parses "YYYY-MM-DD" via explicit Y/M/D components — matches
// data/dailyStreak.js on the client exactly, so the day-diff math never
// disagrees with what the client already decided when it sent `today`.
function daysBetween(dateStrA: string, dateStrB: string): number {
  const [ay, am, ad] = dateStrA.split("-").map(Number);
  const [by, bm, bd] = dateStrB.split("-").map(Number);
  const a = new Date(ay, am - 1, ad);
  const b = new Date(by, bm - 1, bd);
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((b.getTime() - a.getTime()) / msPerDay);
}

// ---------- Missions / Events — server-authoritative reward payout.
// Progress is computed from columns the server itself tracks (never a
// client-reported number), and reward amounts live ONLY here — keep in
// sync with data/missions.js / data/events.js on the client, which are
// display-only now. `getProgress` reads straight off the `players` row.
//
// Missions rotate: 3 of the 7 templates below are "active" on any given
// day (players.active_mission_ids), chosen deterministically from the
// date so it's the same set for everyone and can't be rerolled. All the
// daily_* progress columns AND claimed_mission_ids reset back to zero
// the moment a player's local day rolls over (see ensureDailyMissionSet).
const MISSION_CATALOG: Record<number, { total: number; reward: number; getProgress: (p: Record<string, unknown>) => number }> = {
  101: { total: 3, reward: 5, getProgress: (p) => Number(p.daily_claims || 0) },
  102: { total: 1, reward: 5, getProgress: (p) => Number(p.daily_upgrade_count || 0) },
  103: { total: 1, reward: 5, getProgress: (p) => (p.daily_market_visited ? 1 : 0) },
  104: { total: 1, reward: 10, getProgress: (p) => Number(p.daily_lootbox_count || 0) },
  105: { total: 1, reward: 10, getProgress: (p) => Number(p.daily_craft_count || 0) },
  106: { total: 5, reward: 10, getProgress: (p) => Number(p.daily_claims || 0) },
  107: { total: 2, reward: 10, getProgress: (p) => Number(p.daily_upgrade_count || 0) },
};

const DAILY_MISSION_POOL = [101, 102, 103, 104, 105, 106, 107];
const DAILY_MISSION_SLOTS = 3;

// tiny deterministic PRNG seeded from a string (today's date) — same
// date always produces the same shuffle, so every player gets the same
// 3 active missions on a given day and it can't be gamed by rerolling.
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

// Rotates a player onto today's mission set the moment their local day
// changes — resets claimed_mission_ids and every daily_* progress column
// back to zero, and picks the new active_mission_ids. No-ops (and costs
// nothing) once already current for `today`. Called once per request,
// right after the player row is fetched, so every action in this file
// always sees a correctly-rotated player.
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


const EVENT_CATALOG: Record<number, { total: number; reward: number; getProgress: (p: Record<string, unknown>) => number }> = {
  1: { total: 5, reward: 10, getProgress: (p) => Number(p.claim_count || 0) },
  2: { total: 50000, reward: 100, getProgress: (p) => Number(p.total_earned || 0) },
  3: { total: 3e9, reward: 200, getProgress: (p) => Number(p.cached_hashrate || 0) },
};

// ---------- Referral program — tiered AETHER reward for inviting friends
// via a personal link (t.me/<bot>?startapp=<telegram_id>). referral_count
// is bumped exactly once per new friend, atomically, by sync-player's init
// action — never something a client reports. Keep in sync with
// data/referral.js on the client (display-only there).
const REFERRAL_TIER_CATALOG: Record<number, { friends: number; reward: number }> = {
  1: { friends: 5, reward: 10 },
  2: { friends: 25, reward: 50 },
  3: { friends: 50, reward: 100 },
  4: { friends: 100, reward: 200 },
  5: { friends: 500, reward: 1000 },
};

const CRAFT_RECIPES: Record<string, { targetId: string; materials: { name: string; qty: number }[]; aetherCost: number }> = {
  // Rare
  craft_cooling2: { targetId: "cooling_2", materials: [{ name: "Metal Plate", qty: 4 }, { name: "Nano Alloy", qty: 2 }], aetherCost: 500 },
  craft_battery2: { targetId: "battery_2", materials: [{ name: "Metal Ingot", qty: 3 }, { name: "Core Crystal", qty: 2 }], aetherCost: 500 },
  craft_processor2: { targetId: "processor_2", materials: [{ name: "Nano Alloy", qty: 3 }, { name: "Core Crystal", qty: 2 }], aetherCost: 800 },
  craft_rack2: { targetId: "rack_2", materials: [{ name: "Metal Ingot", qty: 5 }, { name: "Carbon Fiber", qty: 3 }], aetherCost: 700 },
  craft_gpu2: { targetId: "gpu_2", materials: [{ name: "Nano Alloy", qty: 4 }, { name: "Quantum Alloy", qty: 2 }], aetherCost: 4000 },
  craft_drone1: { targetId: "drone_1", materials: [{ name: "Metal Ingot", qty: 3 }, { name: "Nano Alloy", qty: 2 }], aetherCost: 400 },
  // Epic
  craft_cooling3: { targetId: "cooling_3", materials: [{ name: "Cryo Core", qty: 3 }, { name: "Carbon Fiber", qty: 4 }], aetherCost: 12000 },
  craft_battery3: { targetId: "battery_3", materials: [{ name: "Plasma Cell", qty: 3 }, { name: "Core Crystal", qty: 3 }], aetherCost: 12000 },
  craft_processor3: { targetId: "processor_3", materials: [{ name: "Quantum Alloy", qty: 3 }, { name: "Core Crystal", qty: 4 }], aetherCost: 17500 },
  craft_rack3: { targetId: "rack_3", materials: [{ name: "Graphene Weave", qty: 4 }, { name: "Carbon Fiber", qty: 3 }], aetherCost: 15000 },
  craft_gpu3: { targetId: "gpu_3", materials: [{ name: "Nano Alloy", qty: 4 }, { name: "Graphene Weave", qty: 3 }], aetherCost: 20000 },
  // Legendary — always gated behind Singularity Shard
  craft_cooling4: { targetId: "cooling_4", materials: [{ name: "Cryo Core", qty: 6 }, { name: "Singularity Shard", qty: 2 }], aetherCost: 65000 },
  craft_battery4: { targetId: "battery_4", materials: [{ name: "Plasma Cell", qty: 6 }, { name: "Singularity Shard", qty: 2 }], aetherCost: 65000 },
  craft_processor4: { targetId: "processor_4", materials: [{ name: "AI Core Fragment", qty: 4 }, { name: "Singularity Shard", qty: 2 }], aetherCost: 95000 },
  craft_rack4: { targetId: "rack_4", materials: [{ name: "Neutron Alloy", qty: 4 }, { name: "Singularity Shard", qty: 2 }], aetherCost: 80000 },
  craft_gpu4: { targetId: "gpu_4", materials: [{ name: "Neutron Alloy", qty: 4 }, { name: "Singularity Shard", qty: 2 }], aetherCost: 110000 },
  craft_drone2: { targetId: "drone_2", materials: [{ name: "Quantum Alloy", qty: 5 }, { name: "Singularity Shard", qty: 1 }], aetherCost: 32000 },
};

// ---------- Lootbox — keep this table in sync with data/lootbox.js on
// the client (used there only for the opening-animation preview; this
// server copy is the one that actually pays out). AETHER-only expected
// value is intentionally well BELOW LOOTBOX_COST — see 0008 migration
// header for why (a positive-EV gacha just prints money forever).
const LOOTBOX_COST = 500;
const MATERIAL_POOL_COMMON = ["Metal Ingot", "Metal Plate", "Storage Unit", "Fuel Barrel"];
const MATERIAL_POOL_UNCOMMON = ["Nano Alloy", "Core Crystal", "Carbon Fiber"];
const MATERIAL_POOL_EPIC = ["Graphene Weave", "Plasma Cell", "Cryo Core"];
const MATERIAL_POOL_LEGENDARY = ["AI Core Fragment", "Neutron Alloy", "Singularity Shard"];
const LOOTBOX_TABLE: { weight: number; type: "aether" | "material" | "part"; min?: number; max?: number; pool?: string[] }[] = [
  { weight: 40, type: "aether", min: 60, max: 220 },
  { weight: 15, type: "aether", min: 250, max: 600 },
  { weight: 20, type: "material", pool: MATERIAL_POOL_COMMON, min: 3, max: 8 },
  { weight: 12, type: "material", pool: MATERIAL_POOL_UNCOMMON, min: 1, max: 3 },
  { weight: 5, type: "material", pool: ["Quantum Alloy"], min: 1, max: 2 },
  { weight: 4, type: "material", pool: MATERIAL_POOL_EPIC, min: 1, max: 2 },
  { weight: 1, type: "material", pool: MATERIAL_POOL_LEGENDARY, min: 1, max: 1 },
  { weight: 3, type: "aether", min: 2000, max: 4000 },
  { weight: 5, type: "part" },
];

// Keep in sync with data/lootbox.js on the client (PART_RARITY_WEIGHTS /
// pickWeightedUnownedPart) — standard-gacha weighting for the "part"
// slot: Common+Uncommon ~70%, Rare ~20%, Epic ~8%, Legendary ~2%,
// instead of picking uniformly across every unowned item (which gave new
// players a >54% chance their first part win was Rare-or-better).
const PART_RARITY: Record<string, string> = {
  gpu_0: "Common", gpu_1: "Uncommon", gpu_2: "Rare", gpu_3: "Epic", gpu_4: "Legendary",
  rack_0: "Common", rack_1: "Uncommon", rack_2: "Rare", rack_3: "Epic", rack_4: "Legendary",
  cooling_0: "Common", cooling_1: "Uncommon", cooling_2: "Rare", cooling_3: "Epic", cooling_4: "Legendary",
  battery_0: "Common", battery_1: "Uncommon", battery_2: "Rare", battery_3: "Epic", battery_4: "Legendary",
  processor_0: "Common", processor_1: "Uncommon", processor_2: "Rare", processor_3: "Epic", processor_4: "Legendary",
  drone_0: "Common", drone_1: "Rare", drone_2: "Legendary",
};
const PART_RARITY_WEIGHTS: Record<string, number> = { Common: 35, Uncommon: 35, Rare: 20, Epic: 8, Legendary: 2 };

function pickWeightedUnownedPartId(unownedIds: string[]): string {
  const byRarity: Record<string, string[]> = {};
  unownedIds.forEach((id) => {
    const r = PART_RARITY[id] || "Common";
    (byRarity[r] ||= []).push(id);
  });
  const availableRarities = Object.keys(byRarity);
  const totalWeight = availableRarities.reduce((s, r) => s + (PART_RARITY_WEIGHTS[r] || 0), 0);
  let roll = Math.random() * totalWeight;
  let chosenRarity = availableRarities[0];
  for (const r of availableRarities) {
    const w = PART_RARITY_WEIGHTS[r] || 0;
    if (roll < w) { chosenRarity = r; break; }
    roll -= w;
  }
  const pool = byRarity[chosenRarity];
  return pool[Math.floor(Math.random() * pool.length)];
}

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
    const { initData, action, today } = body;
    if (!initData || !action) return json({ error: "Missing initData or action" }, 400);

    let user: TelegramUser;
    try {
      ({ user } = await verifyTelegramInitData(initData, BOT_TOKEN));
    } catch (authErr) {
      return json({ error: errorMessage(authErr) }, 401);
    }
    const { data: playerRow, error: playerErr } = await admin.from("players").select("*").eq("telegram_id", user.id).single();
    if (playerErr || !playerRow) return json({ error: "Player not found — call sync-player with action=init first" }, 404);
    const player = await ensureDailyMissionSet(admin, playerRow, today);

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
      await admin.rpc("add_to_reserve_pool", { p_amount: part.buyCost });
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
          daily_upgrade_count: (player.daily_upgrade_count || 0) + 1,
          cached_hashrate: calcHashrate(newOwned), updated_at: new Date().toISOString(),
        })
        .eq("id", player.id)
        .select("*")
        .single();
      if (error) throw error;
      await admin.rpc("add_to_reserve_pool", { p_amount: cost });
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
          daily_upgrade_count: (player.daily_upgrade_count || 0) + totalLevels,
          cached_hashrate: calcHashrate(items), updated_at: new Date().toISOString(),
        })
        .eq("id", player.id)
        .select("*")
        .single();
      if (error) throw error;
      await admin.rpc("add_to_reserve_pool", { p_amount: totalSpent });
      return json({ totalLevels, totalSpent, player: updated });
    }

    // ---------- craft a part from Materials + AETHER ----------
    if (action === "craftItem") {
      const { recipeId } = body;
      const recipe = CRAFT_RECIPES[recipeId];
      if (!recipe) return json({ error: "Unknown recipe" }, 400);
      // Craft only ever creates a part you don't have yet — once owned, further
      // growth for it is Upgrade's job (see action === "upgradePart" above), not Craft.
      if ((ownedItems[recipe.targetId] || 0) > 0) {
        return json({ error: "You already own this part — upgrade it from Inventory instead" }, 400);
      }
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

      const newOwned = { ...ownedItems, [recipe.targetId]: 1 };
      const newSpend = { ...spendStats, crafting: (spendStats.crafting || 0) + recipe.aetherCost };

      const { data: updated, error } = await admin
        .from("players")
        .update({
          core: Number(player.core) - recipe.aetherCost, owned_items: newOwned, spend_stats: newSpend,
          daily_craft_count: (player.daily_craft_count || 0) + 1,
          cached_hashrate: calcHashrate(newOwned), updated_at: new Date().toISOString(),
        })
        .eq("id", player.id)
        .select("*")
        .single();
      if (error) throw error;
      await admin.rpc("add_to_reserve_pool", { p_amount: recipe.aetherCost });
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
      await admin.rpc("add_to_reserve_pool", { p_amount: cost });
      return json({ player: updated });
    }

    // ---------- open a Lootbox: cost goes into Treasury pool, AETHER wins
    // are paid OUT of Treasury pool (capped by whatever's actually banked) ----------
    if (action === "openLootbox") {
      if (Number(player.core) < LOOTBOX_COST) return json({ error: "Not enough AETHER" }, 400);

      // cost is banked into Treasury FIRST — this is what future AETHER
      // wins (this one and everyone else's) get paid out of
      await admin.rpc("add_to_treasury_pool", { p_amount: LOOTBOX_COST });

      const totalWeight = LOOTBOX_TABLE.reduce((s, r) => s + r.weight, 0);
      let roll = Math.random() * totalWeight;
      let chosen = LOOTBOX_TABLE[0];
      for (const r of LOOTBOX_TABLE) {
        if (roll < r.weight) { chosen = r; break; }
        roll -= r.weight;
      }

      let newCore = Number(player.core) - LOOTBOX_COST;
      const newSpend = { ...spendStats, lootbox: (spendStats.lootbox || 0) + LOOTBOX_COST };
      const incomeStats: Record<string, number> = player.income_stats || {};
      let newIncome = incomeStats;
      let reward: Record<string, unknown>;

      if (chosen.type === "aether") {
        const rawAmount = Math.round((chosen.min! + Math.random() * (chosen.max! - chosen.min!)) / 10) * 10;
        // HARD CAP: never pays more than Treasury actually has banked
        const { data: paidAmount, error: payErr } = await admin.rpc("pay_from_treasury_pool", { p_amount: rawAmount });
        if (payErr) throw payErr;
        const amount = Number(paidAmount || 0);
        newCore += amount;
        newIncome = { ...incomeStats, lootbox: (incomeStats.lootbox || 0) + amount };
        reward = { type: "aether", amount };
      } else if (chosen.type === "material") {
        const name = chosen.pool![Math.floor(Math.random() * chosen.pool!.length)];
        const qty = Math.round(chosen.min! + Math.random() * (chosen.max! - chosen.min!));
        const { data: existingRow } = await admin.from("inventory_items").select("id, qty").eq("player_id", player.id).eq("name", name).maybeSingle();
        if (existingRow) {
          await admin.from("inventory_items").update({ qty: existingRow.qty + qty }).eq("id", existingRow.id);
        } else {
          await admin.from("inventory_items").insert({ player_id: player.id, name, type: "material", qty });
        }
        reward = { type: "material", name, qty };
      } else {
        const unowned = Object.keys(PART_DATA).filter((id) => !(ownedItems[id] > 0));
        if (unowned.length === 0) {
          const { data: paidAmount, error: payErr } = await admin.rpc("pay_from_treasury_pool", { p_amount: 400 });
          if (payErr) throw payErr;
          const amount = Number(paidAmount || 0);
          newCore += amount;
          newIncome = { ...incomeStats, lootbox: (incomeStats.lootbox || 0) + amount };
          reward = { type: "aether", amount, label: "AETHER (bonus)" };
        } else {
          const itemId = pickWeightedUnownedPartId(unowned);
          ownedItems[itemId] = 1;
          reward = { type: "part", itemId };
        }
      }

      const { data: updated, error } = await admin
        .from("players")
        .update({
          core: newCore, owned_items: ownedItems, spend_stats: newSpend, income_stats: newIncome,
          daily_lootbox_count: (player.daily_lootbox_count || 0) + 1,
          cached_hashrate: calcHashrate(ownedItems), updated_at: new Date().toISOString(),
        })
        .eq("id", player.id)
        .select("*")
        .single();
      if (error) throw error;
      return json({ reward, player: updated });
    }

    // ---------- daily login streak — server-authoritative so it survives
    // the next real sync instead of being silently overwritten by it.
    // Reward is paid OUT of the Treasury pool (same hard-cap pattern as
    // Lootbox) instead of being minted from nowhere — this is exactly the
    // "future Missions/Events/Daily Streak" draw-down Treasury was built
    // for back in migration 0007. ----------
    if (action === "claimDaily") {
      if (typeof today !== "string" || !today) return json({ error: "Missing today" }, 400);

      const lastClaimDate: string | null = player.last_claim_date || null;
      const loginStreak: number = player.login_streak || 0;
      const dailyUnclaimed = lastClaimDate !== today;
      if (!dailyUnclaimed) return json({ error: "Already claimed today" }, 400);

      const diff = lastClaimDate ? daysBetween(lastClaimDate, today) : null;
      const pendingStreakDay = diff === null ? 1 : diff === 1 ? loginStreak + 1 : diff > 1 ? 1 : loginStreak;
      const cycleDay = ((pendingStreakDay - 1) % 7) + 1;
      const rewardTarget = DAILY_STREAK_REWARDS[cycleDay - 1];

      // HARD CAP: never pays more than Treasury actually has banked
      const { data: paidAmount, error: payErr } = await admin.rpc("pay_from_treasury_pool", { p_amount: rewardTarget });
      if (payErr) throw payErr;
      const reward = Number(paidAmount || 0);

      const incomeStats: Record<string, number> = player.income_stats || {};
      const newIncome = { ...incomeStats, dailyStreak: (incomeStats.dailyStreak || 0) + reward };

      const { data: updated, error } = await admin
        .from("players")
        .update({
          core: Number(player.core) + reward,
          total_earned: Number(player.total_earned) + reward,
          login_streak: pendingStreakDay,
          last_claim_date: today,
          income_stats: newIncome,
          updated_at: new Date().toISOString(),
        })
        .eq("id", player.id)
        .select("*")
        .single();
      if (error) throw error;
      return json({ reward, streakDay: pendingStreakDay, player: updated });
    }

    // ---------- claim a Mission reward — paid OUT of Treasury pool ----------
    if (action === "claimMission") {
      const { missionId } = body;
      const mission = MISSION_CATALOG[Number(missionId)];
      if (!mission) return json({ error: "Unknown mission" }, 400);

      const activeIds: number[] = player.active_mission_ids || [];
      if (!activeIds.includes(Number(missionId))) return json({ error: "That mission isn't active today" }, 400);

      const claimedIds: number[] = player.claimed_mission_ids || [];
      if (claimedIds.includes(Number(missionId))) return json({ error: "Mission already claimed" }, 400);

      const progress = mission.getProgress(player);
      if (progress < mission.total) return json({ error: "Mission not complete yet" }, 400);

      // HARD CAP: never pays more than Treasury actually has banked
      const { data: paidAmount, error: payErr } = await admin.rpc("pay_from_treasury_pool", { p_amount: mission.reward });
      if (payErr) throw payErr;
      const reward = Number(paidAmount || 0);

      const incomeStats: Record<string, number> = player.income_stats || {};
      const newIncome = { ...incomeStats, missions: (incomeStats.missions || 0) + reward };

      const { data: updated, error } = await admin
        .from("players")
        .update({
          core: Number(player.core) + reward,
          total_earned: Number(player.total_earned) + reward,
          claimed_mission_ids: [...claimedIds, Number(missionId)],
          income_stats: newIncome,
          updated_at: new Date().toISOString(),
        })
        .eq("id", player.id)
        .select("*")
        .single();
      if (error) throw error;
      return json({ reward, player: updated });
    }

    // ---------- claim an Event reward (e.g. Aether Mining Fest) — paid
    // OUT of Treasury pool ----------
    if (action === "claimEvent") {
      const { eventId } = body;
      const ev = EVENT_CATALOG[Number(eventId)];
      if (!ev) return json({ error: "Unknown event" }, 400);

      const claimedIds: number[] = player.claimed_event_ids || [];
      if (claimedIds.includes(Number(eventId))) return json({ error: "Event already claimed" }, 400);

      const progress = ev.getProgress(player);
      if (progress < ev.total) return json({ error: "Event not complete yet" }, 400);

      // HARD CAP: never pays more than Treasury actually has banked
      const { data: paidAmount, error: payErr } = await admin.rpc("pay_from_treasury_pool", { p_amount: ev.reward });
      if (payErr) throw payErr;
      const reward = Number(paidAmount || 0);

      const incomeStats: Record<string, number> = player.income_stats || {};
      const newIncome = { ...incomeStats, events: (incomeStats.events || 0) + reward };

      const { data: updated, error } = await admin
        .from("players")
        .update({
          core: Number(player.core) + reward,
          total_earned: Number(player.total_earned) + reward,
          claimed_event_ids: [...claimedIds, Number(eventId)],
          income_stats: newIncome,
          updated_at: new Date().toISOString(),
        })
        .eq("id", player.id)
        .select("*")
        .single();
      if (error) throw error;
      return json({ reward, player: updated });
    }

    // ---------- claim a Referral tier reward — paid OUT of Treasury pool.
    // referral_count itself is never touched here — it's only ever bumped
    // by sync-player's init action, atomically, server-side. ----------
    if (action === "claimReferral") {
      const { tierId } = body;
      const tier = REFERRAL_TIER_CATALOG[Number(tierId)];
      if (!tier) return json({ error: "Unknown referral tier" }, 400);

      const claimedIds: number[] = player.claimed_referral_ids || [];
      if (claimedIds.includes(Number(tierId))) return json({ error: "Referral tier already claimed" }, 400);

      const referralCount = Number(player.referral_count || 0);
      if (referralCount < tier.friends) return json({ error: "Not enough referred friends yet" }, 400);

      // HARD CAP: never pays more than Treasury actually has banked
      const { data: paidAmount, error: payErr } = await admin.rpc("pay_from_treasury_pool", { p_amount: tier.reward });
      if (payErr) throw payErr;
      const reward = Number(paidAmount || 0);

      const incomeStats: Record<string, number> = player.income_stats || {};
      const newIncome = { ...incomeStats, referrals: (incomeStats.referrals || 0) + reward };

      const { data: updated, error } = await admin
        .from("players")
        .update({
          core: Number(player.core) + reward,
          total_earned: Number(player.total_earned) + reward,
          claimed_referral_ids: [...claimedIds, Number(tierId)],
          income_stats: newIncome,
          updated_at: new Date().toISOString(),
        })
        .eq("id", player.id)
        .select("*")
        .single();
      if (error) throw error;
      return json({ reward, player: updated });
    }

    return json({ error: `Unknown action: ${action}` }, 400);
  } catch (e) {
    console.error("game-actions error:", e);
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
