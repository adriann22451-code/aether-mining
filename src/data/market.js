import { BatteryIcon, CoolingIcon, DroneIcon, RackIcon } from "../components/icons/CustomIcons";
import COOLING_SYSTEM_XL_IMG from "../assets/images/cooling-system-xl.png";
import ENERGY_BATTERY_SPECIAL_IMG from "../assets/images/energy-battery-special.png";
import MINING_DRONE_MK1_IMG from "../assets/images/mining-drone-mk1.png";
import RTX_CORE_X9_IMG from "../assets/images/rtx-core-x9.png";
import { inventoryCatalog } from "./inventory";
import { RARITY_COLORS } from "./parts";

// Trade materials/items don't carry an explicit rarity in the inventory
// catalog, so we derive one from the base trade price — gives the P2P
// Marketplace the same rarity-tier visual language (frames, glow) as the
// Shop and Codex screens.
export function materialRarityForPrice(basePrice) {
  if (basePrice >= 2500) return "Legendary";
  if (basePrice >= 1000) return "Epic";
  if (basePrice >= 600) return "Rare";
  if (basePrice >= 300) return "Uncommon";
  return "Common";
}

// Reverse-lookup so items with no explicit rarity (e.g. the starter rigs in
// inventoryCatalog) can still be slotted into a tier — their iconColor was
// already chosen to match one of the rarity colors.
const RARITY_BY_COLOR = Object.fromEntries(Object.entries(RARITY_COLORS).map(([tier, color]) => [color, tier]));

// Single source of truth the Inventory grid + detail modal both use to pick
// a rarity tier for ANY inventory row — rigs, special-shop items, or plain
// trade materials — so every card in the Bag gets the same border/glow
// language as Shop/Market/Codex instead of looking flat.
export function resolveInventoryRarity(item, marketRef) {
  if (marketRef?.rarity) return marketRef.rarity;
  if (TRADE_BASE_PRICES[item.name]) return materialRarityForPrice(TRADE_BASE_PRICES[item.name]);
  const color = item.iconColor || marketRef?.iconColor;
  return RARITY_BY_COLOR[color] || "Common";
}

export const marketCatalog = [
  { id: 1, name: "RTX CORE X9", rarity: "Epic", price: 15000, stock: 24, hpBonus: 120e6, icon: RackIcon, image: RTX_CORE_X9_IMG, iconColor: "#c084fc", desc: "A limited-run overclocked rack module built for serious hashrate gains." },
  { id: 2, name: "Cooling System XL", rarity: "Rare", price: 3250, stock: 18, hpBonus: 25e6, coolingBonus: 45e6, icon: CoolingIcon, image: COOLING_SYSTEM_XL_IMG, iconColor: "#38bdf8", desc: "Adds hashrate AND boosts your Cooling Capacity, so it also helps prevent overheating." },
  { id: 3, name: "Energy Battery", rarity: "Rare", price: 2150, stock: 32, hpBonus: 18e6, pendingCapBonus: 0.75, icon: BatteryIcon, image: ENERGY_BATTERY_SPECIAL_IMG, iconColor: "#38bdf8", desc: "Adds hashrate AND raises your Mining Cap, so unclaimed AETHER can pile up longer." },
  { id: 4, name: "Mining Drone Mk.1", rarity: "Epic", price: 6500, stock: 7, hpBonus: 55e6, incomeBonusPct: 0.20, icon: DroneIcon, image: MINING_DRONE_MK1_IMG, iconColor: "#c084fc", desc: "Adds hashrate AND boosts Missions/Events/Guild/Daily/Loot Box rewards by 20%." },
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
  .map((i) => {
    const basePrice = TRADE_BASE_PRICES[i.name] || 300;
    return { name: i.name, icon: i.icon, image: i.image, iconColor: i.iconColor, type: i.type, desc: i.desc, basePrice, rarity: materialRarityForPrice(basePrice) };
  });

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
    image: poolItem.image,
    iconColor: poolItem.iconColor,
    type: poolItem.type,
    rarity: poolItem.rarity,
    price: randomListingPrice(poolItem.basePrice),
  };
}

export function makeBotListings(count) {
  return Array.from({ length: count }, () => makeBotListing());
}
