import { useState, useEffect } from "react";
import {
  Crown,
} from "lucide-react";
import { ScreenHeader } from "../components/layout/ScreenHeader";
import { callFunction } from "../lib/api";
import { RIVAL_MINERS } from "../data/guild";
import { formatHashrate, formatInt } from "../lib/format";

export function LeaderboardScreen({ onBack, playerName, totalHashrate, totalEarned, isBackendOnline }) {
  const [metric, setMetric] = useState("hashrate");
  const [rows, setRows] = useState([]);
  const [playerRank, setPlayerRank] = useState(1);
  const [totalPlayers, setTotalPlayers] = useState(1);
  const [loading, setLoading] = useState(isBackendOnline);

  useEffect(() => {
    if (!isBackendOnline) {
      // offline/preview mode: demo bots so the screen isn't empty
      const demoRows = [
        ...RIVAL_MINERS.map((r) => ({ username: r.name, value: metric === "hashrate" ? r.hashrate : r.totalEarned, isPlayer: false })),
        { username: playerName, value: metric === "hashrate" ? totalHashrate : totalEarned, isPlayer: true },
      ].sort((a, b) => b.value - a.value);
      setRows(demoRows);
      setPlayerRank(demoRows.findIndex((r) => r.isPlayer) + 1);
      setTotalPlayers(demoRows.length);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    callFunction("leaderboard", { metric })
      .then(({ rows: r, playerRank: pr, totalPlayers: tp }) => {
        if (cancelled) return;
        setRows(r || []);
        setPlayerRank(pr || 1);
        setTotalPlayers(tp || (r || []).length);
      })
      .catch((e) => console.error("leaderboard fetch failed:", e))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [metric, isBackendOnline, playerName, totalHashrate, totalEarned]);

  return (
    <div className="px-4 pt-5 pb-6">
      <ScreenHeader title="LEADERBOARD" onBack={onBack} />

      {!isBackendOnline && (
        <div className="mt-3 rounded-xl bg-amber-500/10 border border-amber-400/30 px-3 py-2 text-[11px] font-semibold text-amber-300">
          Preview mode — showing demo rivals. Connect the backend to rank against real players.
        </div>
      )}

      <div className="mt-4 rounded-2xl bg-gradient-to-br from-amber-900/30 via-[#1a1408]/70 to-yellow-950/30 border border-amber-400/20 px-5 py-3 text-center">
        <div className="text-[10px] tracking-[0.25em] text-amber-300 font-semibold">YOUR RANK</div>
        <div className="mt-1 flex items-center justify-center gap-1.5 text-2xl font-extrabold text-white">
          <Crown size={20} className="text-amber-300" />#{playerRank}
          <span className="text-[13px] text-slate-400 font-semibold">/ {totalPlayers}</span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-1.5 bg-white/5 border border-white/10 rounded-xl p-1">
        <button
          type="button"
          onClick={() => setMetric("hashrate")}
          className={`rounded-lg py-2 text-[11.5px] font-bold tracking-wide transition ${
            metric === "hashrate" ? "bg-blue-600 text-white shadow-[0_0_14px_rgba(37,99,235,0.55)]" : "text-slate-400"
          }`}
        >
          HASHRATE
        </button>
        <button
          type="button"
          onClick={() => setMetric("earned")}
          className={`rounded-lg py-2 text-[11.5px] font-bold tracking-wide transition ${
            metric === "earned" ? "bg-blue-600 text-white shadow-[0_0_14px_rgba(37,99,235,0.55)]" : "text-slate-400"
          }`}
        >
          TOTAL EARNED
        </button>
      </div>

      <div className="mt-4 flex flex-col gap-1.5">
        {loading && <div className="text-center text-[12px] text-slate-500 mt-6">Loading rankings…</div>}
        {!loading &&
          rows.map((row, i) => {
            const rank = i + 1;
            const medalColor = rank === 1 ? "#facc15" : rank === 2 ? "#cbd5e1" : rank === 3 ? "#d97706" : null;
            return (
              <div
                key={row.isPlayer ? "player" : row.username + i}
                className={`rounded-2xl p-3 flex items-center gap-3 backdrop-blur-sm border ${
                  row.isPlayer ? "bg-cyan-500/10 border-cyan-400/50 shadow-[0_0_16px_-4px_rgba(34,211,238,0.5)]" : "bg-white/5 border-white/10"
                }`}
              >
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-[11px] font-extrabold"
                  style={{
                    background: medalColor ? `${medalColor}22` : "rgba(255,255,255,0.06)",
                    border: `1px solid ${medalColor ? `${medalColor}66` : "rgba(255,255,255,0.12)"}`,
                    color: medalColor || "#94a3b8",
                  }}
                >
                  {rank}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-[12.5px] font-bold truncate ${row.isPlayer ? "text-cyan-300" : "text-white"}`}>
                    {row.username}
                    {row.isPlayer && <span className="ml-1.5 text-[9px] font-bold text-cyan-400">(YOU)</span>}
                  </div>
                </div>
                <div className="text-[12px] font-extrabold text-amber-300 shrink-0">
                  {metric === "hashrate" ? formatHashrate(row.value) : `${formatInt(row.value)} AETHER`}
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}
