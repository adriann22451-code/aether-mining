export function formatCore(n) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatInt(n) {
  return Math.round(n).toLocaleString("en-US");
}

export function formatDuration(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

export function formatHashrate(hp) {
  const units = [
    { v: 1e15, s: "PH/s" },
    { v: 1e12, s: "TH/s" },
    { v: 1e9, s: "GH/s" },
    { v: 1e6, s: "MH/s" },
    { v: 1e3, s: "KH/s" },
  ];
  for (const u of units) {
    if (hp >= u.v) return `${(hp / u.v).toFixed(2)} ${u.s}`;
  }
  return `${Math.round(hp)} H/s`;
}
