import { RARITY_COLORS } from "../../data/parts";
import { RARITY_FRAMES } from "../../data/rarityFrames";

export function CodexTradeItemCard({ poolItem }) {
  const Icon = poolItem.icon;
  const rarityColor = RARITY_COLORS[poolItem.rarity] || poolItem.iconColor;
  const frame = RARITY_FRAMES[poolItem.rarity] || RARITY_FRAMES.Common;
  const isShiny = poolItem.rarity === "Epic" || poolItem.rarity === "Legendary";
  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 p-3 flex items-center gap-3 backdrop-blur-sm">
      <div
        className="relative w-12 h-12 shrink-0"
        style={{
          "--rglow": `${rarityColor}${poolItem.rarity === "Legendary" ? "cc" : "99"}`,
          boxShadow: isShiny ? undefined : `0 0 12px -4px ${rarityColor}88`,
          animation: isShiny ? `rarityPulse ${poolItem.rarity === "Legendary" ? "1.6s" : "2.2s"} ease-in-out infinite` : undefined,
          borderRadius: "9999px",
        }}
      >
        <div
          className="absolute inset-[15%] rounded-lg overflow-hidden flex items-center justify-center"
          style={{ background: `radial-gradient(circle at 50% 35%, ${rarityColor}25 0%, #0a0d16 80%)` }}
        >
          {poolItem.image ? (
            <img src={poolItem.image} alt={poolItem.name} className="w-full h-full object-contain p-0.5" />
          ) : (
            <Icon size={20} style={{ color: rarityColor }} />
          )}
        </div>
        <img src={frame} alt="" className="absolute inset-0 w-full h-full object-contain pointer-events-none" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-[12.5px] font-bold text-white truncate">{poolItem.name}</span>
          {poolItem.rarity && (
            <span className="text-[9px] font-bold shrink-0" style={{ color: rarityColor }}>
              {poolItem.rarity}
            </span>
          )}
        </div>
        {poolItem.desc && <p className="mt-0.5 text-[10.5px] leading-snug text-slate-400">{poolItem.desc}</p>}
      </div>
    </div>
  );
}
