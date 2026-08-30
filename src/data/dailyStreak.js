// Rebalanced for the 100M-max-supply economy — the old [40..800] scale
// dwarfed actual mining income (a small/new player earns roughly
// fractions of an AETHER per minute under the block-tick + ghost-hashrate
// system), so one daily login was worth hours of organic mining. Day 1
// starts at 5, ramping to 10 on day 7.
export const DAILY_STREAK_REWARDS = [5, 6, 7, 8, 9, 10, 10];

export function daysBetween(dateStrA, dateStrB) {
  const a = new Date(dateStrA);
  const b = new Date(dateStrB);
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((b.setHours(0, 0, 0, 0) - a.setHours(0, 0, 0, 0)) / msPerDay);
}
