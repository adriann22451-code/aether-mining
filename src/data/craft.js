import { getInventoryQty } from "./inventory";

// Craft = the ONLY way (besides Shop, for tier 0/1) to obtain a part you
// don't already own yet. It is NOT an upgrade path — once a part exists in
// ownedItems (level > 0), that part can only gain levels via Upgrade
// (Inventory screen), never via craft again. See isRecipeOwned().
export const CRAFT_RECIPES = [
  // --- Rare tier ---
  { id: "craft_cooling2", targetId: "cooling_2", materials: [{ name: "Metal Plate", qty: 4 }, { name: "Nano Alloy", qty: 2 }], aetherCost: 500 },
  { id: "craft_battery2", targetId: "battery_2", materials: [{ name: "Metal Ingot", qty: 3 }, { name: "Core Crystal", qty: 2 }], aetherCost: 500 },
  { id: "craft_processor2", targetId: "processor_2", materials: [{ name: "Nano Alloy", qty: 3 }, { name: "Core Crystal", qty: 2 }], aetherCost: 800 },
  { id: "craft_rack2", targetId: "rack_2", materials: [{ name: "Metal Ingot", qty: 5 }, { name: "Carbon Fiber", qty: 3 }], aetherCost: 700 },
  { id: "craft_gpu2", targetId: "gpu_2", materials: [{ name: "Nano Alloy", qty: 4 }, { name: "Quantum Alloy", qty: 2 }], aetherCost: 4000 },
  { id: "craft_drone1", targetId: "drone_1", materials: [{ name: "Metal Ingot", qty: 3 }, { name: "Nano Alloy", qty: 2 }], aetherCost: 400 },

  // --- Epic tier ---
  { id: "craft_cooling3", targetId: "cooling_3", materials: [{ name: "Quantum Alloy", qty: 3 }, { name: "Carbon Fiber", qty: 5 }], aetherCost: 12000 },
  { id: "craft_battery3", targetId: "battery_3", materials: [{ name: "Quantum Alloy", qty: 3 }, { name: "Core Crystal", qty: 3 }], aetherCost: 12000 },
  { id: "craft_processor3", targetId: "processor_3", materials: [{ name: "Quantum Alloy", qty: 3 }, { name: "Core Crystal", qty: 4 }], aetherCost: 17500 },
  { id: "craft_rack3", targetId: "rack_3", materials: [{ name: "Quantum Alloy", qty: 2 }, { name: "Carbon Fiber", qty: 6 }], aetherCost: 15000 },
  { id: "craft_gpu3", targetId: "gpu_3", materials: [{ name: "Nano Alloy", qty: 5 }, { name: "Quantum Alloy", qty: 3 }], aetherCost: 20000 },

  // --- Legendary tier ---
  { id: "craft_cooling4", targetId: "cooling_4", materials: [{ name: "Quantum Alloy", qty: 6 }, { name: "Carbon Fiber", qty: 6 }], aetherCost: 65000 },
  { id: "craft_battery4", targetId: "battery_4", materials: [{ name: "Quantum Alloy", qty: 6 }, { name: "Core Crystal", qty: 6 }], aetherCost: 65000 },
  { id: "craft_processor4", targetId: "processor_4", materials: [{ name: "Quantum Alloy", qty: 7 }, { name: "Core Crystal", qty: 6 }], aetherCost: 95000 },
  { id: "craft_rack4", targetId: "rack_4", materials: [{ name: "Quantum Alloy", qty: 6 }, { name: "Carbon Fiber", qty: 8 }], aetherCost: 80000 },
  { id: "craft_gpu4", targetId: "gpu_4", materials: [{ name: "Quantum Alloy", qty: 8 }, { name: "Core Crystal", qty: 5 }], aetherCost: 110000 },
  { id: "craft_drone2", targetId: "drone_2", materials: [{ name: "Quantum Alloy", qty: 5 }, { name: "Core Crystal", qty: 4 }], aetherCost: 32000 },
];

// A part can only ever be crafted once — after that it's owned, and any
// further growth for it goes through Upgrade (Inventory), not Craft again.
export function isRecipeOwned(recipe, ownedItems) {
  return (ownedItems?.[recipe.targetId] || 0) > 0;
}

export function canCraftRecipe(recipe, inventory, core, ownedItems) {
  if (isRecipeOwned(recipe, ownedItems)) return false;
  if (core < recipe.aetherCost) return false;
  return recipe.materials.every((m) => getInventoryQty(inventory, m.name) >= m.qty);
}
