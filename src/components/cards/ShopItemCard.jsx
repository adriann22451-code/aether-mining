import { AetherCoinIcon } from "../icons/CustomIcons";
import { RARITY_COLORS } from "../../data/parts";
import { RARITY_CARD_FRAMES, RARITY_CARD_FRAME_SLICE } from "../../data/rarityCardFrames";
import { STAT_TYPE_LABEL, formatInt, formatStatValue } from "../../lib/format";

export function ShopItemCard({ item, category, core, onBuy }) {
  const Icon = category.icon;
  const canAfford = core >= item.buyCost;
  const rarityColor = RARITY_COLORS[item.rarity] || category.color;
  const frame = RARITY_CARD_FRAMES[item.rarity] || RARITY_CARD_FRAMES.Common;
  const isShiny = item.rarity === "Epic" || item.rarity === "Legendary";

  return (
    <div
      className="relative flex flex-col items-center text-center gap-1.5 box-border"
      style={{
        borderStyle: "solid",
        borderWidth: "16px 15px 15px 15px",
        borderImageSource: `url(${frame})`,
        borderImageSlice: RARITY_CARD_FRAME_SLICE,
        borderImageRepeat: "stretch",
        background: `radial-gradient(120% 90% at 50% 0%, ${rarityColor}22 0%, #0c0e17 65%)`,
        padding: "6px 8px 10px",
      }}
    >
      <div
        className="relative w-16 h-16 shrink-0 flex items-center justify-center mt-0.5"
        style={{
          "--rglow": `${rarityColor}${item.rarity === "Legendary" ? "cc" : "99"}`,
          animation: isShiny ? `rarityPulse ${item.rarity === "Legendary" ? "1.6s" : "2.2s"} ease-in-out infinite` : undefined,
        }}
      >
        <span
          className="absolute inset-1 rounded-full"
          style={{ background: `radial-gradient(circle, ${rarityColor}30 0%, transparent 72%)` }}
        />
        {item.image ? (
          <img src={item.image} alt={item.name} className="relative w-full h-full object-contain" />
        ) : (
          <Icon size={38} className="relative" style={{ color: rarityColor }} />
        )}
      </div>

      <div className="w-full min-w-0">
        <span className="text-[12px] font-bold text-white truncate block leading-tight">{item.name}</span>
        {item.rarity && (
          <span className="text-[9.5px] font-bold block" style={{ color: rarityColor }}>
            {item.rarity}
          </span>
        )}
        <div className="mt-0.5 text-[8px] font-semibold text-slate-500 uppercase tracking-wide truncate">
          {STAT_TYPE_LABEL[category.statType]}
        </div>
        <div className="text-[10.5px] font-semibold truncate" style={{ color: rarityColor }}>
          {formatStatValue(category.statType, item.hp)}
        </div>
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
        <AetherCoinIcon size={11} dim={!canAfford} />
        {item.buyCost === 0 ? "FREE" : formatInt(item.buyCost)}
      </button>
    </div>
  );
}
