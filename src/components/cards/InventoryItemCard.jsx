export function InventoryItemCard({ item, onSelect }) {
  const Icon = item.icon;
  return (
    <button
      type="button"
      onClick={() => onSelect(item)}
      className={`relative rounded-xl aspect-square flex flex-col items-center justify-center gap-1.5 border backdrop-blur-sm active:scale-95 transition ${
        item.selected ? "bg-purple-500/10 border-purple-400/70 shadow-[0_0_18px_-2px_rgba(192,132,252,0.5)]" : "bg-white/5 border-white/10"
      }`}
    >
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
    </button>
  );
}
