// Display-only — the server (game-actions' REFERRAL_TIER_CATALOG) is the
// real source of truth for reward amounts and referral_count. Keep
// ids/friends/rewards here in sync with the backend.
export const referralTiers = [
  { id: 1, friends: 5, reward: 10 },
  { id: 2, friends: 25, reward: 50 },
  { id: 3, friends: 50, reward: 100 },
  { id: 4, friends: 100, reward: 200 },
  { id: 5, friends: 500, reward: 1000 },
];
