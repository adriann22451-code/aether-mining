import { Zap } from "lucide-react";
import { marketCatalog, resolveInventoryRarity } from "../../data/market";
import { RARITY_COLORS } from "../../data/parts";
import { formatHashrate } from "../../lib/format";

export function ItemDetailModal({ item, onClose }) {
  if (!item) return null;
  const marketRef = marketCatalog.find((m) => m.name === item.name);
  // Belt-and-suspenders: prefer the live catalog entry's icon/image/color
  // whenever the stored item is missing them (e.g. an older save resolved
  // before marketCatalog was checked — see resolveInventoryRow in lib/api.js).
  const displayImage = item.image || marketRef?.image;
  const Icon = item.icon || marketRef?.icon;
  const displayColor = item.iconColor || marketRef?.iconColor || "#94a3b8";
  const displayDesc = item.desc || (marketRef ? `Bought from the Marketplace (${marketRef.rarity}). Grants +${formatHashrate(marketRef.hpBonus)} permanent hashrate.` : "");
  const rarity = resolveInventoryRarity(item, marketRef);
  const rarityColor = RARITY_COLORS[rarity] || displayColor;
  const isShiny = rarity === "Epic" || rarity === "Legendary";
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full sm:w-[360px] sm:rounded-3xl rounded-t-3xl bg-[#10141f] border border-white/10 p-5 pb-7 sm:pb-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 rounded-full bg-white/15 mx-auto mb-4 sm:hidden" />
        <div className="flex items-center gap-3">
          <div
            className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0"
            style={{
              "--rglow": `${rarityColor}${rarity === "Legendary" ? "cc" : "99"}`,
              background: `linear-gradient(150deg, ${rarityColor}26 0%, #0a0d16 65%)`,
              border: `1.5px solid ${rarityColor}66`,
              animation: isShiny ? `rarityPulse ${rarity === "Legendary" ? "1.6s" : "2.2s"} ease-in-out infinite` : undefined,
            }}
          >
            <div className="absolute inset-0 flex items-center justify-center p-2.5">
              {displayImage ? (
                <img src={displayImage} alt={item.name} className="w-full h-full object-contain" />
              ) : Icon ? (
                <Icon size={40} style={{ color: rarityColor }} />
              ) : null}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[15px] font-extrabold text-white truncate">{item.name}</div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                {item.type === "rig" ? "Rig" : item.type === "item" ? "Item" : "Material"} · {item.tag}
              </span>
            </div>
            <span className="mt-1 inline-block text-[10px] font-extrabold uppercase tracking-wide" style={{ color: rarityColor }}>
              {rarity}
            </span>
          </div>
        </div>

        {marketRef && (
          <div className="mt-4 rounded-xl bg-emerald-500/10 border border-emerald-400/40 px-3 py-2.5 flex items-center gap-2.5">
            <Zap size={16} className="text-emerald-300 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-extrabold text-emerald-300">Permanent bonus active</div>
              <div className="text-[10px] text-emerald-200/80">Adding +{formatHashrate(marketRef.hpBonus)} to your total hashrate right now.</div>
            </div>
          </div>
        )}

        <p className="mt-4 text-[12.5px] leading-relaxed text-slate-300">
          {displayDesc || "No description available for this item."}
        </p>

        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full rounded-2xl bg-blue-600/90 py-3 text-[13px] font-extrabold text-white tracking-wide active:scale-[0.98] transition shadow-[0_0_16px_rgba(37,99,235,0.4)]"
        >
          CLOSE
        </button>
      </div>
    </div>
  );
}
