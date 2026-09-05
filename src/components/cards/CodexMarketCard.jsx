import { rarityStyles } from "../../data/market";
import { RARITY_FRAMES } from "../../data/rarityFrames";
import { STAT_TYPE_LABEL, formatHashrate, marketSecondaryBonusLine } from "../../lib/format";

export function CodexMarketCard({ item }) {
  const isShiny = item.rarity === "Epic" || item.rarity === "Legendary";
  const frame = RARITY_FRAMES[item.rarity] || RARITY_FRAMES.Common;
  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 p-3 flex items-center gap-3 backdrop-blur-sm">
      <div
        className="relative w-12 h-12 shrink-0"
        style={{
          "--rglow": `${item.iconColor}${item.rarity === "Legendary" ? "cc" : "99"}`,
          boxShadow: isShiny ? undefined : `0 0 12px -4px ${item.iconColor}88`,
          animation: isShiny ? `rarityPulse ${item.rarity === "Legendary" ? "1.6s" : "2.2s"} ease-in-out infinite` : undefined,
          borderRadius: "9999px",
        }}
      >
        <div
          className="absolute inset-[15%] rounded-lg overflow-hidden flex items-center justify-center"
          style={{ background: `radial-gradient(circle at 50% 35%, ${item.iconColor}25 0%, #0a0d16 80%)` }}
        >
          {item.image ? (
            <img src={item.image} alt={item.name} className="w-full h-full object-contain p-0.5" />
          ) : (
            <item.icon size={20} style={{ color: item.iconColor }} />
          )}
        </div>
        <img src={frame} alt="" className="absolute inset-0 w-full h-full object-contain pointer-events-none" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-[12.5px] font-bold text-white truncate">{item.name}</span>
          <span className={`text-[9px] font-bold shrink-0 ${rarityStyles[item.rarity]}`}>{item.rarity}</span>
        </div>
        <div className="text-[10px] font-semibold text-cyan-300">
          {STAT_TYPE_LABEL.hashrate}: +{formatHashrate(item.hpBonus)}
        </div>
        {marketSecondaryBonusLine(item) && (
          <div className="text-[10px] font-semibold text-emerald-400">{marketSecondaryBonusLine(item)}</div>
        )}
        {item.desc && <p className="mt-0.5 text-[10.5px] leading-snug text-slate-400">{item.desc}</p>}
      </div>
    </div>
  );
}
