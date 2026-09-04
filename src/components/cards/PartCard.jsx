import {
  ChevronRight,
} from "lucide-react";
import { AetherCoinIcon } from "../icons/CustomIcons";
import { MAX_LEVEL, RARITY_COLORS, itemHpAtLevel, itemLevelUpCost } from "../../data/parts";
import { RARITY_FRAMES } from "../../data/rarityFrames";
import { STAT_TYPE_LABEL, formatInt, formatStatValue } from "../../lib/format";

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
        <div
          className="absolute inset-[15%] rounded-lg overflow-hidden flex items-center justify-center"
          style={{ background: `radial-gradient(circle at 50% 35%, ${rarityColor}25 0%, #0a0d16 80%)` }}
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
          <span className="text-[10px] font-bold text-slate-400 shrink-0 ml-2">
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
          onClick={() => onUpgrade(item.id)}
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
