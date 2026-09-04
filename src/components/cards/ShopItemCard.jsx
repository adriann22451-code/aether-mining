import { AetherCoinIcon } from "../icons/CustomIcons";
import { RARITY_COLORS } from "../../data/parts";
import { formatInt, formatStatValue } from "../../lib/format";

// Darkens (negative percent) or lightens (positive percent) a "#rrggbb" hex color.
function shadeColor(hex, percent) {
  const num = parseInt(hex.replace("#", ""), 16);
  const amt = Math.round(2.55 * percent);
  const clamp = (v) => Math.max(0, Math.min(255, v));
  const r = clamp((num >> 16) + amt);
  const g = clamp(((num >> 8) & 0x00ff) + amt);
  const b = clamp((num & 0x0000ff) + amt);
  return `#${(0x1000000 + r * 0x10000 + g * 0x100 + b).toString(16).slice(1)}`;
}

export function ShopItemCard({ item, category, core, onBuy }) {
  const Icon = category.icon;
  const canAfford = core >= item.buyCost;
  const rarityColor = RARITY_COLORS[item.rarity] || category.color;
  const rarityDark = shadeColor(rarityColor, -60);
  const isShiny = item.rarity === "Epic" || item.rarity === "Legendary";
  const btnFace = canAfford ? "#3b82f6" : "#2a3140";
  const btnEdge = canAfford ? "#1d4ed8" : "#181d28";

  return (
    <div
      className="relative rounded-2xl p-2.5 pt-3.5 flex flex-col items-center text-center gap-1.5"
      style={{
        background: "#11131e",
        border: `2.5px solid ${rarityColor}`,
        boxShadow: `0 3px 0 0 ${rarityDark}, inset 0 0 10px rgba(0,0,0,0.35)`,
      }}
    >
      {item.rarity && (
        <div
          className="absolute -top-2 left-2 -rotate-6 px-2 py-[1px] rounded-md text-[8.5px] font-extrabold uppercase tracking-wide z-10 whitespace-nowrap"
          style={{ background: rarityColor, color: rarityDark, boxShadow: `0 2px 0 0 ${rarityDark}` }}
        >
          {item.rarity}
        </div>
      )}

      <div
        className="relative w-16 h-16 shrink-0 rounded-xl flex items-center justify-center overflow-hidden"
        style={{
          background: `radial-gradient(circle at 50% 28%, ${rarityColor}30 0%, #090c14 78%)`,
          border: `1.5px solid ${rarityColor}88`,
          boxShadow: "inset 0 2px 5px rgba(0,0,0,0.55)",
          "--rglow": `${rarityColor}${item.rarity === "Legendary" ? "cc" : "99"}`,
          animation: isShiny ? `rarityPulse ${item.rarity === "Legendary" ? "1.6s" : "2.2s"} ease-in-out infinite` : undefined,
        }}
      >
        <span className="absolute top-1 left-1 w-[3px] h-[3px] rounded-full" style={{ background: `${rarityColor}80` }} />
        <span className="absolute top-1 right-1 w-[3px] h-[3px] rounded-full" style={{ background: `${rarityColor}80` }} />
        <span className="absolute bottom-1 left-1 w-[3px] h-[3px] rounded-full" style={{ background: `${rarityColor}80` }} />
        <span className="absolute bottom-1 right-1 w-[3px] h-[3px] rounded-full" style={{ background: `${rarityColor}80` }} />

        {item.image ? (
          <img src={item.image} alt={item.name} className="w-full h-full object-contain p-1.5" />
        ) : (
          <Icon size={38} style={{ color: rarityColor }} />
        )}
        {isShiny && (
          <span
            className="pointer-events-none absolute -inset-4"
            style={{
              background: `linear-gradient(115deg, transparent 42%, ${rarityColor}cc 50%, transparent 58%)`,
              animation: `rarityShine ${item.rarity === "Legendary" ? "1.8s" : "2.6s"} linear infinite`,
            }}
          />
        )}
      </div>

      <div className="w-full min-w-0">
        <span
          className="text-[12px] font-black text-white truncate block leading-tight uppercase tracking-tight"
          style={{ textShadow: "0 1px 0 rgba(0,0,0,0.85)" }}
        >
          {item.name}
        </span>
        <div className="mt-0.5 text-[10.5px] font-bold truncate" style={{ color: rarityColor }}>
          {formatStatValue(category.statType, item.hp)}
        </div>
      </div>

      <button
        type="button"
        onClick={() => onBuy(item.id)}
        disabled={!canAfford}
        className="w-full rounded-lg py-1.5 flex items-center justify-center gap-1 text-[11px] font-extrabold text-white uppercase transition active:translate-y-[2px]"
        style={{ background: btnFace, boxShadow: `0 3px 0 0 ${btnEdge}` }}
      >
        <AetherCoinIcon size={11} dim={!canAfford} />
        {item.buyCost === 0 ? "FREE" : formatInt(item.buyCost)}
      </button>
    </div>
  );
}
