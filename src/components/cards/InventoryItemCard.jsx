import { marketCatalog, resolveInventoryRarity } from "../../data/market";
import { RARITY_COLORS } from "../../data/parts";

// Modern "game inventory" slot: a socketed tile with a rarity-colored bezel
// and glow, a corner rarity tick, a shine sweep for high tiers, and a
// quantity/level badge overlapping the corner — tap opens ItemDetailModal
// for the name/description instead of cramming text into the grid.
export function InventoryItemCard({ item, onSelect }) {
  const marketRef = marketCatalog.find((m) => m.name === item.name);
  // Belt-and-suspenders: prefer the live catalog entry's icon/image/color
  // whenever the stored item is missing them (see resolveInventoryRow in lib/api.js)
  const displayImage = item.image || marketRef?.image;
  const Icon = item.icon || marketRef?.icon;
  const displayColor = item.iconColor || marketRef?.iconColor || "#94a3b8";
  const rarity = resolveInventoryRarity(item, marketRef);
  const rarityColor = RARITY_COLORS[rarity] || displayColor;
  const isShiny = rarity === "Epic" || rarity === "Legendary";
  const isEquipped = !!item.selected;
  const accentColor = isEquipped ? "#a78bfa" : rarityColor;

  return (
    <button
      type="button"
      onClick={() => onSelect(item)}
      className="relative aspect-square rounded-2xl overflow-hidden active:scale-95 transition-transform duration-150"
      style={{
        "--rglow": `${accentColor}${rarity === "Legendary" || isEquipped ? "cc" : "99"}`,
        background: `linear-gradient(150deg, ${accentColor}26 0%, #070a12 62%)`,
        border: `1.5px solid ${isEquipped ? "rgba(167,139,250,0.85)" : `${rarityColor}55`}`,
        boxShadow: isEquipped
          ? "0 0 16px -3px rgba(167,139,250,0.75), inset 0 0 12px -5px rgba(167,139,250,0.6)"
          : "inset 0 2px 6px rgba(0,0,0,0.55)",
        animation: isShiny || isEquipped ? `rarityPulse ${rarity === "Legendary" ? "1.6s" : "2.2s"} ease-in-out infinite` : undefined,
      }}
    >
      {/* corner rarity tick, like a socket bevel */}
      <div className="absolute -right-4 -top-4 w-8 h-8 rotate-45 opacity-90" style={{ background: accentColor }} />

      {/* shine sweep for Epic/Legendary */}
      {isShiny && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div
            className="absolute w-[42%] h-[220%] -top-[60%] -left-[25%]"
            style={{
              background: "linear-gradient(75deg, transparent 40%, rgba(255,255,255,0.35) 50%, transparent 60%)",
              animation: `rarityShine ${rarity === "Legendary" ? "2.4s" : "3.2s"} ease-in-out infinite`,
            }}
          />
        </div>
      )}

      {/* icon */}
      <div className="absolute inset-0 flex items-center justify-center p-3">
        {displayImage ? (
          <img
            src={displayImage}
            alt={item.name}
            className="w-full h-full object-contain drop-shadow-[0_2px_6px_rgba(0,0,0,0.55)]"
          />
        ) : Icon ? (
          <Icon size={30} style={{ color: rarityColor }} />
        ) : null}
      </div>

      {/* permanent-bonus / equipped indicator, top-left */}
      {isEquipped ? (
        <span className="absolute top-1 left-1 bg-purple-500 text-white text-[6.5px] font-extrabold px-1.5 py-[1.5px] rounded-full leading-none shadow-[0_0_6px_rgba(167,139,250,0.9)]">
          ON
        </span>
      ) : (
        marketRef && (
          <span className="absolute top-1.5 left-1.5 w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.9)]" />
        )
      )}

      {/* quantity / level badge, overlapping bottom-right corner */}
      <span
        className="absolute -bottom-1 -right-1 h-[19px] px-1.5 rounded-full bg-[#0b0e17] border-2 flex items-center justify-center text-[8.5px] font-extrabold text-white leading-none whitespace-nowrap"
        style={{ borderColor: accentColor }}
      >
        {item.tag}
      </span>
    </button>
  );
}
