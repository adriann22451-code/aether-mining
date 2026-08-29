import {
  Atom,
  Database,
  Factory,
  Flame,
  Home,
  MoonStar,
  SatelliteDish,
  ServerCog,
  Snowflake,
  Sunrise,
  Warehouse,
} from "lucide-react";
import ARCTIC_BG_IMG from "../assets/images/arctic-bg.webp";
import DESERT_BG_IMG from "../assets/images/desert-bg.webp";
import GENESIS_BG_IMG from "../assets/images/genesis-bg.webp";
import INDUSTRIAL_WH_BG_IMG from "../assets/images/industrial-wh-bg.webp";
import LOCAL_DC_BG_IMG from "../assets/images/local-dc-bg.webp";
import LUNAR_BG_IMG from "../assets/images/lunar-bg.webp";
import MEGA_DC_BG_IMG from "../assets/images/mega-dc-bg.webp";
import ORBITAL_BG_IMG from "../assets/images/orbital-bg.webp";
import VOLCANO_BG_IMG from "../assets/images/volcano-bg.webp";
import WAREHOUSE_BG_IMG from "../assets/images/warehouse-bg.webp";

export const SITE_BG_IMAGES = {
  1: WAREHOUSE_BG_IMG,
  2: INDUSTRIAL_WH_BG_IMG,
  3: LOCAL_DC_BG_IMG,
  4: MEGA_DC_BG_IMG,
  5: DESERT_BG_IMG,
  6: VOLCANO_BG_IMG,
  7: ARCTIC_BG_IMG,
  8: LUNAR_BG_IMG,
  9: ORBITAL_BG_IMG,
  10: GENESIS_BG_IMG,
};

export const SITES = [
  {
    id: 0,
    name: "Garage",
    icon: Home,
    cost: 0,
    bonus: 1.0,
    theme: { from: "#3a2a1a", via: "#241a12", to: "#120c08", accent: "#f59e0b" },
    desc: "The starting point of your mining journey.",
  },
  {
    id: 1,
    name: "Small Warehouse",
    icon: Warehouse,
    cost: 3000,
    bonus: 1.15,
    theme: { from: "#1f2937", via: "#161d29", to: "#0c1119", accent: "#94a3b8" },
    desc: "More room for extra rigs.",
  },
  {
    id: 2,
    name: "Industrial Warehouse",
    icon: Factory,
    cost: 10000,
    bonus: 1.3,
    theme: { from: "#14322c", via: "#0e211d", to: "#081411", accent: "#2dd4bf" },
    desc: "Scaling up operations with industrial power.",
  },
  {
    id: 3,
    name: "Local Data Center",
    icon: ServerCog,
    cost: 30000,
    bonus: 1.5,
    theme: { from: "#0f1f3d", via: "#0b1830", to: "#060d1c", accent: "#38bdf8" },
    desc: "Neatly arranged racks, more stable uptime.",
  },
  {
    id: 4,
    name: "Mega Data Center",
    icon: Database,
    cost: 80000,
    bonus: 1.75,
    theme: { from: "#12123a", via: "#0d0d29", to: "#07071a", accent: "#818cf8" },
    desc: "A massive facility with hundreds of rigs running.",
  },
  {
    id: 5,
    name: "Desert Facility",
    icon: Sunrise,
    cost: 180000,
    bonus: 2.0,
    theme: { from: "#4a2c12", via: "#331d0c", to: "#1c0f06", accent: "#fb923c" },
    desc: "Endless solar panels in the middle of the desert.",
  },
  {
    id: 6,
    name: "Volcano Facility",
    icon: Flame,
    cost: 350000,
    bonus: 2.35,
    theme: { from: "#4a1010", via: "#330a0a", to: "#1a0505", accent: "#f87171" },
    desc: "Geothermal energy from an active volcano.",
  },
  {
    id: 7,
    name: "Arctic Facility",
    icon: Snowflake,
    cost: 650000,
    bonus: 2.75,
    theme: { from: "#0e2a3a", via: "#0a1e2b", to: "#05121c", accent: "#7dd3fc" },
    desc: "Extreme cold acts as a giant natural cooler.",
  },
  {
    id: 8,
    name: "Lunar Base",
    icon: MoonStar,
    cost: 1100000,
    bonus: 3.25,
    theme: { from: "#22242c", via: "#181a20", to: "#0d0e12", accent: "#cbd5e1" },
    desc: "The first mining operation beyond Earth.",
  },
  {
    id: 9,
    name: "Orbital Station",
    icon: SatelliteDish,
    cost: 1800000,
    bonus: 3.9,
    theme: { from: "#1e1040", via: "#150b2e", to: "#0a061a", accent: "#c084fc" },
    desc: "An orbiting station powered entirely by solar energy.",
  },
  {
    id: 10,
    name: "Genesis Core",
    icon: Atom,
    cost: 3000000,
    bonus: 5.0,
    theme: { from: "#3a2a08", via: "#241a30", to: "#120c1c", accent: "#facc15" },
    desc: "The pinnacle of mining technology — Genesis Core.",
  },
];

// Player level is derived from lifetime AETHER earned (totalEarned) — every level
// requires 40% more than the last, so early levels come fast and later ones are a grind.
