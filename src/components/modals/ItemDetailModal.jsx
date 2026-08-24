export function ItemDetailModal({ item, onClose }) {
  if (!item) return null;
  const Icon = item.icon;
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
            className="w-16 h-16 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: "linear-gradient(160deg, #1a2338 0%, #0d1420 100%)",
              border: `1px solid ${item.iconColor}55`,
              boxShadow: `0 0 18px -3px ${item.iconColor}99`,
            }}
          >
            <Icon size={44} style={{ color: item.iconColor }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[15px] font-extrabold text-white truncate">{item.name}</div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
              {item.type === "rig" ? "Rig" : item.type === "item" ? "Item" : "Material"} · {item.tag}
            </div>
          </div>
        </div>

        <p className="mt-4 text-[12.5px] leading-relaxed text-slate-300">
          {item.desc || "No description available for this item."}
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
