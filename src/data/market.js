import { BatteryIcon, CoolingIcon, DroneIcon, RackIcon } from "../components/icons/CustomIcons";
import { inventoryCatalog } from "./inventory";

export const marketCatalog = [
  { id: 1, name: "RTX CORE X9", rarity: "Epic", price: 15000, stock: 24, hpBonus: 120e6, icon: RackIcon, iconColor: "#c084fc", desc: "A limited-run overclocked rack module built for serious hashrate gains." },
  { id: 2, name: "Cooling System XL", rarity: "Rare", price: 3250, stock: 18, hpBonus: 25e6, icon: CoolingIcon, iconColor: "#38bdf8", desc: "An oversized cooling unit that squeezes extra stable performance out of any rig." },
  { id: 3, name: "Energy Battery", rarity: "Rare", price: 2150, stock: 32, hpBonus: 18e6, icon: BatteryIcon, iconColor: "#38bdf8", desc: "A specialty battery pack offering a small but permanent power boost." },
  { id: 4, name: "Mining Drone Mk.1", rarity: "Epic", price: 6500, stock: 7, hpBonus: 55e6, icon: DroneIcon, iconColor: "#c084fc", desc: "A rare drone model, hand-tuned for maximum mining assistance." },
];

export const rarityStyles = {
  Epic: "text-fuchsia-400",
  Rare: "text-sky-400",
};

export const MARKET_FEE_RATE = 0.05;

export const AUTO_CLAIM_COST = 30000;

export const AUTO_SELL_CAP = 50;

export const TRADE_BASE_PRICES = {
  "Mining Drone": 900,
  "Cooling Core": 650,
  "Power Cell": 500,
  "Storage Unit": 300,
  "Core Crystal": 1800,
  "Fuel Barrel": 250,
  "Metal Ingot": 150,
  "Metal Plate": 220,
  "Nano Alloy": 1200,
  "Quantum Alloy": 4500,
  "Carbon Fiber": 400,
};

export const TRADE_ITEM_POOL = inventoryCatalog
  .filter((i) => i.type !== "rig")
  .map((i) => ({ name: i.name, icon: i.icon, iconColor: i.iconColor, type: i.type, desc: i.desc, basePrice: TRADE_BASE_PRICES[i.name] || 300 }));

export const BOT_SELLER_NAMES = ["ZeroCool", "Nyx_Miner", "Kappa88", "GhostRig", "BlokAtomic", "IronCore", "Vexen", "Miru", "Skyfall", "RustyByte", "Pixe1", "Overclockd"];

export function randomListingPrice(basePrice) {
  const factor = 0.85 + Math.random() * 0.4; // 0.85x - 1.25x
  return Math.max(10, Math.round((basePrice * factor) / 10) * 10);
}

export function makeBotListing() {
  const poolItem = TRADE_ITEM_POOL[Math.floor(Math.random() * TRADE_ITEM_POOL.length)];
  const seller = BOT_SELLER_NAMES[Math.floor(Math.random() * BOT_SELLER_NAMES.length)];
  return {
    id: `bot-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    seller,
    name: poolItem.name,
    icon: poolItem.icon,
    iconColor: poolItem.iconColor,
    type: poolItem.type,
    price: randomListingPrice(poolItem.basePrice),
  };
}

export function makeBotListings(count) {
  return Array.from({ length: count }, () => makeBotListing());
}
