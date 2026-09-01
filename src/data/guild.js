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
