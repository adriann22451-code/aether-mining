import {
  Clock,
  Gift,
} from "lucide-react";
import { ScreenHeader } from "../components/layout/ScreenHeader";
import { eventCatalog } from "../data/events";

export function EventScreen({ onBack, stats, claimedEventIds, onClaim }) {
  return (
    <div className="px-4 pt-5 pb-6">
      <ScreenHeader title="EVENT" onBack={onBack} />

      <div className="mt-4 rounded-2xl bg-gradient-to-br from-fuchsia-900/50 via-[#1a0a2e]/80 to-indigo-950/60 border border-fuchsia-400/20 px-5 py-4 text-center shadow-[0_0_35px_-10px_rgba(217,70,239,0.35)]">
        <div className="text-[10px] tracking-[0.25em] text-fuchsia-300 font-bold">SPECIAL EVENT</div>
        <div className="mt-1 text-lg font-extrabold text-white">Core Miner Festival</div>
        <div className="mt-1.5 flex items-center justify-center gap-1.5 text-[11px] text-slate-300 font-mono">
          <Clock size={12} className="text-fuchsia-300" />
          Ends in 2h 14m
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3">
        {eventCatalog.map((ev) => {
          const raw = Math.min(ev.getProgress(stats), ev.total);
          const pct = Math.min(100, Math.round((raw / ev.total) * 100));
          const done = raw >= ev.total;
          const claimed = claimedEventIds.includes(ev.id);
          const progressLabel = ev.total >= 1e9 ? `${(raw / 1e9).toFixed(2)}/${(ev.total / 1e9).toFixed(0)} GH/s` : `${Math.round(raw).toLocaleString()}/${ev.total.toLocaleString()}`;
          return (
            <div key={ev.id} className="rounded-2xl bg-white/5 border border-white/10 p-3.5 backdrop-blur-sm">
              <div className="text-[13px] font-bold text-white">{ev.title}</div>
              <div className="mt-1.5 flex items-center gap-2">
                <div className="flex-1 h-1.5 rounded-full bg-black/40 overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-fuchsia-400 to-purple-500" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-[10px] font-bold text-slate-400 shrink-0">{progressLabel}</span>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-fuchsia-300">
                  <Gift size={12} />
                  Reward: {ev.reward} AETHER
                </div>
                <button
                  type="button"
                  disabled={!done || claimed}
                  onClick={() => onClaim(ev.id, ev.reward)}
                  className={`rounded-lg px-3 py-1 text-[11px] font-extrabold transition active:scale-[0.97] ${
                    claimed
                      ? "bg-white/5 text-slate-500"
                      : done
                      ? "bg-gradient-to-b from-fuchsia-500 to-purple-600 text-white shadow-[0_2px_10px_-2px_rgba(217,70,239,0.6)]"
                      : "bg-white/5 text-slate-500"
                  }`}
                >
                  {claimed ? "CLAIMED" : done ? "CLAIM" : "NOT YET"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
