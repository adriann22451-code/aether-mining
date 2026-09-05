import { Clock } from "lucide-react";
import { MARKET_FEE_RATE } from "../../data/market";
import { RARITY_COLORS } from "../../data/parts";
import { formatInt } from "../../lib/format";

export function MyListingCard({ listing, onCancel }) {
  const Icon = listing.icon;
  const rarity = listing.rarity || "Common";
  const rarityColor = RARITY_COLORS[rarity] || RARITY_COLORS.Common;
  const net = Math.max(1, Math.round(listing.price * (1 - MARKET_FEE_RATE)));

  return (
    <div
      className="relative rounded-2xl bg-white/5 border p-3 flex items-center gap-3 backdrop-blur-sm overflow-hidden"
      style={{ borderColor: `${rarityColor}40` }}
    >
      <span
        className="absolute left-0 top-0 bottom-0 w-[3px]"
        style={{ background: `linear-gradient(${rarityColor}, ${rarityColor}00)` }}
      />
      <div
        className="relative w-12 h-12 shrink-0 rounded-xl flex items-center justify-center overflow-hidden"
        style={{
          background: `linear-gradient(160deg, ${rarityColor}33 0%, #0d1420 85%)`,
          border: `1px solid ${rarityColor}55`,
        }}
      >
        {listing.image ? (
          <img src={listing.image} alt={listing.name} className="w-full h-full object-contain" />
        ) : (
          <Icon size={28} style={{ color: rarityColor }} />
        )}
        <span className="absolute w-1.5 h-1.5 rounded-full top-1 right-1 bg-emerald-400 animate-pulse" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[12.5px] font-bold text-white truncate">{listing.name}</div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-bold" style={{ color: rarityColor }}>{rarity}</span>
          <span className="flex items-center gap-1 text-[10px] text-slate-400">
            <Clock size={10} />
            Waiting for a buyer…
          </span>
        </div>
        <div className="text-[10.5px] text-slate-500">
          Asking <span className="text-amber-300 font-bold">{formatInt(listing.price)}</span> · you'll get{" "}
          <span className="text-emerald-400 font-bold">{formatInt(net)}</span> after 5% fee
        </div>
      </div>
      <button
        type="button"
        onClick={() => onCancel(listing.id)}
        className="shrink-0 rounded-lg px-3 py-1.5 text-[11px] font-extrabold bg-white/5 text-slate-300 active:scale-[0.97] transition"
      >
        CANCEL
      </button>
    </div>
  );
}
