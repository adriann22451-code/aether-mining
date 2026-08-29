import { TRADE_ITEM_POOL } from "./market";
import { PART_CATEGORIES } from "./parts";

export const LOOTBOX_COST = 500;

export const LOOTBOX_REWARDS = [
  { weight: 35, type: "aether", label: "AETHER", min: 150, max: 600 },
  { weight: 20, type: "aether", label: "AETHER", min: 750, max: 2200 },
  { weight: 20, type: "material", pool: ["Metal Ingot", "Metal Plate", "Storage Unit", "Fuel Barrel"], min: 3, max: 8 },
  { weight: 12, type: "material", pool: ["Nano Alloy", "Core Crystal", "Carbon Fiber"], min: 1, max: 3 },
  { weight: 5, type: "material", pool: ["Quantum Alloy"], min: 1, max: 2 },
  { weight: 3, type: "aether", label: "JACKPOT AETHER", min: 6000, max: 11000 },
  { weight: 5, type: "part" },
];

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
    return { type: "aether", amount: 2000, label: "AETHER (bonus)" };
  }
  const pick = unowned[Math.floor(Math.random() * unowned.length)];
  return { type: "part", item: pick.item, category: pick.cat };
}
