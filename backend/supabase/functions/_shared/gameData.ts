// _shared/gameData.ts
//
// Mirrors the constants/formulas from the client's app.jsx that affect
// AETHER income. The server NEVER trusts a client-reported hashrate or
// pending amount — it recomputes everything here from `owned_items`,
// which is itself only ever changed by Edge Functions. Keep this file in
// sync with PART_CATEGORIES / SITES / the income formulas in app.jsx if
// those ever change.

export const MAX_LEVEL = 50;
export const LEVEL_HP_GROWTH = 1.06;
export const LEVEL_COST_GROWTH = 1.12;
export const LEVEL_COST_BASE_RATIO = 0.08;

export const INCOME_DIVISOR = 5e8;
export const AETHER_MAX_SUPPLY = 100_000_000;
export const PENDING_CAP_HOURS = 6;

// NOTE (migration 0004+): INCOME_DIVISOR/AETHER_MAX_SUPPLY/miningHalving*
// below describe the OLD per-player-supply model and are no longer what
// actually decides claim payouts. sync-player.ts's "claim" action now
// calls the `claim_mining_reward` Postgres function, which implements the
// shared-pool/difficulty-split math directly in SQL (see
// supabase/migrations/0004_global_supply.sql). Nothing in this codebase
// currently imports the exports below except calcHashrate() itself —
// they're kept only so old callers/docs referencing them don't break.

// id -> { hp, buyCost, category }. category is only used for the heat system.
//
// Rebalance: only GPU + Rack contribute hashrate directly now. Processor is
// a % MULTIPLIER on top of GPU+Rack (its `hp` here is a fraction, e.g. 0.25
// = +25%), applied in calcHashrate below. Cooling/Battery/Drone don't
// affect hashrate at all (heat management, claim-cap bonus, and bonus
// reward income respectively — all client-side only), so they're excluded
// from calcHashrate's sum entirely. Keep this in sync with
// PART_CATEGORIES/statType in the client's src/data/parts.js.
export const PART_HP: Record<string, { hp: number; buyCost: number; category: "gpu" | "rack" | "cooling" | "battery" | "processor" | "drone" }> = {
  gpu_0: { hp: 40e6, buyCost: 0, category: "gpu" },
  gpu_1: { hp: 180e6, buyCost: 2000, category: "gpu" },
  gpu_2: { hp: 750e6, buyCost: 9000, category: "gpu" },
  gpu_3: { hp: 3200e6, buyCost: 42000, category: "gpu" },
  gpu_4: { hp: 14000e6, buyCost: 190000, category: "gpu" },

  rack_0: { hp: 10e6, buyCost: 0, category: "rack" },
  rack_1: { hp: 45e6, buyCost: 1500, category: "rack" },
  rack_2: { hp: 190e6, buyCost: 7000, category: "rack" },
  rack_3: { hp: 800e6, buyCost: 32000, category: "rack" },
  rack_4: { hp: 3400e6, buyCost: 150000, category: "rack" },

  cooling_0: { hp: 5e6, buyCost: 0, category: "cooling" },
  cooling_1: { hp: 22e6, buyCost: 1200, category: "cooling" },
  cooling_2: { hp: 95e6, buyCost: 5500, category: "cooling" },
  cooling_3: { hp: 400e6, buyCost: 26000, category: "cooling" },
  cooling_4: { hp: 1700e6, buyCost: 120000, category: "cooling" },

  battery_0: { hp: 0.25, buyCost: 0, category: "battery" },
  battery_1: { hp: 0.75, buyCost: 1200, category: "battery" },
  battery_2: { hp: 2, buyCost: 5500, category: "battery" },
  battery_3: { hp: 5, buyCost: 26000, category: "battery" },
  battery_4: { hp: 12, buyCost: 120000, category: "battery" },

  processor_0: { hp: 0.05, buyCost: 0, category: "processor" },
  processor_1: { hp: 0.12, buyCost: 1800, category: "processor" },
  processor_2: { hp: 0.25, buyCost: 8200, category: "processor" },
  processor_3: { hp: 0.45, buyCost: 38000, category: "processor" },
  processor_4: { hp: 0.80, buyCost: 175000, category: "processor" },

  drone_0: { hp: 0.03, buyCost: 0, category: "drone" },
  drone_1: { hp: 0.15, buyCost: 4000, category: "drone" },
  drone_2: { hp: 0.40, buyCost: 60000, category: "drone" },
};

export const SITE_BONUS: number[] = [1.0, 1.15, 1.3, 1.5, 1.75, 2.0, 2.35, 2.75, 3.25, 3.9, 5.0];
export const SITE_COST: number[] = [0, 3000, 10000, 30000, 80000, 180000, 350000, 650000, 1100000, 1800000, 3000000];

export function itemHpAtLevel(baseHp: number, level: number): number {
  if (level <= 0) return 0;
  return baseHp * Math.pow(LEVEL_HP_GROWTH, level - 1);
}

export function itemLevelUpCost(buyCost: number, level: number): number {
  const base = Math.max(buyCost, 500) * LEVEL_COST_BASE_RATIO;
  return Math.ceil(base * Math.pow(LEVEL_COST_GROWTH, level - 1));
}

export function calcHashrate(ownedItems: Record<string, number>): number {
  let total = 0;
  let multBonus = 0;
  for (const [id, level] of Object.entries(ownedItems || {})) {
    const part = PART_HP[id];
    if (!part || level <= 0) continue;
    if (part.category === "gpu" || part.category === "rack") {
      total += itemHpAtLevel(part.hp, level);
    } else if (part.category === "processor") {
      multBonus += itemHpAtLevel(part.hp, level);
    }
    // cooling/battery/drone intentionally don't affect hashrate — see note above PART_HP
  }
  return total * (1 + multBonus);
}

export function calcCategoryHp(ownedItems: Record<string, number>, category: string): number {
  let total = 0;
  for (const [id, level] of Object.entries(ownedItems || {})) {
    const part = PART_HP[id];
    if (part && part.category === category && level > 0) total += itemHpAtLevel(part.hp, level);
  }
  return total;
}

export function miningHalvingEpoch(totalMined: number): number {
  if (totalMined >= AETHER_MAX_SUPPLY - 1) return 64;
  const fractionRemaining = 1 - totalMined / AETHER_MAX_SUPPLY;
  return Math.max(0, Math.floor(-Math.log2(fractionRemaining)));
}

export function miningHalvingMultiplier(totalMined: number): number {
  return Math.pow(0.5, miningHalvingEpoch(totalMined));
}
