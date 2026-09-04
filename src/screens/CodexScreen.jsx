import { useState } from "react";
import {
  BookOpen,
  Cpu,
  Gem,
  MapPinned,
  Package,
  Sparkles,
} from "lucide-react";
import { CodexMarketCard } from "../components/cards/CodexMarketCard";
import { CodexPartCard } from "../components/cards/CodexPartCard";
import { CodexTradeItemCard } from "../components/cards/CodexTradeItemCard";
import { ScreenHeader } from "../components/layout/ScreenHeader";
import { TRADE_ITEM_POOL, marketCatalog } from "../data/market";
import { MAX_LEVEL, PART_CATEGORIES } from "../data/parts";
import { SITES } from "../data/sites";

export function CodexScreen({ onBack }) {
  const [tab, setTab] = useState("parts");
  const tabs = [
    { key: "parts", label: "PARTS" },
    { key: "sites", label: "SITES" },
    { key: "special", label: "SPECIAL ITEM" },
    { key: "items", label: "ITEMS" },
  ];
  const totalParts = PART_CATEGORIES.reduce((sum, c) => sum + c.items.length, 0);

  return (
    <div className="px-4 pt-5 pb-6">
      <ScreenHeader title="CODEX" onBack={onBack} />

      <div className="mt-3 rounded-2xl bg-gradient-to-br from-indigo-950/70 via-[#140a2e]/80 to-purple-950/60 border border-indigo-400/20 px-4 py-3 shadow-[0_0_25px_-10px_rgba(124,58,237,0.35)]">
        <div className="flex items-center gap-1.5 text-[11px] font-extrabold tracking-[0.15em] text-indigo-200">
          <BookOpen size={13} />
          FULL GAME REFERENCE
        </div>
        <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
          Every part, mining site, special item, and tradeable item in AETHER MINING.
        </p>
        <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10.5px] font-semibold text-slate-300">
          <span className="flex items-center gap-1">
            <Cpu size={11} className="text-cyan-300" />
            {totalParts} Parts
          </span>
          <span className="flex items-center gap-1">
            <MapPinned size={11} className="text-emerald-300" />
            {SITES.length} Sites
          </span>
          <span className="flex items-center gap-1">
            <Sparkles size={11} className="text-fuchsia-300" />
            {marketCatalog.length} Special
          </span>
          <span className="flex items-center gap-1">
            <Package size={11} className="text-amber-300" />
            {TRADE_ITEM_POOL.length} Items
          </span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-4 gap-1.5 bg-white/5 border border-white/10 rounded-xl p-1">
        {tabs.map((t) => (
          <button
            type="button"
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-lg py-2 text-[9.5px] font-bold tracking-wide leading-tight transition ${
              tab === t.key ? "bg-blue-600 text-white shadow-[0_0_14px_rgba(37,99,235,0.55)]" : "text-slate-400"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "parts" && (
        <div className="mt-4 flex flex-col gap-4">
          {PART_CATEGORIES.map((cat) => (
            <div key={cat.key}>
              <div className="flex items-center gap-1.5 mb-1">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: `${cat.color}22`, border: `1px solid ${cat.color}55` }}
                >
                  <cat.icon size={14} style={{ color: cat.color }} />
                </div>
                <span className="text-[12px] font-extrabold tracking-[0.08em] text-white">{cat.label.toUpperCase()}</span>
                <span className="text-[10px] text-slate-500 font-mono">({cat.items.length})</span>
                <div className="flex-1 h-px bg-white/10" />
              </div>
              {cat.roleDesc && <p className="mb-2 text-[10.5px] leading-snug text-slate-400 pl-9">{cat.roleDesc}</p>}
              <div className="flex flex-col gap-2">
                {cat.items.map((item, i) => (
                  <CodexPartCard key={item.id} item={item} category={cat} index={i} />
                ))}
              </div>
            </div>
          ))}
          <div className="text-center text-[10px] text-slate-500 mt-1">Buy parts in the Shop, then level them up to Lv.{MAX_LEVEL} in the Upgrade menu.</div>
        </div>
      )}

      {tab === "sites" && (
        <div className="mt-4 flex flex-col gap-2.5">
          {SITES.map((site, i) => (
            <div
              key={site.id}
              className="relative rounded-2xl bg-white/5 border border-white/10 p-3.5 flex items-center gap-3 backdrop-blur-sm overflow-hidden"
            >
              <div className="absolute left-0 top-0 bottom-0 w-1" style={{ background: site.theme.accent, boxShadow: `0 0 10px ${site.theme.accent}` }} />
              <span className="text-[10px] font-mono font-bold text-slate-600 shrink-0 w-4 text-center">{i + 1}</span>
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                style={{
                  background: `${site.theme.accent}22`,
                  border: `1px solid ${site.theme.accent}55`,
                  boxShadow: `0 0 12px -2px ${site.theme.accent}99`,
                }}
              >
                <site.icon
                  size={17}
                  style={{
                    color: site.theme.accent,
                    filter: `drop-shadow(0 0 4px ${site.theme.accent}) drop-shadow(0 0 8px ${site.theme.accent}88)`,
                  }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-bold text-white">{site.name}</div>
                <div className="text-[11px] text-slate-400 leading-snug">{site.desc}</div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-[11.5px] font-extrabold text-emerald-400">×{site.bonus.toFixed(2)}</div>
                <div className="text-[9px] text-slate-500 font-semibold mt-0.5">hashrate</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "special" && (
        <div className="mt-4 flex flex-col gap-2.5">
          <p className="text-[10.5px] leading-snug text-slate-400 px-0.5">
            Premium items from the Shop's Special section. Each always adds Hashrate, and most also carry a second
            themed bonus (Cooling, Mining Cap, or Bonus Income) shown below their hashrate line.
          </p>
          {marketCatalog.map((item) => (
            <CodexMarketCard key={item.id} item={item} />
          ))}
        </div>
      )}

      {tab === "items" && (
        <div className="mt-4 flex flex-col gap-4">
          {["item", "material"].map((groupType) => {
            const group = TRADE_ITEM_POOL.filter((p) => p.type === groupType);
            if (group.length === 0) return null;
            return (
              <div key={groupType}>
                <div className="flex items-center gap-1.5 mb-2">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: "rgba(148,163,184,0.13)", border: "1px solid rgba(148,163,184,0.35)" }}
                  >
                    {groupType === "item" ? <Package size={14} className="text-slate-300" /> : <Gem size={14} className="text-slate-300" />}
                  </div>
                  <span className="text-[12px] font-extrabold tracking-[0.08em] text-white">
                    {groupType === "item" ? "ITEM" : "MATERIAL"}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">({group.length})</span>
                  <div className="flex-1 h-px bg-white/10" />
                </div>
                <div className="flex flex-col gap-2">
                  {group.map((p) => (
                    <CodexTradeItemCard key={p.name} poolItem={p} />
                  ))}
                </div>
              </div>
            );
          })}
          <div className="text-center text-[10px] text-slate-500 mt-1">
            Earn these through mining, or buy &amp; sell them with other miners in the Marketplace.
          </div>
        </div>
      )}
    </div>
  );
}
