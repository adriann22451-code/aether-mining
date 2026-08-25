import { marketCatalog } from "../../data/market";
import { formatHashrate } from "../../lib/format";

export function InventoryItemCard({ item, onSelect }) {
  const Icon = item.icon;
  // items bought from the SPECIAL ITEM shop grant a permanent hashrate bonus
  // that's already active — cross-reference by name so the Inventory card
  // shows this too (previously only visible back in the Shop screen)
  const marketRef = marketCatalog.find((m) => m.name === item.name);
  return (
    <button
      type="button"
      onClick={() => onSelect(item)}
      className={`relative rounded-xl aspect-square flex flex-col items-center justify-center gap-1.5 border backdrop-blur-sm active:scale-95 transition ${
        item.selected ? "bg-purple-500/10 border-purple-400/70 shadow-[0_0_18px_-2px_rgba(192,132,252,0.5)]" : "bg-white/5 border-white/10"
      }`}
    >
      {marketRef && (
        <span className="absolute top-1.5 right-1.5 flex items-center gap-0.5 bg-emerald-500/90 text-white text-[8px] font-extrabold px-1 py-0.5 rounded-full shadow-[0_0_6px_rgba(16,185,129,0.6)]">
          ACTIVE
        </span>
      )}
      <div
        className="w-11 h-11 rounded-lg flex items-center justify-center"
        style={{
          background: "linear-gradient(160deg, #1a2338 0%, #0d1420 100%)",
          border: `1px solid ${item.iconColor}44`,
          boxShadow: `0 0 14px -4px ${item.iconColor}88`,
        }}
      >
        <Icon size={32} style={{ color: item.iconColor }} />
      </div>
      <span className="text-[10px] font-bold text-slate-200">{item.tag}</span>
      {marketRef && <span className="text-[9px] font-semibold text-emerald-300">+{formatHashrate(marketRef.hpBonus)}</span>}
    </button>
  );
}
