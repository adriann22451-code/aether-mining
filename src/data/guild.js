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

export const GUILDS = [
  {
    id: "vanguard",
    name: "Quantum Vanguard",
    tag: "QTV",
    color: "#38bdf8",
    members: [
      { name: "NullSignal", rate: 22 },
      { name: "IronCore", rate: 17 },
      { name: "Skyfall", rate: 11 },
      { name: "Pixe1", rate: 7 },
    ],
  },
  {
    id: "syndicate",
    name: "Aether Syndicate",
    tag: "AES",
    color: "#c084fc",
    members: [
      { name: "Vexen", rate: 20 },
      { name: "GhostRig", rate: 15 },
      { name: "Nyx_Miner", rate: 10 },
      { name: "Miru", rate: 6 },
    ],
  },
  {
    id: "collective",
    name: "Genesis Collective",
    tag: "GNS",
    color: "#facc15",
    members: [
      { name: "BlokAtomic", rate: 18 },
      { name: "Kappa88", rate: 13 },
      { name: "RustyByte", rate: 9 },
      { name: "Overclockd", rate: 5 },
    ],
  },
];

export function guildMilestoneFor(n) {
  return Math.round(3000 * Math.pow(1.6, n));
}

export function guildRewardFor(n) {
  return Math.round(2000 * Math.pow(1.5, n));
}
