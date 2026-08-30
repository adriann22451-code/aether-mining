// Rebalanced for the 100M-max-supply economy — the old [40..800] scale
// dwarfed actual mining income (a small/new player earns roughly
// fractions of an AETHER per minute under the block-tick + ghost-hashrate
// system), so one daily login was worth hours of organic mining. Day 1
// starts at 5, ramping to 10 on day 7.
export const DAILY_STREAK_REWARDS = [5, 6, 7, 8, 9, 10, 10];

// Always use plain "YYYY-MM-DD" for the daily-claim date — this is what
// Postgres' `date` column round-trips as via Supabase, and comparing it
// against `new Date().toDateString()` (e.g. "Sun Aug 30 2026") NEVER
// matches after a refresh, which let players re-claim the daily reward
// indefinitely just by reopening the app. Every date this feature touches
// (client "today", what gets sent to the server, what's read back) must
// go through this same format.
export function todayLocalDateString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Parses "YYYY-MM-DD" via explicit Y/M/D components (not `new Date(str)`,
// which treats bare date-only strings as UTC midnight and can silently
// shift the day in non-UTC-positive timezones) so day-diff math always
// lines up with the player's actual local calendar day.
function parseLocalDate(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function daysBetween(dateStrA, dateStrB) {
  const a = parseLocalDate(dateStrA);
  const b = parseLocalDate(dateStrB);
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((b.setHours(0, 0, 0, 0) - a.setHours(0, 0, 0, 0)) / msPerDay);
}
