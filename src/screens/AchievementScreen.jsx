import {
  Lock,
  Trophy,
} from "lucide-react";
import { ScreenHeader } from "../components/layout/ScreenHeader";
import { SITES } from "../data/sites";

export function AchievementScreen({ onBack, totalEarned, totalHashrate, unlockedIndex }) {
  const achievementCatalog = [
    { id: 1, title: "Rookie Miner", desc: "Claim AETHER for the first time", progress: 1, total: 1, done: true },
    { id: 2, title: "Part Collector", desc: "Own 3 categories of tier 2+ parts", progress: 3, total: 5, done: false },
    { id: 3, title: "Hashrate Master", desc: "Reach 5 GH/s total hashrate", progress: totalHashrate, total: 5e9, done: totalHashrate >= 5e9 },
    { id: 4, title: "AETHER Tycoon", desc: "Collect 1,000,000 AETHER", progress: totalEarned, total: 1000000, done: totalEarned >= 1000000 },
    { id: 5, title: "Site Explorer", desc: "Unlock every Mining Site", progress: unlockedIndex + 1, total: SITES.length, done: unlockedIndex + 1 >= SITES.length },
  ];
  const doneCount = achievementCatalog.filter((a) => a.done).length;

  return (
    <div className="px-4 pt-5 pb-6">
      <ScreenHeader title="ACHIEVEMENTS" onBack={onBack} />

      <div className="mt-4 rounded-2xl bg-gradient-to-br from-amber-900/30 via-[#1a1408]/70 to-yellow-950/30 border border-amber-400/20 px-5 py-3 text-center">
        <div className="text-[10px] tracking-[0.25em] text-amber-300 font-semibold">TOTAL ACHIEVEMENTS</div>
        <div className="mt-1 text-2xl font-extrabold text-white">
          {doneCount} / {achievementCatalog.length}
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3">
        {achievementCatalog.map((a) => {
          const pct = Math.min(100, Math.round((a.progress / a.total) * 100));
          return (
            <div key={a.id} className="rounded-2xl bg-white/5 border border-white/10 p-3.5 flex items-center gap-3 backdrop-blur-sm">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                  a.done ? "bg-amber-400/20 border border-amber-400/50" : "bg-white/5 border border-white/10"
                }`}
                style={a.done ? { boxShadow: "0 0 12px -2px rgba(251,191,36,0.7)" } : undefined}
              >
                {a.done ? (
                  <Trophy
                    size={17}
                    className="text-amber-300"
                    style={{ filter: "drop-shadow(0 0 4px #fbbf24) drop-shadow(0 0 8px rgba(251,191,36,0.8))" }}
                  />
                ) : (
                  <Lock size={15} className="text-slate-500" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-bold text-white">{a.title}</div>
                <div className="text-[11px] text-slate-400">{a.desc}</div>
                <div className="mt-1.5 flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-full bg-black/40 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${a.done ? "bg-amber-400" : "bg-gradient-to-r from-cyan-400 to-blue-500"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 shrink-0">
                    {Math.round(a.progress).toLocaleString()}/{Math.round(a.total).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
