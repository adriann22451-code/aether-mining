import {
  Coins,
  Gift,
} from "lucide-react";
import { ScreenHeader } from "../components/layout/ScreenHeader";
import { findPartItem } from "../data/parts";
import { formatInt } from "../lib/format";

export function InboxScreen({ onBack, inboxItems, onClaimInboxItem }) {
  const unclaimedCount = inboxItems.filter((i) => !i.claimed).length;

  return (
    <div className="px-4 pt-5 pb-6">
      <ScreenHeader title="INBOX" onBack={onBack} />

      <div className="mt-3 text-[11px] text-slate-500">
        {unclaimedCount > 0 ? `You have ${unclaimedCount} unclaimed gift${unclaimedCount === 1 ? "" : "s"}.` : "No new gifts right now."}
      </div>

      <div className="mt-4 flex flex-col gap-2.5">
        {inboxItems.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.id}
              className={`rounded-2xl border p-3.5 backdrop-blur-sm ${
                item.claimed ? "bg-white/5 border-white/10 opacity-60" : "bg-cyan-500/5 border-cyan-400/30 shadow-[0_0_16px_-6px_rgba(34,211,238,0.4)]"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 shrink-0 rounded-xl flex items-center justify-center"
                  style={{ background: `${item.iconColor}22`, border: `1px solid ${item.iconColor}55` }}
                >
                  <Icon size={24} style={{ color: item.iconColor }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-bold text-white">{item.title}</div>
                  <div className="text-[10.5px] text-slate-400 leading-snug mt-0.5">{item.desc}</div>
                </div>
              </div>

              <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
                {item.aether > 0 && (
                  <span className="flex items-center gap-1 bg-amber-400/10 border border-amber-400/30 rounded-full px-2 py-0.5 text-[10px] font-bold text-amber-300">
                    <Coins size={10} />
                    {formatInt(item.aether)} AETHER
                  </span>
                )}
                {(item.partIds || []).map((pid) => {
                  const found = findPartItem(pid);
                  if (!found) return null;
                  return (
                    <span
                      key={pid}
                      className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-full px-2 py-0.5 text-[10px] font-bold text-slate-300"
                    >
                      {found.item.name}
                    </span>
                  );
                })}
              </div>

              <button
                type="button"
                disabled={item.claimed}
                onClick={() => onClaimInboxItem(item.id)}
                className={`mt-3 w-full rounded-xl py-2.5 text-[12px] font-extrabold transition active:scale-[0.97] flex items-center justify-center gap-1.5 ${
                  item.claimed
                    ? "bg-white/5 text-slate-500"
                    : "bg-gradient-to-b from-cyan-400 to-blue-600 text-white shadow-[0_0_16px_-2px_rgba(34,211,238,0.5)]"
                }`}
              >
                <Gift size={14} />
                {item.claimed ? "CLAIMED" : "CLAIM"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
