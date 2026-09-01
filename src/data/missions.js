// Display-only — the server (game-actions' MISSION_CATALOG) is the real
// source of truth for reward amounts and progress. 3 of these 7 are
// "active" on any given day (see App.jsx's activeMissionIds, driven by
// the player row's active_mission_ids) — keep ids/totals/rewards here in
// sync with the backend.
export const missionCatalog = [
  { id: 101, title: "Claim AETHER 3x today", total: 3, reward: 5, getProgress: (s) => s.dailyClaims },
  { id: 102, title: "Upgrade 1 Rig Part", total: 1, reward: 5, getProgress: (s) => s.dailyUpgradeCount },
  { id: 103, title: "Visit the Marketplace", total: 1, reward: 5, getProgress: (s) => (s.dailyMarketVisited ? 1 : 0) },
  { id: 104, title: "Open a Loot Box", total: 1, reward: 10, getProgress: (s) => s.dailyLootboxCount },
  { id: 105, title: "Craft an Item", total: 1, reward: 10, getProgress: (s) => s.dailyCraftCount },
  { id: 106, title: "Claim AETHER 5x today", total: 5, reward: 10, getProgress: (s) => s.dailyClaims },
  { id: 107, title: "Upgrade 2 Rig Parts", total: 2, reward: 10, getProgress: (s) => s.dailyUpgradeCount },
];
