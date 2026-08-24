export function CodexTradeItemCard({ poolItem }) {
  const Icon = poolItem.icon;
  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 p-3 flex items-center gap-3 backdrop-blur-sm">
      <div
        className="relative w-12 h-12 shrink-0 rounded-xl flex items-center justify-center overflow-hidden"
        style={{
          background: `linear-gradient(160deg, ${poolItem.iconColor}33 0%, #0d1420 85%)`,
          border: `1px solid ${poolItem.iconColor}55`,
        }}
      >
        <Icon size={26} style={{ color: poolItem.iconColor }} />
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-[12.5px] font-bold text-white truncate block">{poolItem.name}</span>
        {poolItem.desc && <p className="mt-0.5 text-[10.5px] leading-snug text-slate-400">{poolItem.desc}</p>}
      </div>
    </div>
  );
}
