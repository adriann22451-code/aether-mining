export const eventCatalog = [
  { id: 1, title: "Claim 5x in a row", total: 5, reward: 600, getProgress: (s) => s.claimCount },
  { id: 2, title: "Collect 50,000 AETHER (lifetime)", total: 50000, reward: 1100, getProgress: (s) => s.totalEarned },
  { id: 3, title: "Reach 3 GH/s Hashrate", total: 3e9, reward: 1900, getProgress: (s) => s.totalHashrate },
];
