import { getInventoryQty } from "./inventory";

export const CRAFT_RECIPES = [
  { id: "craft_cooling2", targetId: "cooling_2", materials: [{ name: "Metal Plate", qty: 4 }, { name: "Nano Alloy", qty: 2 }], aetherCost: 500 },
  { id: "craft_battery2", targetId: "battery_2", materials: [{ name: "Metal Ingot", qty: 3 }, { name: "Core Crystal", qty: 2 }], aetherCost: 500 },
  { id: "craft_processor2", targetId: "processor_2", materials: [{ name: "Nano Alloy", qty: 3 }, { name: "Core Crystal", qty: 2 }], aetherCost: 800 },
  { id: "craft_rack2", targetId: "rack_2", materials: [{ name: "Metal Ingot", qty: 5 }, { name: "Carbon Fiber", qty: 3 }], aetherCost: 700 },
  { id: "craft_gpu2", targetId: "gpu_2", materials: [{ name: "Nano Alloy", qty: 4 }, { name: "Quantum Alloy", qty: 2 }], aetherCost: 4000 },
  { id: "craft_cooling3", targetId: "cooling_3", materials: [{ name: "Quantum Alloy", qty: 3 }, { name: "Carbon Fiber", qty: 5 }], aetherCost: 12000 },
  { id: "craft_battery3", targetId: "battery_3", materials: [{ name: "Quantum Alloy", qty: 3 }, { name: "Core Crystal", qty: 3 }], aetherCost: 12000 },
];

export function canCraftRecipe(recipe, inventory, core) {
  if (core < recipe.aetherCost) return false;
  return recipe.materials.every((m) => getInventoryQty(inventory, m.name) >= m.qty);
}
