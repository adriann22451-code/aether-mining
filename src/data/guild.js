// Guild membership, roster, and milestone data now all come from the
// server (guild-actions edge function) — this file only keeps the reward
// curve formulas, which the server also uses (guild-actions-index.ts),
// so both sides agree on the numbers, plus RIVAL_MINERS (still used by
// LeaderboardScreen as filler entries — unrelated to real guilds).
export function guildMilestoneFor(n) {
  return Math.round(3000 * Math.pow(1.6, n));
}

export function guildRewardFor(n) {
  return Math.round(2000 * Math.pow(1.5, n));
}

export const GUILD_CREATE_COST = 500;
export const GUILD_MAX_MEMBERS = 50;

export const GUILD_COLOR_PRESETS = ["#38bdf8", "#c084fc", "#facc15", "#4ade80", "#f472b6", "#fb923c"];

// Guild emblems — plain public-folder images (not bundler imports) so an
// artist can drop new PNG/WebP files into public/guild-icons/ at any time
// without touching code or breaking the build if a file is missing yet.
// Each `key` is what actually gets stored on the guilds row (guilds.icon);
// `src` just maps that key to the file path for rendering.
export const GUILD_ICON_PRESETS = [
  { key: "flame-core", label: "Flame Core", src: "/guild-icons/flame-core.webp" },
  { key: "cyber-wolf", label: "Cyber Wolf", src: "/guild-icons/cyber-wolf.webp" },
  { key: "quantum-shield", label: "Quantum Shield", src: "/guild-icons/quantum-shield.webp" },
  { key: "storm-circuit", label: "Storm Circuit", src: "/guild-icons/storm-circuit.webp" },
  { key: "golden-reactor", label: "Golden Reactor", src: "/guild-icons/golden-reactor.webp" },
  { key: "iron-fortress", label: "Iron Fortress", src: "/guild-icons/iron-fortress.webp" },
  { key: "phoenix-drive", label: "Phoenix Drive", src: "/guild-icons/phoenix-drive.webp" },
  { key: "frost-node", label: "Frost Node", src: "/guild-icons/frost-node.webp" },
  { key: "venom-byte", label: "Venom Byte", src: "/guild-icons/venom-byte.webp" },
  { key: "star-array", label: "Star Array", src: "/guild-icons/star-array.webp" },
];

export const GUILD_ICON_KEYS = GUILD_ICON_PRESETS.map((i) => i.key);
export const DEFAULT_GUILD_ICON = GUILD_ICON_KEYS[0];

export function guildIconSrc(key) {
  const found = GUILD_ICON_PRESETS.find((i) => i.key === key);
  return found ? found.src : GUILD_ICON_PRESETS[0].src;
}

export const RIVAL_MINERS = [
  { name: "NullSignal", hashrate: 52_000_000_000, totalEarned: 42_500_000 },
  { name: "Vexen", hashrate: 31_000_000_000, totalEarned: 21_000_000 },
  { name: "IronCore", hashrate: 18_500_000_000, totalEarned: 9_800_000 },
  { name: "BlokAtomic", hashrate: 9_200_000_000, totalEarned: 3_650_000 },
  { name: "GhostRig", hashrate: 4_100_000_000, totalEarned: 1_200_000 },
  { name: "Kappa88", hashrate: 1_800_000_000, totalEarned: 480_000 },
  { name: "Nyx_Miner", hashrate: 720_000_000, totalEarned: 165_000 },
  { name: "Skyfall", hashrate: 310_000_000, totalEarned: 62_000 },
  { name: "RustyByte", hashrate: 140_000_000, totalEarned: 28_000 },
  { name: "Miru", hashrate: 58_000_000, totalEarned: 9_500 },
  { name: "Pixe1", hashrate: 21_000_000, totalEarned: 3_200 },
  { name: "Overclockd", hashrate: 8_500_000, totalEarned: 950 },
];
