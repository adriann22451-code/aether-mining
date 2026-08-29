import { BatteryIcon, CarbonFiberIcon, CoolingIcon, CoreCrystalIcon, DroneIcon, FuelBarrelIcon, MetalIngotIcon, MetalPlateIcon, NanoAlloyIcon, QuantumAlloyIcon, RackIcon, StorageUnitIcon } from "../components/icons/CustomIcons";
import HYPER_RIG_IMG from "../assets/images/hyper-rig.png";
import STARTER_RIG_IMG from "../assets/images/starter-rig.png";
import MINING_DRONE_ITEM_IMG from "../assets/images/mining-drone-item.png";
import COOLING_CORE_ITEM_IMG from "../assets/images/cooling-core-item.png";
import POWER_CELL_ITEM_IMG from "../assets/images/power-cell-item.png";

export const inventoryCatalog = [
  // initial seed — items bought from the Marketplace are added dynamically here via the `inventory` state
  { id: 1, name: "Hyper Rig", type: "rig", tag: "Lv.10", icon: RackIcon, image: HYPER_RIG_IMG, iconColor: "#c084fc", selected: true, desc: "A high-end server rack with a dense GPU array. Hashrate far above a standard rig, suited for large-scale operations." },
  { id: 2, name: "Starter Rig", type: "rig", tag: "Lv.7", icon: RackIcon, image: STARTER_RIG_IMG, iconColor: "#94a3b8", selected: false, desc: "A basic rig to get mining started. Reliable enough, but its hashrate is limited compared to advanced rigs." },
  { id: 3, name: "Mining Drone", type: "item", tag: "x2", icon: DroneIcon, image: MINING_DRONE_ITEM_IMG, iconColor: "#e2e8f0", selected: false, desc: "An automated drone that helps mining efficiency around the rig. Adds a bit of hashrate without needing much power." },
  { id: 4, name: "Cooling Core", type: "item", tag: "x5", icon: CoolingIcon, image: COOLING_CORE_ITEM_IMG, iconColor: "#38bdf8", selected: false, desc: "A liquid-based cooling module that keeps rig temperature stable under heavy workloads." },
  { id: 5, name: "Power Cell", type: "item", tag: "x8", icon: BatteryIcon, image: POWER_CELL_ITEM_IMG, iconColor: "#facc15", selected: false, desc: "A high-voltage energy cell that supplies extra power to rigs and drones." },
  { id: 6, name: "Storage Unit", type: "material", tag: "x12", icon: StorageUnitIcon, iconColor: "#94a3b8", selected: false, desc: "A data storage unit for mining output. Needed to upgrade warehouse capacity." },
  { id: 7, name: "Core Crystal", type: "material", tag: "x35", icon: CoreCrystalIcon, iconColor: "#38bdf8", selected: false, desc: "A rare energy crystal produced from advanced mining processes. A key ingredient for high-tier upgrades." },
  { id: 8, name: "Fuel Barrel", type: "material", tag: "x18", icon: FuelBarrelIcon, iconColor: "#f59e0b", selected: false, desc: "Backup fuel to keep rigs and generators running without interruption." },
  { id: 9, name: "Metal Ingot", type: "material", tag: "x42", icon: MetalIngotIcon, iconColor: "#cbd5e1", selected: false, desc: "A refined metal bar, the base material for building and reinforcing rigs." },
  { id: 10, name: "Metal Plate", type: "material", tag: "x27", icon: MetalPlateIcon, iconColor: "#93c5fd", selected: false, desc: "A protective metal plate for rig casing, adding heat durability." },
  { id: 11, name: "Nano Alloy", type: "material", tag: "x9", icon: NanoAlloyIcon, iconColor: "#818cf8", selected: false, desc: "A nano-scale metal alloy with high conductivity, used for precision chip components." },
  { id: 12, name: "Quantum Alloy", type: "material", tag: "x4", icon: QuantumAlloyIcon, iconColor: "#a78bfa", selected: false, desc: "An exotic material engineered through quantum processes. Extremely rare, used for the highest-tier upgrades." },
  { id: 13, name: "Carbon Fiber", type: "material", tag: "x30", icon: CarbonFiberIcon, iconColor: "#7dd3fc", selected: false, desc: "Carbon fiber that's light yet strong, used to cut casing weight without sacrificing strength." },
];

export function bumpInventoryTag(tag) {
  const n = parseInt(String(tag).replace(/[^0-9]/g, ""), 10);
  if (Number.isNaN(n)) return "x1";
  return `x${n + 1}`;
}

export function parseInventoryQty(tag) {
  const n = parseInt(String(tag).replace(/[^0-9]/g, ""), 10);
  return Number.isNaN(n) ? 0 : n;
}

export function getInventoryQty(inventory, name) {
  const found = inventory.find((it) => it.name === name && it.type !== "rig");
  return found ? parseInventoryQty(found.tag) : 0;
}
