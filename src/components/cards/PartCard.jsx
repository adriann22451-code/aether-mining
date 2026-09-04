import { useMemo, useState } from "react";
import {
  ChevronRight,
} from "lucide-react";
import { AetherCoinIcon } from "../icons/CustomIcons";
import { MAX_LEVEL, RARITY_COLORS, itemHpAtLevel, itemLevelUpCost } from "../../data/parts";
import { RARITY_FRAMES } from "../../data/rarityFrames";
import { STAT_TYPE_LABEL, formatInt, formatStatValue } from "../../lib/format";

// Small outward-flying spark particles for the upgrade burst — stable per
// item so re-renders don't reshuffle them mid-animation.
function useUpgradeParticles(seedKey) {
  return useMemo(() => {
    const count = 7;
    return Array.from({ length: count }, (_, i) => {
      const angle = (i / count) * Math.PI * 2 + (i % 2 === 0 ? 0.15 : -0.15);
      const dist = 24 + ((i * 13) % 14);
      return {
        px: Math.cos(angle) * dist,
        py: Math.sin(angle) * dist,
        delay: (i % 3) * 0.03,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedKey]);
}

export function PartCard({ item, category, level, core, onUpgrade }) {
  const Icon = category.icon;
  const isMax = level >= MAX_LEVEL;
  const cost = !isMax ? itemLevelUpCost(item, level) : null;
  const canAfford = !isMax && core >= cost;
  const currentHp = itemHpAtLevel(item, level);
  const nextHp = !isMax ? itemHpAtLevel(item, level + 1) : null;
  const rarityColor = RARITY_COLORS[item.rarity] || category.color;
  const frame = RARITY_FRAMES[item.rarity] || RARITY_FRAMES.Common;
  const isShiny = item.rarity === "Epic" || item.rarity === "Legendary";

  const [burstId, setBurstId] = useState(0);
  const particles = useUpgradeParticles(item.id);
  const celebrating = burstId > 0;

  const handleUpgrade = () => {
    onUpgrade(item.id);
    setBurstId((id) => id + 1);
  };

  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 p-3 flex items-center gap-3 backdrop-blur-sm">
      <div
        className="relative w-14 h-14 shrink-0"
        style={{
          "--rglow": `${rarityColor}${item.rarity === "Legendary" ? "cc" : "99"}`,
          boxShadow: isShiny ? undefined : `0 0 14px -4px ${rarityColor}88`,
          animation: isShiny ? `rarityPulse ${item.rarity === "Legendary" ? "1.6s" : "2.2s"} ease-in-out infinite` : undefined,
          borderRadius: "9999px",
        }}
      >
        {celebrating && (
          <div
            key={`ring-${burstId}`}
            className="absolute left-1/2 top-1/2 w-full h-full rounded-full pointer-events-none"
            style={{ border: `2px solid ${rarityColor}`, animation: "upgradeRingBurst 0.6s ease-out forwards" }}
          />
        )}
        {celebrating &&
          particles.map((p, i) => (
            <span
              key={`spark-${burstId}-${i}`}
              className="absolute left-1/2 top-1/2 w-1 h-1 rounded-full pointer-events-none"
              style={{
                background: rarityColor,
                boxShadow: `0 0 4px 1px ${rarityColor}`,
                "--px": `${p.px}px`,
                "--py": `${p.py}px`,
                animation: `particleFloat 0.55s ease-out ${p.delay}s forwards`,
              }}
            />
          ))}
        {celebrating && (
          <span
            key={`float-${burstId}`}
            className="absolute left-1/2 -top-1 text-[9px] font-extrabold text-emerald-400 whitespace-nowrap pointer-events-none"
            style={{ animation: "upgradeTextFloat 0.9s ease-out forwards" }}
          >
            LEVEL UP
          </span>
        )}
        <div
          key={`icon-${burstId}`}
          className="absolute inset-[15%] rounded-lg overflow-hidden flex items-center justify-center"
          style={{
            background: `radial-gradient(circle at 50% 35%, ${rarityColor}25 0%, #0a0d16 80%)`,
            animation: celebrating ? "upgradePop 0.5s ease-out" : undefined,
          }}
        >
          {item.image ? (
            <img src={item.image} alt={item.name} className="w-full h-full object-contain p-1" />
          ) : (
            <Icon size={26} style={{ color: rarityColor }} />
          )}
        </div>
        <img src={frame} alt="" className="absolute inset-0 w-full h-full object-contain pointer-events-none" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-bold text-white truncate">{item.name}</span>
          <span
            key={`lv-${burstId}`}
            className="text-[10px] font-bold text-slate-400 shrink-0 ml-2"
            style={{ animation: celebrating ? "upgradeLabelPop 0.5s ease-out" : undefined, display: "inline-block" }}
          >
            Lv. {level}/{MAX_LEVEL}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-slate-400 truncate">{category.label}</span>
          {item.rarity && (
            <span className="text-[10px] font-bold shrink-0" style={{ color: rarityColor }}>
              {item.rarity}
            </span>
          )}
        </div>
        <div className="mt-1 text-[9px] font-semibold text-slate-500 uppercase tracking-wide">
          {STAT_TYPE_LABEL[category.statType]}
        </div>
        <div className="flex items-center gap-1.5 text-[11px] font-semibold">
          <span className="text-cyan-300">{formatStatValue(category.statType, currentHp)}</span>
          {!isMax && (
            <>
              <ChevronRight size={11} className="text-emerald-400" />
              <span className="text-emerald-400">{formatStatValue(category.statType, nextHp)}</span>
            </>
          )}
        </div>
      </div>
      {isMax ? (
        <span className="shrink-0 rounded-lg bg-white/5 border border-amber-400/40 px-3 py-2 text-[11px] font-extrabold text-amber-300">
          MAX
        </span>
      ) : (
        <button
          type="button"
          onClick={handleUpgrade}
          disabled={!canAfford}
          className={`shrink-0 self-stretch rounded-lg px-3 flex items-center justify-center gap-1 text-[12px] font-extrabold transition active:scale-[0.97] ${
            canAfford
              ? "bg-gradient-to-b from-emerald-500 to-green-600 text-white shadow-[0_2px_10px_-2px_rgba(34,197,94,0.6)]"
              : "bg-white/5 text-slate-500"
          }`}
        >
          <AetherCoinIcon size={12} dim={!canAfford} />
          {formatInt(cost)}
        </button>
      )}
    </div>
  );
}
