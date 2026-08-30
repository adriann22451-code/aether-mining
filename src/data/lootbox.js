import { TRADE_ITEM_POOL } from "./market";
import { PART_CATEGORIES } from "./parts";

export const LOOTBOX_COST = 500;

// Rebalanced so the AETHER-only expected value sits well BELOW the cost —
// a gacha system that pays out MORE AETHER on average than it costs just
// prints money forever, which is exactly what was draining the Treasury
// pool (see migration 0008_lootbox_treasury.sql, which now pays AETHER
// wins out of that same pool, capped by whatever's actually banked in it).
// Old EV was ~681 AETHER vs a 500 cost (+36%). New EV is ~198 AETHER vs
// 500 (-60%) — materials/parts make up the rest of a win's value instead.
export const LOOTBOX_REWARDS = [
  { weight: 40, type: "aether", label: "AETHER", min: 60, max: 220 },
  { weight: 15, type: "aether", label: "AETHER", min: 250, max: 600 },
  { weight: 20, type: "material", pool: ["Metal Ingot", "Metal Plate", "Storage Unit", "Fuel Barrel"], min: 3, max: 8 },
  { weight: 12, type: "material", pool: ["Nano Alloy", "Core Crystal", "Carbon Fiber"], min: 1, max: 3 },
  { weight: 5, type: "material", pool: ["Quantum Alloy"], min: 1, max: 2 },
  { weight: 3, type: "aether", label: "JACKPOT AETHER", min: 2000, max: 4000 },
  { weight: 5, type: "part" },
];

// Standard-gacha rarity weighting for the "part" slot above — Common +
// Uncommon combined ~70%, Rare ~20%, Epic ~8%, Legendary ~2%. Picking a
// RARITY TIER first (then a random unowned item within it) instead of
// picking uniformly across all unowned items — otherwise a new player
// with only the 6 starter Commons already owned had a >54% chance of
// their very first "part" win being Rare or better, which defeats the
// point of rarity meaning anything.
const PART_RARITY_WEIGHTS = { Common: 35, Uncommon: 35, Rare: 20, Epic: 8, Legendary: 2 };

function pickWeightedUnownedPart(unowned) {
  // group by rarity, drop any rarity with nothing left unowned, renormalize
  const byRarity = {};
  unowned.forEach((u) => {
    const r = u.item.rarity;
    (byRarity[r] ||= []).push(u);
  });
  const availableRarities = Object.keys(byRarity).filter((r) => PART_RARITY_WEIGHTS[r]);
  const totalWeight = availableRarities.reduce((s, r) => s + PART_RARITY_WEIGHTS[r], 0);
  let roll = Math.random() * totalWeight;
  let chosenRarity = availableRarities[0];
  for (const r of availableRarities) {
    if (roll < PART_RARITY_WEIGHTS[r]) { chosenRarity = r; break; }
    roll -= PART_RARITY_WEIGHTS[r];
  }
  const pool = byRarity[chosenRarity];
  return pool[Math.floor(Math.random() * pool.length)];
}

export function rollLootbox(ownedItems) {
  const totalWeight = LOOTBOX_REWARDS.reduce((s, r) => s + r.weight, 0);
  let roll = Math.random() * totalWeight;
  let chosen = LOOTBOX_REWARDS[0];
  for (const r of LOOTBOX_REWARDS) {
    if (roll < r.weight) {
      chosen = r;
      break;
    }
    roll -= r.weight;
  }

  if (chosen.type === "aether") {
    const amount = Math.round((chosen.min + Math.random() * (chosen.max - chosen.min)) / 10) * 10;
    return { type: "aether", amount, label: chosen.label };
  }
  if (chosen.type === "material") {
    const name = chosen.pool[Math.floor(Math.random() * chosen.pool.length)];
    const qty = Math.round(chosen.min + Math.random() * (chosen.max - chosen.min));
    const poolItem = TRADE_ITEM_POOL.find((p) => p.name === name);
    return { type: "material", name, qty, icon: poolItem?.icon, image: poolItem?.image, iconColor: poolItem?.iconColor };
  }
  // type === "part": pick a random currently-unowned part
  const unowned = [];
  PART_CATEGORIES.forEach((cat) => cat.items.forEach((item) => {
    if (!(ownedItems[item.id] > 0)) unowned.push({ item, cat });
  }));
  if (unowned.length === 0) {
    return { type: "aether", amount: 400, label: "AETHER (bonus)" };
  }
  const pick = pickWeightedUnownedPart(unowned);
  return { type: "part", item: pick.item, category: pick.cat };
}
