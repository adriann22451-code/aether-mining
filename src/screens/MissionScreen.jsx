import {
  CheckCircle2,
  Circle,
  Gift,
} from "lucide-react";
import { ScreenHeader } from "../components/layout/ScreenHeader";
import { missionCatalog } from "../data/missions";

export function MissionScreen({ onBack, stats, claimedMissionIds, onClaim }) {
  return (
    <div className="px-4 pt-5 pb-6">
      <ScreenHeader title="MISSIONS" onBack={onBack} />
      <div className="mt-4 flex flex-col gap-3">
        {missionCatalog.map((m) => {
          const raw = Math.min(m.getProgress(stats), m.total);
          const pct = Math.min(100, Math.round((raw / m.total) * 100));
          const done = raw >= m.total;
          const claimed = claimedMissionIds.includes(m.id);
          const progressLabel = m.total >= 1e9 ? `${(raw / 1e9).toFixed(2)}/${(m.total / 1e9).toFixed(0)} GH/s` : `${Math.round(raw)}/${m.total}`;
          return (
            <div key={m.id} className="rounded-2xl bg-white/5 border border-white/10 p-3.5 backdrop-blur-sm">
              <div className="flex items-start gap-2.5">
                {done ? (
                  <CheckCircle2 size={18} className="text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <Circle size={18} className="text-slate-500 shrink-0 mt-0.5" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-bold text-white">{m.title}</div>
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-black/40 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${done ? "bg-emerald-400" : "bg-gradient-to-r from-amber-400 to-yellow-300"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 shrink-0">{progressLabel}</span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                disabled={!done || claimed}
                onClick={() => onClaim(m.id, m.reward)}
                className={`mt-3 w-full rounded-lg py-1.5 flex items-center justify-center gap-1.5 text-[12px] font-extrabold transition active:scale-[0.97] ${
                  claimed
                    ? "bg-white/5 text-slate-500"
                    : done
                    ? "bg-gradient-to-b from-emerald-500 to-green-600 text-white shadow-[0_2px_10px_-2px_rgba(34,197,94,0.6)]"
                    : "bg-white/5 text-slate-500"
                }`}
              >
                {claimed ? "CLAIMED" : done ? "CLAIM" : "NOT DONE YET"}
                <span className="flex items-center gap-1 bg-black/20 rounded-full px-1.5 py-0.5">
                  <Gift size={11} />
                  {m.reward} AETHER
                </span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
