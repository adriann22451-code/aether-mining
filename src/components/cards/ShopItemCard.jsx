import {
  Coins,
} from "lucide-react";
import { RARITY_COLORS } from "../../data/parts";
import { formatHashrate, formatInt } from "../../lib/format";

export function ShopItemCard({ item, category, core, onBuy }) {
  const Icon = category.icon;
  const canAfford = core >= item.buyCost;
  const rarityColor = RARITY_COLORS[item.rarity] || category.color;
  const isShiny = item.rarity === "Epic" || item.rarity === "Legendary";

  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 p-2.5 flex flex-col items-center text-center gap-1.5 backdrop-blur-sm">
      <div
        className="relative w-16 h-16 shrink-0 rounded-xl flex items-center justify-center overflow-hidden"
        style={{
          background: `linear-gradient(160deg, ${rarityColor}40 0%, #0d1420 85%)`,
          border: `1px solid ${rarityColor}66`,
          "--rglow": `${rarityColor}${item.rarity === "Legendary" ? "cc" : "99"}`,
          boxShadow: isShiny ? undefined : `0 0 16px -4px ${rarityColor}99`,
          animation: isShiny ? `rarityPulse ${item.rarity === "Legendary" ? "1.6s" : "2.2s"} ease-in-out infinite` : undefined,
        }}
      >
        {item.image ? (
          <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
        ) : (
          <Icon size={42} style={{ color: rarityColor }} />
        )}
        {isShiny && (
          <span
            className="pointer-events-none absolute -inset-4"
            style={{
              background: `linear-gradient(115deg, transparent 40%, ${rarityColor}cc 50%, transparent 60%)`,
              animation: `rarityShine ${item.rarity === "Legendary" ? "1.8s" : "2.6s"} linear infinite`,
            }}
          />
        )}
      </div>

      <div className="w-full min-w-0">
        <span className="text-[12px] font-bold text-white truncate block leading-tight">{item.name}</span>
        {item.rarity && (
          <span className="text-[9.5px] font-bold block" style={{ color: rarityColor }}>
            {item.rarity}
          </span>
        )}
        <div className="mt-0.5 text-[10.5px] font-semibold text-cyan-300 truncate">{formatHashrate(item.hp)}</div>
      </div>

      <button
        type="button"
        onClick={() => onBuy(item.id)}
        disabled={!canAfford}
        className={`w-full rounded-lg py-1.5 flex items-center justify-center gap-1 text-[11px] font-extrabold transition active:scale-[0.97] ${
          canAfford
            ? "bg-gradient-to-b from-blue-500 to-indigo-600 text-white shadow-[0_2px_10px_-2px_rgba(59,130,246,0.6)]"
            : "bg-white/5 text-slate-500"
        }`}
      >
        <Coins size={11} className={canAfford ? "text-amber-300" : "text-slate-600"} />
        {item.buyCost === 0 ? "FREE" : formatInt(item.buyCost)}
      </button>
    </div>
  );
}
