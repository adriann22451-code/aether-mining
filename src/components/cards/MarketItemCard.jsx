import {
  Coins,
} from "lucide-react";
import { rarityStyles } from "../../data/market";
import { formatHashrate } from "../../lib/format";

export function MarketItemCard({ item, stock, owned, core, onBuy }) {
  const Icon = item.icon;
  const canAfford = core >= item.price && stock > 0;
  const isShiny = item.rarity === "Epic" || item.rarity === "Legendary";
  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 p-2.5 flex flex-col items-center text-center gap-1.5 backdrop-blur-sm">
      <div
        className="relative w-16 h-16 shrink-0 rounded-xl flex items-center justify-center overflow-hidden"
        style={{
          background: `linear-gradient(160deg, ${item.iconColor}40 0%, #0d1420 85%)`,
          border: `1px solid ${item.iconColor}66`,
          "--rglow": `${item.iconColor}${item.rarity === "Legendary" ? "cc" : "99"}`,
          boxShadow: isShiny ? undefined : `0 0 16px -4px ${item.iconColor}99`,
          animation: isShiny ? `rarityPulse ${item.rarity === "Legendary" ? "1.6s" : "2.2s"} ease-in-out infinite` : undefined,
        }}
      >
        <Icon size={42} style={{ color: item.iconColor }} />
        {isShiny && (
          <span
            className="pointer-events-none absolute -inset-4"
            style={{
              background: `linear-gradient(115deg, transparent 40%, ${item.iconColor}cc 50%, transparent 60%)`,
              animation: `rarityShine ${item.rarity === "Legendary" ? "1.8s" : "2.6s"} linear infinite`,
            }}
          />
        )}
      </div>

      <div className="w-full min-w-0">
        <span className="text-[12px] font-bold text-white truncate block leading-tight">{item.name}</span>
        <span className={`text-[9.5px] font-bold block ${rarityStyles[item.rarity]}`}>{item.rarity}</span>
        <div className="mt-0.5 text-[10.5px] font-semibold text-cyan-300 truncate">+{formatHashrate(item.hpBonus)}</div>
        <div className="text-[9px] text-slate-500">Stock {stock} · Owned {owned}</div>
      </div>

      <button
        type="button"
        disabled={!canAfford}
        onClick={() => onBuy(item)}
        className={`w-full rounded-lg py-1.5 flex items-center justify-center gap-1 text-[11px] font-extrabold transition active:scale-[0.97] ${
          canAfford
            ? "bg-gradient-to-b from-emerald-500 to-green-600 text-white shadow-[0_2px_10px_-2px_rgba(34,197,94,0.6)]"
            : "bg-white/5 text-slate-500"
        }`}
      >
        <Coins size={11} className={canAfford ? "text-amber-300" : "text-slate-600"} />
        {stock <= 0 ? "SOLD OUT" : item.price.toLocaleString()}
      </button>
    </div>
  );
}
