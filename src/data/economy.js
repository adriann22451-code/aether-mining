import { PART_CATEGORIES, itemHpAtLevel } from "./parts";

export const INCOME_DIVISOR = 6.5e8; // tunes how much Hash Power (HP) converts to AETHER/sec

export const AETHER_MAX_SUPPLY = 100_000_000;

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

export function calcHeatGen(ownedItems) {
  return calcCategoryHp(ownedItems, "gpu") + calcCategoryHp(ownedItems, "processor");
}

export function calcCoolingCapacity(ownedItems) {
  return calcCategoryHp(ownedItems, "cooling");
}
