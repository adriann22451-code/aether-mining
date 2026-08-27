import {
  Server,
} from "lucide-react";
import { BatteryIcon, CoolingIcon, DroneIcon, GpuIcon, ProcessorIcon, RackIcon } from "../components/icons/CustomIcons";
import CARRIER_DRONE_IMG from "../assets/images/carrier-drone.png";
import DUAL_FAN_COOLER_IMG from "../assets/images/dual-fan-cooler.png";
import QUANTUM_COOLING_IMG from "../assets/images/quantum-cooling.png";
import GTX1660_IMG from "../assets/images/gtx1660.png";
import RTX3060_IMG from "../assets/images/rtx3060.png";
import RTX4060_IMG from "../assets/images/rtx4060.png";
import RTX4090_IMG from "../assets/images/rtx4090.png";
import RTX5090_IMG from "../assets/images/rtx5090.png";

export const RARITY_COLORS = {
  Common: "#94a3b8",
  Uncommon: "#22c55e",
  Rare: "#38bdf8",
  Epic: "#c084fc",
  Legendary: "#facc15",
};

export const PART_CATEGORIES = [
  {
    key: "gpu",
    label: "GPU",
    icon: GpuIcon,
    color: "#38bdf8",
    statType: "hashrate", // raw hashrate — the core mining muscle
    generatesHeat: true,
    items: [
      { id: "gpu_0", name: "GTX 1660", hp: 40e6, buyCost: 0, image: GTX1660_IMG, rarity: "Common", desc: "A budget graphics card, reliable enough to get your first rig hashing." },
      { id: "gpu_1", name: "RTX 3060", hp: 180e6, buyCost: 2000, image: RTX3060_IMG, rarity: "Uncommon", desc: "A solid mid-range GPU with a big step up in hashrate over the basics." },
      { id: "gpu_2", name: "RTX 4060", hp: 750e6, buyCost: 9000, image: RTX4060_IMG, rarity: "Rare", desc: "A newer-gen card with improved efficiency and serious mining muscle." },
      { id: "gpu_3", name: "RTX 4090", hp: 3200e6, buyCost: 42000, image: RTX4090_IMG, rarity: "Epic", desc: "A flagship-class GPU that dominates any rig it's installed in." },
      { id: "gpu_4", name: "RTX 5090", hp: 14000e6, buyCost: 190000, image: RTX5090_IMG, rarity: "Legendary", desc: "The pinnacle of consumer GPU tech — sheer raw hashing power." },
    ],
  },
  {
    key: "rack",
    label: "Server Rack",
    icon: RackIcon,
    color: "#a78bfa",
    statType: "hashrate", // more/better racks = more GPUs housed = more raw hashrate
    generatesHeat: false,
    items: [
      { id: "rack_0", name: "Starter Rack", hp: 10e6, buyCost: 0, rarity: "Common", desc: "A simple frame to mount your first few GPUs." },
      { id: "rack_1", name: "Basic Rack", hp: 45e6, buyCost: 1500, rarity: "Uncommon", desc: "A sturdier rack with room for more hardware and better airflow." },
      { id: "rack_2", name: "Pro Rack", hp: 190e6, buyCost: 7000, rarity: "Rare", desc: "An industrial-grade rack built for dense, high-uptime setups." },
      { id: "rack_3", name: "Hyper Rack", hp: 800e6, buyCost: 32000, rarity: "Epic", desc: "A reinforced rack engineered to house serious mining hardware." },
      { id: "rack_4", name: "Quantum Rack", hp: 3400e6, buyCost: 150000, rarity: "Legendary", desc: "An advanced rack architecture that maximizes every watt of power." },
    ],
  },
  {
    key: "cooling",
    label: "Cooling",
    icon: CoolingIcon,
    color: "#38bdf8",
    statType: "cooling", // NOT hashrate anymore — purely manages heat, see calcCoolingCapacity
    generatesHeat: false,
    items: [
      { id: "cooling_0", name: "Air Cooler", hp: 5e6, buyCost: 0, rarity: "Common", desc: "A basic fan setup to keep temperatures from spiking too fast." },
      { id: "cooling_1", name: "Dual Fan Cooler", hp: 22e6, buyCost: 1200, rarity: "Uncommon", image: DUAL_FAN_COOLER_IMG, desc: "Twin fans working together for noticeably better heat control." },
      { id: "cooling_2", name: "Liquid Cooling", hp: 95e6, buyCost: 5500, rarity: "Rare", desc: "A closed-loop liquid system that keeps hot rigs running smoothly." },
      { id: "cooling_3", name: "Cryo Cooling", hp: 400e6, buyCost: 26000, rarity: "Epic", desc: "Sub-zero cooling tech that lets hardware push far past normal limits." },
      { id: "cooling_4", name: "Quantum Cooling", hp: 1700e6, buyCost: 120000, rarity: "Legendary", image: QUANTUM_COOLING_IMG, desc: "Experimental cooling that keeps even the hottest rigs ice-cold." },
    ],
  },
  {
    key: "battery",
    label: "Battery",
    icon: BatteryIcon,
    color: "#facc15",
    statType: "pendingCap", // NOT hashrate — extends how many hours of AETHER can pile up before you hit the claim cap
    generatesHeat: false,
    items: [
      { id: "battery_0", name: "Lithium Battery", hp: 0.25, buyCost: 0, rarity: "Common", desc: "A standard battery pack — stores a bit of extra unclaimed AETHER before you hit the cap." },
      { id: "battery_1", name: "Power Cell", hp: 0.75, buyCost: 1200, rarity: "Uncommon", desc: "A higher-capacity cell that lets AETHER pile up longer between claims." },
      { id: "battery_2", name: "Energy Core", hp: 2, buyCost: 5500, rarity: "Rare", desc: "A dense energy core that meaningfully raises your claim cap." },
      { id: "battery_3", name: "Fusion Battery", hp: 5, buyCost: 26000, rarity: "Epic", desc: "Cutting-edge fusion tech — go most of a day without claiming and lose nothing." },
      { id: "battery_4", name: "Quantum Battery", hp: 12, buyCost: 120000, rarity: "Legendary", desc: "Near-limitless power density — the claim cap barely matters anymore." },
    ],
  },
  {
    key: "processor",
    label: "Processor",
    icon: ProcessorIcon,
    color: "#22d3ee",
    statType: "hashrateMult", // NOT flat hashrate — a % multiplier applied on top of your GPU+Rack hashrate
    generatesHeat: false,
    items: [
      { id: "processor_0", name: "Basic Processor", hp: 0.05, buyCost: 0, rarity: "Common", desc: "An entry-level chip that squeezes a little more out of your GPUs." },
      { id: "processor_1", name: "AI Processor", hp: 0.12, buyCost: 1800, rarity: "Uncommon", desc: "A smarter chip that optimizes workloads on the fly." },
      { id: "processor_2", name: "Quantum Chip", hp: 0.25, buyCost: 8200, rarity: "Rare", desc: "A chip leveraging early quantum techniques for faster processing." },
      { id: "processor_3", name: "Neural Core", hp: 0.45, buyCost: 38000, rarity: "Epic", desc: "A neural-network-driven core that adapts to squeeze out more hashrate." },
      { id: "processor_4", name: "Genesis Processor", hp: 0.80, buyCost: 175000, rarity: "Legendary", desc: "The most advanced processor ever built — nearly doubles your GPU+Rack output." },
    ],
  },
  {
    key: "drone",
    label: "Drone",
    icon: DroneIcon,
    color: "#c084fc",
    statType: "incomeBonus", // NOT hashrate — boosts AETHER from Missions/Events/Guild/Daily/Loot Box (not passive mining itself)
    generatesHeat: false,
    items: [
      { id: "drone_0", name: "Worker Drone", hp: 0.03, buyCost: 0, rarity: "Common", desc: "A small automated helper that hauls in a little extra from every reward." },
      { id: "drone_1", name: "Carrier Drone", hp: 0.15, buyCost: 4000, rarity: "Rare", image: CARRIER_DRONE_IMG, desc: "A sturdier drone that noticeably boosts Missions, Events, Guild, and Loot Box payouts." },
      { id: "drone_2", name: "Quantum Drone", hp: 0.40, buyCost: 60000, rarity: "Legendary", desc: "An elite drone fleet that dramatically boosts every reward except passive mining." },
    ],
  },
];

export const MAX_LEVEL = 50;

export const LEVEL_HP_GROWTH = 1.06; // +6% hashrate per level

export const LEVEL_COST_GROWTH = 1.16; // +16% cost per level (was 1.12 — higher levels now cost noticeably more relative to the hashrate they give, so over-leveling one part stops being the obviously-best move)

export const LEVEL_COST_BASE_RATIO = 0.08; // initial level-up cost = base * this ratio

// Generic level-scaling curve — used for every category's stat now, not
// just raw hashrate (see PART_CATEGORIES statType above for what the
// number actually represents per category).
export function itemHpAtLevel(item, level) {
  if (level <= 0) return 0;
  return item.hp * Math.pow(LEVEL_HP_GROWTH, level - 1);
}

export function itemLevelUpCost(item, level) {
  const base = Math.max(item.buyCost, 500) * LEVEL_COST_BASE_RATIO;
  return Math.ceil(base * Math.pow(LEVEL_COST_GROWTH, level - 1));
}

export function findPartItem(itemId) {
  for (const cat of PART_CATEGORIES) {
    const item = cat.items.find((i) => i.id === itemId);
    if (item) return { item, category: cat };
  }
  return null;
}
