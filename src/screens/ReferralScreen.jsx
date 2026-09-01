import {
  CheckCircle2,
  Circle,
  Copy,
  Gift,
  Send,
  Users,
} from "lucide-react";
import { useState } from "react";
import { ScreenHeader } from "../components/layout/ScreenHeader";
import { referralTiers } from "../data/referral";
import { formatInt } from "../lib/format";

const BOT_USERNAME = "Aether_mining_bot";

export function ReferralScreen({ onBack, telegramId, referralCount, claimedReferralIds, onClaim }) {
  const [copied, setCopied] = useState(false);
  const inviteLink = telegramId ? `https://t.me/${BOT_USERNAME}?startapp=${telegramId}` : null;

  const handleCopy = () => {
    if (!inviteLink) return;
    navigator.clipboard?.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleShare = () => {
    if (!inviteLink) return;
    const text = "Mining AETHER with me — join and let's build our rigs together!";
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${encodeURIComponent(text)}`;
    const tg = window.Telegram?.WebApp;
    if (tg?.openTelegramLink) tg.openTelegramLink(shareUrl);
    else window.open(shareUrl, "_blank");
  };

  return (
    <div className="px-4 pt-5 pb-6">
      <ScreenHeader title="REFERRAL" onBack={onBack} />

      <div className="mt-4 rounded-2xl bg-gradient-to-br from-sky-900/50 via-[#0a1a2e]/80 to-indigo-950/60 border border-sky-400/20 px-5 py-4 text-center shadow-[0_0_35px_-10px_rgba(56,189,248,0.35)]">
        <div className="text-[10px] tracking-[0.25em] text-sky-300 font-bold">INVITE FRIENDS</div>
        <div className="mt-1 flex items-center justify-center gap-1.5 text-2xl font-extrabold text-white">
          <Users size={20} className="text-sky-300" />
          {formatInt(referralCount)}
        </div>
        <div className="text-[10.5px] text-slate-400">friends joined via your link</div>

        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={handleCopy}
            disabled={!inviteLink}
            className="flex-1 rounded-lg bg-white/10 border border-white/15 py-2 flex items-center justify-center gap-1.5 text-[11px] font-bold text-white active:scale-[0.97] transition disabled:opacity-40"
          >
            <Copy size={13} />
            {copied ? "Copied!" : "Copy Link"}
          </button>
          <button
            type="button"
            onClick={handleShare}
            disabled={!inviteLink}
            className="flex-1 rounded-lg bg-gradient-to-b from-sky-500 to-blue-700 py-2 flex items-center justify-center gap-1.5 text-[11px] font-extrabold text-white shadow-[0_2px_10px_-2px_rgba(56,189,248,0.6)] active:scale-[0.97] transition disabled:opacity-40"
          >
            <Send size={13} />
            Share
          </button>
        </div>
      </div>

      <div className="mt-4 text-[10.5px] text-slate-500">Reward tiers — paid out of the Treasury pool</div>
      <div className="mt-2 flex flex-col gap-3">
        {referralTiers.map((t) => {
          const raw = Math.min(referralCount, t.friends);
          const pct = Math.min(100, Math.round((raw / t.friends) * 100));
          const done = referralCount >= t.friends;
          const claimed = claimedReferralIds.includes(t.id);
          return (
            <div key={t.id} className="rounded-2xl bg-white/5 border border-white/10 p-3.5 backdrop-blur-sm">
              <div className="flex items-start gap-2.5">
                {done ? (
                  <CheckCircle2 size={18} className="text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <Circle size={18} className="text-slate-500 shrink-0 mt-0.5" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-bold text-white">Invite {formatInt(t.friends)} friends</div>
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-black/40 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${done ? "bg-emerald-400" : "bg-gradient-to-r from-sky-400 to-blue-400"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 shrink-0">{formatInt(raw)}/{formatInt(t.friends)}</span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                disabled={!done || claimed}
                onClick={() => onClaim(t.id, t.reward)}
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
                  {t.reward} AETHER
                </span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
