import { AetherCoinIcon } from "../icons/CustomIcons";
import { RARITY_COLORS } from "../../data/parts";
import { RARITY_CARD_FRAMES, RARITY_CARD_FRAME_SLICE } from "../../data/rarityCardFrames";
import { formatInt } from "../../lib/format";

export function BuyListingCard({ listing, core, onBuy }) {
  const Icon = listing.icon;
  const canAfford = core >= listing.price;
  const rarity = listing.rarity || "Common";
  const rarityColor = RARITY_COLORS[rarity] || RARITY_COLORS.Common;
  const frame = RARITY_CARD_FRAMES[rarity] || RARITY_CARD_FRAMES.Common;
  const isShiny = rarity === "Epic" || rarity === "Legendary";

  return (
    <div
      className="relative flex flex-col items-center text-center gap-1 box-border"
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
          "--rglow": `${rarityColor}${rarity === "Legendary" ? "cc" : "99"}`,
          animation: isShiny ? `rarityPulse ${rarity === "Legendary" ? "1.6s" : "2.2s"} ease-in-out infinite` : undefined,
        }}
      >
        <span
          className="absolute inset-1 rounded-full"
          style={{ background: `radial-gradient(circle, ${rarityColor}30 0%, transparent 72%)` }}
        />
        {listing.image ? (
          <img src={listing.image} alt={listing.name} className="relative w-full h-full object-contain" />
        ) : (
          <Icon size={38} className="relative" style={{ color: rarityColor }} />
        )}
      </div>

      <div className="w-full min-w-0">
        <span className="text-[12px] font-bold text-white truncate block leading-tight">{listing.name}</span>
        <span className="text-[9.5px] font-bold block" style={{ color: rarityColor }}>
          {rarity}
        </span>
        <span className="text-[9px] text-slate-500 truncate block mt-0.5">sold by {listing.seller}</span>
      </div>

      <button
        type="button"
        onClick={() => onBuy(listing.id)}
        disabled={!canAfford}
        className={`w-full mt-0.5 rounded-lg py-1.5 flex items-center justify-center gap-1 text-[11px] font-extrabold transition active:scale-[0.97] ${
          canAfford
            ? "bg-gradient-to-b from-emerald-500 to-green-600 text-white shadow-[0_2px_10px_-2px_rgba(34,197,94,0.6)]"
            : "bg-white/5 text-slate-500"
        }`}
      >
        <AetherCoinIcon size={11} dim={!canAfford} />
        {formatInt(listing.price)}
      </button>
    </div>
  );
}
