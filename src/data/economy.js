import { PART_CATEGORIES, itemHpAtLevel } from "./parts";

export const INCOME_DIVISOR = 6.5e8; // tunes how much Hash Power (HP) converts to AETHER/sec (OFFLINE/local-save mode only — see note below)

export const AETHER_MAX_SUPPLY = 100_000_000;

/* =========================================================
   TOKENOMICS (mirrors backend/supabase/migrations/0005_block_reward_tokenomics.sql
   — that SQL is the actual source of truth whenever the backend is online;
   these constants exist so the client's UI/copy and the OFFLINE fallback
   below stay honest about the same numbers).

     MAX_SUPPLY            = 100,000,000 AETHER
     BLOCK_TIME             = 60 seconds        (1 "block" = 1 minute)
     INITIAL_BLOCK_REWARD   = 500 AETHER/block  (epoch 0, network-wide)
     HALVING_INTERVAL       = 100,000 blocks    (~69 days / ~2.3 months
                               at the reference hashrate below)
     GHOST_HASHRATE          = 20 TH/s           ("network difficulty
                               floor" — always padded into the active-
                               hashrate denominator server-side so a lone
                               small-hashrate player can't auto-claim the
                               entire fixed block reward just by being
                               the only one online; see the SQL migration
                               header for the full explanation)

   500 AETHER/block / 60s = 8.3333.. AETHER/sec at epoch 0, halving every
   100,000 blocks (500 -> 250 -> 125 -> ...). Like Bitcoin, summing every
   halving era (reward * interval * 2) totals exactly MAX_SUPPLY, so
   supply asymptotically approaches but never exceeds 100M.
   ========================================================= */
export const BLOCK_TIME_SECONDS = 60;
export const INITIAL_BLOCK_REWARD = 500; // AETHER/block, network-wide, epoch 0
export const HALVING_INTERVAL_BLOCKS = 100_000;
export const GHOST_HASHRATE = 20e12; // 20 TH/s reference/"difficulty floor"

// how many halvings have occurred by the time `totalMined` AETHER has been mined

export function miningHalvingEpoch(totalMined) {
  if (totalMined >= AETHER_MAX_SUPPLY - 1) return 64; // effectively exhausted, rate ~0
  const fractionRemaining = 1 - totalMined / AETHER_MAX_SUPPLY;
  return Math.max(0, Math.floor(-Math.log2(fractionRemaining)));
}

// mining rate multiplier for the current epoch: 1, 0.5, 0.25, 0.125, ... never quite reaches 0

export function miningHalvingMultiplier(totalMined) {
  return Math.pow(0.5, miningHalvingEpoch(totalMined));
}

export function calcPlayerLevel(totalEarned) {
  const BASE = 500;
  const GROWTH = 1.4;
  let level = 1;
  let cumulative = 0;
  let reqForNext = BASE;
  while (cumulative + reqForNext <= totalEarned && level < 999) {
    cumulative += reqForNext;
    level += 1;
    reqForNext = Math.round(BASE * Math.pow(GROWTH, level - 1));
  }
  const intoLevel = Math.max(0, totalEarned - cumulative);
  const progressPct = Math.min(100, (intoLevel / reqForNext) * 100);
  return { level, intoLevel, reqForNext, progressPct };
}

export function calcHashrate(ownedItems) {
  let total = 0;
  for (const cat of PART_CATEGORIES) {
    if (cat.statType !== "hashrate") continue; // GPU + Rack only — see statType per category in data/parts.js
    for (const item of cat.items) {
      const lvl = ownedItems[item.id] || 0;
      if (lvl > 0) total += itemHpAtLevel(item, lvl);
    }
  }
  return total;
}

// Processor no longer adds flat hashrate — it's a % multiplier applied on
// top of GPU+Rack hashrate (see calcHashrate). Returns e.g. 0.35 for +35%.
export function calcHashrateMultiplier(ownedItems) {
  let total = 0;
  for (const cat of PART_CATEGORIES) {
    if (cat.statType !== "hashrateMult") continue;
    for (const item of cat.items) {
      const lvl = ownedItems[item.id] || 0;
      if (lvl > 0) total += itemHpAtLevel(item, lvl);
    }
  }
  return total;
}

// Battery's role: extend how many hours of AETHER can accumulate before
// hitting the claim cap. Returns bonus HOURS on top of the base cap.
export function calcPendingCapBonusHours(ownedItems) {
  let total = 0;
  for (const cat of PART_CATEGORIES) {
    if (cat.statType !== "pendingCap") continue;
    for (const item of cat.items) {
      const lvl = ownedItems[item.id] || 0;
      if (lvl > 0) total += itemHpAtLevel(item, lvl);
    }
  }
  return total;
}

// Drone's role: % bonus applied to non-mining AETHER (Missions, Events,
// Guild, Daily Streak, Loot Box) — NOT passive mining itself.
export function calcIncomeBonusPct(ownedItems) {
  let total = 0;
  for (const cat of PART_CATEGORIES) {
    if (cat.statType !== "incomeBonus") continue;
    for (const item of cat.items) {
      const lvl = ownedItems[item.id] || 0;
      if (lvl > 0) total += itemHpAtLevel(item, lvl);
    }
  }
  return total;
}

/* =========================================================
   OVERHEAT SYSTEM — GPU + Processor generate heat, Cooling
   parts dissipate it. Running too hot throttles hashrate.
   ========================================================= */

// GPU + Processor hp runs roughly 10x higher than Cooling hp at matching
// tiers (that's how the parts are priced/balanced), so Cooling's effective
// capacity needs this multiplier for a matched-tier loadout to run safely.

export const COOLING_EFFICIENCY = 10;

export function calcCategoryHp(ownedItems, categoryKey) {
  const cat = PART_CATEGORIES.find((c) => c.key === categoryKey);
  if (!cat) return 0;
  let total = 0;
  for (const item of cat.items) {
    const lvl = ownedItems[item.id] || 0;
    if (lvl > 0) total += itemHpAtLevel(item, lvl);
  }
  return total;
}

// Only GPUs generate heat now (Rack is structural, doesn't run hot itself —
// see generatesHeat per category in data/parts.js)
export function calcHeatGen(ownedItems) {
  return calcCategoryHp(ownedItems, "gpu");
}

export function calcCoolingCapacity(ownedItems) {
  return calcCategoryHp(ownedItems, "cooling");
}
