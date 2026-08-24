export const missionCatalog = [
  { id: 1, title: "Claim AETHER 3x today", total: 3, reward: 150, getProgress: (s) => s.dailyClaims },
  { id: 2, title: "Upgrade 1 Rig Part", total: 1, reward: 100, getProgress: (s) => s.upgradeCount },
  { id: 3, title: "Reach 2 GH/s Hashrate", total: 2e9, reward: 500, getProgress: (s) => s.totalHashrate },
  { id: 4, title: "Visit the Marketplace", total: 1, reward: 80, getProgress: (s) => (s.marketVisited ? 1 : 0) },
];
