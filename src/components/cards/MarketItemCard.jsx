import { AetherCoinIcon } from "../icons/CustomIcons";
import { rarityStyles } from "../../data/market";
import { RARITY_CARD_FRAMES, RARITY_CARD_FRAME_SLICE } from "../../data/rarityCardFrames";
import { formatHashrate } from "../../lib/format";

export function MarketItemCard({ item, stock, owned, core, onBuy }) {
  const Icon = item.icon;
  const canAfford = core >= item.price && stock > 0;
  const isShiny = item.rarity === "Epic" || item.rarity === "Legendary";
  const frame = RARITY_CARD_FRAMES[item.rarity] || RARITY_CARD_FRAMES.Common;

  return (
    <div
      className="relative flex flex-col items-center text-center gap-1.5 box-border"
      style={{
        borderStyle: "solid",
        borderWidth: "16px 15px 15px 15px",
        borderImageSource: `url(${frame})`,
        borderImageSlice: RARITY_CARD_FRAME_SLICE,
        borderImageRepeat: "stretch",
        background: `radial-gradient(120% 90% at 50% 0%, ${item.iconColor}22 0%, #0c0e17 65%)`,
        padding: "6px 8px 10px",
      }}
    >
      <div
        className="relative w-16 h-16 shrink-0 flex items-center justify-center mt-0.5"
        style={{
          "--rglow": `${item.iconColor}${item.rarity === "Legendary" ? "cc" : "99"}`,
          animation: isShiny ? `rarityPulse ${item.rarity === "Legendary" ? "1.6s" : "2.2s"} ease-in-out infinite` : undefined,
        }}
      >
        <span
          className="absolute inset-1 rounded-full"
          style={{ background: `radial-gradient(circle, ${item.iconColor}30 0%, transparent 72%)` }}
        />
        {item.image ? (
          <img src={item.image} alt={item.name} className="relative w-full h-full object-contain" />
        ) : (
          <Icon size={42} className="relative" style={{ color: item.iconColor }} />
        )}
        {isShiny && (
          <span
            className="pointer-events-none absolute -inset-3"
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
        <AetherCoinIcon size={11} dim={!canAfford} />
        {stock <= 0 ? "SOLD OUT" : item.price.toLocaleString()}
      </button>
    </div>
  );
}
