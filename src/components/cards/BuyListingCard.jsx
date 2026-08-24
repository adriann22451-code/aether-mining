import {
  Coins,
} from "lucide-react";
import { formatInt } from "../../lib/format";

export function BuyListingCard({ listing, core, onBuy }) {
  const Icon = listing.icon;
  const canAfford = core >= listing.price;
  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 p-2.5 flex flex-col items-center text-center gap-1.5 backdrop-blur-sm">
      <div
        className="relative w-16 h-16 shrink-0 rounded-xl flex items-center justify-center overflow-hidden"
        style={{
          background: `linear-gradient(160deg, ${listing.iconColor}33 0%, #0d1420 85%)`,
          border: `1px solid ${listing.iconColor}55`,
        }}
      >
        <Icon size={38} style={{ color: listing.iconColor }} />
      </div>
      <div className="w-full min-w-0">
        <span className="text-[12px] font-bold text-white truncate block leading-tight">{listing.name}</span>
        <span className="text-[9.5px] text-slate-500 truncate block">sold by {listing.seller}</span>
        <div className="mt-0.5 flex items-center justify-center gap-1 text-[11px] font-extrabold text-amber-300">
          <Coins size={10} />
          {formatInt(listing.price)}
        </div>
      </div>
      <button
        type="button"
        onClick={() => onBuy(listing.id)}
        disabled={!canAfford}
        className={`w-full rounded-lg py-1.5 text-[11px] font-extrabold transition active:scale-[0.97] ${
          canAfford
            ? "bg-gradient-to-b from-emerald-500 to-green-600 text-white shadow-[0_2px_10px_-2px_rgba(34,197,94,0.6)]"
            : "bg-white/5 text-slate-500"
        }`}
      >
        BUY
      </button>
    </div>
  );
}
