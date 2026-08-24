import {
  Zap,
} from "lucide-react";
import { formatCore, formatDuration } from "../../lib/format";

export function OfflineEarningsModal({ isOpen, onClose, earnings, durationSeconds }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-5">
      <div className="w-full max-w-[340px] rounded-3xl bg-gradient-to-br from-emerald-950 via-[#0a1f1a] to-cyan-950 border border-emerald-400/30 p-5 text-center shadow-[0_0_40px_-10px_rgba(16,185,129,0.5)]">
        <div className="mx-auto w-14 h-14 rounded-full bg-emerald-400/15 border border-emerald-400/40 flex items-center justify-center shadow-[0_0_20px_-4px_rgba(52,211,153,0.7)]">
          <Zap size={26} className="text-emerald-300" style={{ filter: "drop-shadow(0 0 6px rgba(52,211,153,0.9))" }} />
        </div>

        <div className="mt-3 text-[14px] font-extrabold tracking-[0.08em] text-white">WELCOME BACK!</div>
        <p className="mt-1 text-[11.5px] text-slate-400">
          Your rig kept mining while you were away for <span className="text-emerald-300 font-semibold">{formatDuration(durationSeconds)}</span>.
        </p>

        <div className="mt-4 rounded-2xl bg-black/30 border border-emerald-400/20 py-3">
          <div className="text-[9.5px] tracking-[0.2em] text-slate-400 font-semibold">OFFLINE EARNINGS</div>
          <div className="mt-1 text-2xl font-extrabold text-emerald-300">+{formatCore(earnings)} AETHER</div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full rounded-xl py-3 text-[13px] font-extrabold text-white bg-gradient-to-b from-emerald-500 to-teal-600 shadow-[0_0_18px_-2px_rgba(16,185,129,0.6)] active:scale-[0.97] transition"
        >
          NICE!
        </button>
      </div>
    </div>
  );
}
