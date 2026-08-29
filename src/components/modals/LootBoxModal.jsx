import {
  Box,
} from "lucide-react";
import { AetherCoinIcon } from "../icons/CustomIcons";
import { LOOTBOX_COST } from "../../data/lootbox";
import { RARITY_COLORS } from "../../data/parts";
import { formatInt } from "../../lib/format";

export function LootBoxModal({ isOpen, onClose, phase, result, core, onOpen }) {
  if (!isOpen) return null;

  const canAfford = core >= LOOTBOX_COST;
  let resultColor = "#38bdf8";
  if (result?.type === "aether") resultColor = "#facc15";
  if (result?.type === "material") resultColor = result.iconColor || "#94a3b8";
  if (result?.type === "part") resultColor = RARITY_COLORS[result.item.rarity] || "#38bdf8";
  // Epic/Legendary pulls get the extra "big reveal" treatment (rays + flash);
  // everything else just gets the pop-in.
  const isBigReveal = result?.type === "part" && (result.item.rarity === "Epic" || result.item.rarity === "Legendary");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-5">
      <div className="w-full max-w-[340px] rounded-3xl bg-gradient-to-br from-fuchsia-950 via-[#1a0a2e] to-indigo-950 border border-fuchsia-400/30 p-5 text-center shadow-[0_0_40px_-10px_rgba(217,70,239,0.5)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[13px] font-extrabold tracking-[0.1em] text-white">
            <Box size={15} className="text-fuchsia-300" />
            LOOT BOX
          </div>
          <button type="button" onClick={onClose} className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center active:scale-90 transition text-slate-300 text-[12px]">
            ✕
          </button>
        </div>

        {phase === "result" && result ? (
          <>
            <div className="relative mx-auto mt-4 w-20 h-20">
              {isBigReveal && (
                <>
                  <div
                    className="absolute left-1/2 top-1/2 w-20 h-20 rounded-full pointer-events-none"
                    style={{ background: `radial-gradient(circle, ${resultColor}cc 0%, ${resultColor}00 70%)`, animation: "lootFlash 0.6s ease-out forwards" }}
                  />
                  <div
                    className="absolute left-1/2 top-1/2 w-28 h-28 pointer-events-none"
                    style={{
                      background: `repeating-conic-gradient(${resultColor}55 0deg 8deg, transparent 8deg 20deg)`,
                      animation: "lootRaysSpin 5s linear infinite",
                    }}
                  />
                </>
              )}
              <div
                className="relative mx-auto w-20 h-20 rounded-2xl flex items-center justify-center overflow-hidden"
                style={{
                  background: `linear-gradient(160deg, ${resultColor}40 0%, #0d1420 85%)`,
                  border: `1px solid ${resultColor}66`,
                  boxShadow: `0 0 24px -4px ${resultColor}aa`,
                  animation: "lootRevealPop 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) both",
                }}
              >
                {result.type === "aether" && <AetherCoinIcon size={38} />}
                {result.type === "material" && result.icon && <result.icon size={38} style={{ color: resultColor }} />}
                {result.type === "part" && (result.item.image ? (
                  <img src={result.item.image} alt={result.item.name} className="w-full h-full object-contain" />
                ) : (
                  <result.category.icon size={38} style={{ color: resultColor }} />
                ))}
              </div>
            </div>
            <div className="mt-3 text-[13px] font-extrabold text-white">
              {result.type === "aether" && `+${formatInt(result.amount)} ${result.label}`}
              {result.type === "material" && `+${result.qty} ${result.name}`}
              {result.type === "part" && `${result.item.name} Unlocked!`}
            </div>
            {result.type === "part" && (
              <div className="text-[10px] font-bold mt-0.5" style={{ color: resultColor }}>
                {result.item.rarity}
              </div>
            )}
            <button
              type="button"
              onClick={() => onOpen()}
              disabled={!canAfford}
              className={`mt-4 w-full rounded-xl py-3 text-[13px] font-extrabold transition active:scale-[0.97] flex items-center justify-center gap-1.5 ${
                canAfford
                  ? "bg-gradient-to-b from-fuchsia-500 to-purple-600 text-white shadow-[0_0_18px_-2px_rgba(217,70,239,0.6)]"
                  : "bg-white/5 text-slate-500"
              }`}
            >
              <Box size={14} />
              OPEN AGAIN ({formatInt(LOOTBOX_COST)})
            </button>
          </>
        ) : (
          <>
            <div className="relative mx-auto mt-4 w-20 h-20">
              {phase === "opening" && [0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="absolute left-1/2 top-1/2 w-1.5 h-1.5 rounded-full bg-fuchsia-300 pointer-events-none"
                  style={{ animation: `lootSparkOrbit 1.1s linear infinite`, animationDelay: `${i * 0.37}s` }}
                />
              ))}
              <div
                className="relative mx-auto w-20 h-20 rounded-2xl flex items-center justify-center border border-fuchsia-400/40 bg-fuchsia-500/10"
                style={
                  phase === "opening"
                    ? { animation: "lootShake 0.45s ease-in-out infinite, lootChargeGlow 0.9s ease-in-out infinite alternate" }
                    : undefined
                }
              >
                <Box size={38} className="text-fuchsia-300" />
              </div>
            </div>
            <p className="mt-3 text-[11.5px] text-slate-400">
              Spend AETHER for a random reward — a payout, Materials, or a free Part.
            </p>
            <button
              type="button"
              onClick={onOpen}
              disabled={!canAfford || phase === "opening"}
              className={`mt-4 w-full rounded-xl py-3 text-[13px] font-extrabold transition active:scale-[0.97] flex items-center justify-center gap-1.5 ${
                canAfford && phase !== "opening"
                  ? "bg-gradient-to-b from-fuchsia-500 to-purple-600 text-white shadow-[0_0_18px_-2px_rgba(217,70,239,0.6)]"
                  : "bg-white/5 text-slate-500"
              }`}
            >
              <Box size={14} />
              {phase === "opening" ? "OPENING…" : `OPEN (${formatInt(LOOTBOX_COST)} AETHER)`}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
