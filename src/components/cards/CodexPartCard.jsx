import { RARITY_COLORS } from "../../data/parts";
import { RARITY_FRAMES } from "../../data/rarityFrames";
import { formatStatValue } from "../../lib/format";

export function CodexPartCard({ item, category, index }) {
  const Icon = category.icon;
  const rarityColor = RARITY_COLORS[item.rarity] || category.color;
  const frame = RARITY_FRAMES[item.rarity] || RARITY_FRAMES.Common;
  const isShiny = item.rarity === "Epic" || item.rarity === "Legendary";
  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 p-3 flex items-center gap-3 backdrop-blur-sm">
      <div
        className="relative w-12 h-12 shrink-0"
        style={{
          "--rglow": `${rarityColor}${item.rarity === "Legendary" ? "cc" : "99"}`,
          boxShadow: isShiny ? undefined : `0 0 12px -4px ${rarityColor}88`,
          animation: isShiny ? `rarityPulse ${item.rarity === "Legendary" ? "1.6s" : "2.2s"} ease-in-out infinite` : undefined,
          borderRadius: "9999px",
        }}
      >
        <div
          className="absolute inset-[15%] rounded-lg overflow-hidden flex items-center justify-center"
          style={{ background: `radial-gradient(circle at 50% 35%, ${rarityColor}25 0%, #0a0d16 80%)` }}
        >
          {item.image ? (
            <img src={item.image} alt={item.name} className="w-full h-full object-contain p-0.5" />
          ) : (
            <Icon size={20} style={{ color: rarityColor }} />
          )}
          {isShiny && (
            <span
              className="pointer-events-none absolute -inset-2"
              style={{
                background: `linear-gradient(115deg, transparent 40%, ${rarityColor}cc 50%, transparent 60%)`,
                animation: `rarityShine ${item.rarity === "Legendary" ? "1.8s" : "2.6s"} linear infinite`,
              }}
            />
          )}
        </div>
        <img src={frame} alt="" className="absolute inset-0 w-full h-full object-contain pointer-events-none" />
        <span className="absolute -top-1 -left-1 text-[7.5px] font-mono font-bold text-white/50 bg-black/40 rounded px-1 z-10">#{index}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-[12.5px] font-bold text-white truncate">{item.name}</span>
          {item.rarity && (
            <span className="text-[9px] font-bold shrink-0" style={{ color: rarityColor }}>
              {item.rarity}
            </span>
          )}
        </div>
        <div className="text-[10px] font-semibold text-cyan-300">{formatStatValue(category.statType, item.hp)}</div>
        {item.desc && <p className="mt-0.5 text-[10.5px] leading-snug text-slate-400">{item.desc}</p>}
      </div>
    </div>
  );
}
