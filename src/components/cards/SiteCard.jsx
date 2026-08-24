import {
  CheckCircle2,
  Coins,
  Lock,
} from "lucide-react";
import { formatInt } from "../../lib/format";

export function SiteCard({ site, index, unlockedIndex, activeSiteIndex, core, onUnlock, onSelect }) {
  const Icon = site.icon;
  const isUnlocked = index <= unlockedIndex;
  const status = !isUnlocked ? "locked" : index === activeSiteIndex ? "current" : "done";
  const isNextLocked = status === "locked" && index === unlockedIndex + 1;

  return (
    <div
      onClick={() => isUnlocked && onSelect(index)}
      className={`rounded-2xl border p-3 flex items-center gap-3 backdrop-blur-sm transition ${
        isUnlocked ? "cursor-pointer active:scale-[0.98]" : ""
      } ${
        status === "current"
          ? "bg-cyan-500/10 border-cyan-400/50 shadow-[0_0_18px_-4px_rgba(34,211,238,0.4)]"
          : status === "done"
          ? "bg-white/5 border-white/10"
          : "bg-white/[0.03] border-white/5 opacity-60"
      }`}
    >
      <div
        className="relative w-12 h-12 shrink-0 rounded-xl flex items-center justify-center"
        style={{
          background: "linear-gradient(160deg, #1a2338 0%, #0d1420 100%)",
          border: `1px solid ${site.theme.accent}44`,
          boxShadow: status !== "locked" ? `0 0 14px -2px ${site.theme.accent}99, 0 0 3px 0 ${site.theme.accent}66 inset` : undefined,
        }}
      >
        {status === "locked" ? (
          <Lock size={18} className="text-slate-500" />
        ) : (
          <Icon
            size={20}
            style={{
              color: site.theme.accent,
              filter: `drop-shadow(0 0 5px ${site.theme.accent}) drop-shadow(0 0 10px ${site.theme.accent}88)`,
            }}
          />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-[13px] font-bold text-white truncate">{site.name}</span>
          {status === "current" && (
            <span className="text-[9px] font-extrabold text-cyan-300 bg-cyan-400/10 rounded px-1.5 py-0.5 shrink-0">
              ACTIVE
            </span>
          )}
          {status === "done" && <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />}
        </div>
        <div className="text-[11px] text-slate-400 truncate">{site.desc}</div>
        <div className="text-[10px] text-slate-500 mt-0.5">Bonus Hashrate x{site.bonus.toFixed(2)}</div>
      </div>
      {isNextLocked && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onUnlock();
          }}
          disabled={core < site.cost}
          className={`shrink-0 rounded-lg px-2.5 py-2 flex flex-col items-center justify-center gap-0.5 text-[11px] font-extrabold transition active:scale-[0.97] ${
            core >= site.cost
              ? "bg-gradient-to-b from-emerald-500 to-green-600 text-white shadow-[0_2px_10px_-2px_rgba(34,197,94,0.6)]"
              : "bg-white/5 text-slate-500"
          }`}
        >
          <span>UNLOCK</span>
          <span className="flex items-center gap-1">
            <Coins size={10} className="text-amber-300" />
            {formatInt(site.cost)}
          </span>
        </button>
      )}
    </div>
  );
}
