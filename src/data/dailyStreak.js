export const DAILY_STREAK_REWARDS = [50, 100, 150, 250, 350, 500, 1000];

export function daysBetween(dateStrA, dateStrB) {
  const a = new Date(dateStrA);
  const b = new Date(dateStrB);
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((b.setHours(0, 0, 0, 0) - a.setHours(0, 0, 0, 0)) / msPerDay);
}
