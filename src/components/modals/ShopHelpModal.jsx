import { HelpCircle, X } from "lucide-react";

export function ShopHelpModal({ isOpen, onClose }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-5">
      <div className="w-full max-w-[340px] rounded-3xl bg-gradient-to-br from-cyan-950 via-[#0a1a2e] to-indigo-950 border border-cyan-400/30 p-5 shadow-[0_0_40px_-10px_rgba(34,211,238,0.5)]">
        <div className="flex items-start justify-between gap-3">
          <div className="w-11 h-11 shrink-0 rounded-full bg-cyan-400/15 border border-cyan-400/40 flex items-center justify-center shadow-[0_0_20px_-4px_rgba(34,211,238,0.7)]">
            <HelpCircle size={20} className="text-cyan-300" style={{ filter: "drop-shadow(0 0 6px rgba(34,211,238,0.9))" }} />
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center active:scale-90 transition shrink-0"
          >
            <X size={13} className="text-slate-400" />
          </button>
        </div>

        <div className="mt-3 text-[14px] font-extrabold tracking-[0.08em] text-white">ABOUT THE SHOP</div>
        <ul className="mt-2 space-y-2 text-[11.5px] text-slate-400 leading-relaxed">
          <li><span className="text-cyan-300 font-semibold">Automation</span> — toggle passive helpers like Auto-Claim so your AETHER keeps coming in.</li>
          <li><span className="text-fuchsia-300 font-semibold">Loot Box</span> — spend AETHER for a chance at materials, parts, or bonus AETHER.</li>
          <li><span className="text-amber-300 font-semibold">Special Item</span> — rare/epic parts that boost your total hashrate. Buy, then upgrade them in Craft &gt; UPGRADE.</li>
        </ul>

        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full rounded-xl py-3 text-[13px] font-extrabold text-white bg-gradient-to-b from-cyan-500 to-indigo-600 shadow-[0_0_18px_-2px_rgba(34,211,238,0.6)] active:scale-[0.97] transition"
        >
          GOT IT
        </button>
      </div>
    </div>
  );
}
