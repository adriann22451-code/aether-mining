import {
  Clock,
  Gift,
} from "lucide-react";
import { useEffect, useState } from "react";
import { ScreenHeader } from "../components/layout/ScreenHeader";
import { eventCatalog } from "../data/events";

// Event runs in a real, fixed 30-day cycle anchored to a constant date (not
// "30 days from whenever you happen to open the app") — so every player is
// always looking at the same cycle, and "Ends in" always counts down from
// somewhere between 0 and 30 days, never a fake/tiny leftover number.
const EVENT_CYCLE_MS = 30 * 24 * 60 * 60 * 1000;
const EVENT_CYCLE_EPOCH = Date.UTC(2025, 0, 1); // fixed anchor, same for everyone

function getCycleEndTime(now) {
  const cycleIndex = Math.floor((now - EVENT_CYCLE_EPOCH) / EVENT_CYCLE_MS);
  return EVENT_CYCLE_EPOCH + (cycleIndex + 1) * EVENT_CYCLE_MS;
}

function formatCountdown(msLeft) {
  const totalMinutes = Math.max(0, Math.floor(msLeft / 60000));
  const days = Math.floor(totalMinutes / (24 * 60));
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function EventScreen({ onBack, stats, claimedEventIds, onClaim }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);
  const msLeft = Math.max(0, getCycleEndTime(now) - now);

  return (
    <div className="px-4 pt-5 pb-6">
      <ScreenHeader title="EVENT" onBack={onBack} />

      <div className="mt-4 rounded-2xl bg-gradient-to-br from-fuchsia-900/50 via-[#1a0a2e]/80 to-indigo-950/60 border border-fuchsia-400/20 px-5 py-4 text-center shadow-[0_0_35px_-10px_rgba(217,70,239,0.35)]">
        <div className="text-[10px] tracking-[0.25em] text-fuchsia-300 font-bold">SPECIAL EVENT</div>
        <div className="mt-1 text-lg font-extrabold text-white">Aether Mining Fest</div>
        <div className="mt-1.5 flex items-center justify-center gap-1.5 text-[11px] text-slate-300 font-mono">
          <Clock size={12} className="text-fuchsia-300" />
          Ends in {formatCountdown(msLeft)}
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
