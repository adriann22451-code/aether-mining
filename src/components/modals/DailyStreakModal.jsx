import { useEffect, useState } from "react";
import {
  Calendar,
  CheckCircle2,
  Gift,
} from "lucide-react";
import { DAILY_STREAK_REWARDS } from "../../data/dailyStreak";

function useTimeUntilNextDay(active) {
  const [label, setLabel] = useState("");
  useEffect(() => {
    if (!active) return;
    const tick = () => {
      const now = new Date();
      const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
      const ms = Math.max(0, nextMidnight.getTime() - now.getTime());
      const h = Math.floor(ms / 3600000);
      const m = Math.floor((ms % 3600000) / 60000);
      const s = Math.floor((ms % 60000) / 1000);
      setLabel(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [active]);
  return label;
}

export function DailyStreakModal({ isOpen, onClose, streak, pendingDay, alreadyClaimedToday, onClaim }) {
  const resetLabel = useTimeUntilNextDay(isOpen && alreadyClaimedToday);
  if (!isOpen) return null;
  const cycleDay = ((pendingDay - 1) % 7) + 1;
  const reward = DAILY_STREAK_REWARDS[cycleDay - 1];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-5">
      <div className="w-full max-w-[340px] rounded-3xl bg-gradient-to-br from-indigo-950 via-[#140a2e] to-purple-950 border border-indigo-400/30 p-5 shadow-[0_0_40px_-10px_rgba(124,58,237,0.5)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[13px] font-extrabold tracking-[0.1em] text-white">
            <Calendar size={15} className="text-cyan-300" />
            DAILY REWARD
          </div>
          <button type="button" onClick={onClose} className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center active:scale-90 transition text-slate-300 text-[12px]">
            ✕
          </button>
        </div>

        <div className="mt-1 text-[11px] text-slate-400">
          {alreadyClaimedToday ? "You've already claimed today. Come back tomorrow!" : `Day ${cycleDay} of a 7-day cycle. Keep it up!`}
        </div>

        {alreadyClaimedToday && (
          <div className="mt-2 flex items-center justify-center gap-1.5 rounded-lg bg-white/5 border border-white/10 py-1.5">
            <span className="text-[9.5px] text-slate-400">Resets in</span>
            <span className="text-[12px] font-extrabold tabular-nums text-cyan-300">{resetLabel}</span>
          </div>
        )}

        <div className="mt-4 grid grid-cols-7 gap-1">
          {DAILY_STREAK_REWARDS.map((amt, i) => {
            const dayNum = i + 1;
            const isPast = dayNum < cycleDay || (dayNum === cycleDay && alreadyClaimedToday);
            const isCurrent = dayNum === cycleDay && !alreadyClaimedToday;
            return (
              <div
                key={dayNum}
                className={`rounded-lg py-1.5 flex flex-col items-center gap-0.5 border ${
                  isCurrent
                    ? "bg-cyan-500/20 border-cyan-400/60 shadow-[0_0_10px_-2px_rgba(34,211,238,0.7)]"
                    : isPast
                    ? "bg-emerald-500/10 border-emerald-400/30"
                    : "bg-white/5 border-white/10"
                }`}
              >
                {isPast ? (
                  <CheckCircle2 size={12} className="text-emerald-400" />
                ) : (
                  <span className={`text-[9px] font-bold ${isCurrent ? "text-cyan-300" : "text-slate-500"}`}>D{dayNum}</span>
                )}
                <span className={`text-[8px] font-semibold ${isCurrent ? "text-cyan-200" : isPast ? "text-emerald-300" : "text-slate-500"}`}>
                  {amt}
                </span>
              </div>
            );
          })}
        </div>

        <div className="mt-4 text-center">
          <div className="text-[10px] tracking-[0.2em] text-slate-400 font-semibold">CURRENT STREAK</div>
          <div className="text-2xl font-extrabold text-white">{streak} day{streak === 1 ? "" : "s"}</div>
        </div>

        <button
          type="button"
          disabled={alreadyClaimedToday}
          onClick={onClaim}
          className={`mt-4 w-full rounded-xl py-3 text-[13px] font-extrabold transition active:scale-[0.97] flex items-center justify-center gap-1.5 ${
            alreadyClaimedToday
              ? "bg-white/5 text-slate-500"
              : "bg-gradient-to-b from-cyan-400 to-blue-600 text-white shadow-[0_0_18px_-2px_rgba(34,211,238,0.6)]"
          }`}
        >
          <Gift size={15} />
          {alreadyClaimedToday ? "CLAIMED" : `CLAIM ${reward} AETHER`}
        </button>
      </div>
    </div>
  );
}
