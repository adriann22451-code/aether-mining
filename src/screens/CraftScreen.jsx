import { useState } from "react";
import {
  ArrowUpCircle,
  Hammer,
  TrendingUp,
} from "lucide-react";
import { CraftRecipeCard } from "../components/cards/CraftRecipeCard";
import { PartCard } from "../components/cards/PartCard";
import { ScreenHeader } from "../components/layout/ScreenHeader";
import { CRAFT_RECIPES } from "../data/craft";
import { PART_CATEGORIES } from "../data/parts";
import { formatHashrate } from "../lib/format";

export function CraftScreen({ onBack, ownedItems, core, totalHashrate, inventory, onUpgrade, onCraft, onUpgradeAll, bulkUpgradeNotice }) {
  const [tab, setTab] = useState("upgrade");
  const ownedList = [];
  PART_CATEGORIES.forEach((cat) => {
    cat.items.forEach((item) => {
      const lvl = ownedItems[item.id] || 0;
      if (lvl > 0) ownedList.push({ item, category: cat, level: lvl });
    });
  });

  const tabs = [
    { key: "upgrade", label: "Upgrade", icon: TrendingUp, count: ownedList.length },
    { key: "craft", label: "Craft", icon: Hammer, count: CRAFT_RECIPES.length },
  ];

  return (
    <div className="px-4 pt-5 pb-6">
      <ScreenHeader title="CRAFT" onBack={onBack} />

      <div className="mt-4 flex gap-1.5">
        {tabs.map((t) => {
          const TabIcon = t.icon;
          const active = tab === t.key;
          return (
            <button
              type="button"
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`relative flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2.5 border transition ${
                active
                  ? "bg-gradient-to-b from-fuchsia-600/90 to-purple-700/90 border-fuchsia-400/50 shadow-[0_0_16px_-2px_rgba(217,70,239,0.6)]"
                  : "bg-white/[0.04] border-white/10"
              }`}
            >
              <TabIcon size={14} className={active ? "text-white" : "text-slate-500"} />
              <span className={`text-[11px] font-extrabold tracking-wide uppercase ${active ? "text-white" : "text-slate-500"}`}>
                {t.label}
              </span>
              {t.count > 0 && (
                <span
                  className={`min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center text-[8.5px] font-extrabold ${
                    active ? "bg-amber-400 text-[#1a1200]" : "bg-white/10 text-slate-300"
                  }`}
                >
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {tab === "upgrade" ? (
        <>
          <div className="mt-4 rounded-xl bg-gradient-to-br from-indigo-950/70 via-[#140a2e]/80 to-purple-950/60 border border-indigo-400/20 px-4 py-2 text-center shadow-[0_0_25px_-10px_rgba(124,58,237,0.35)]">
            <div className="text-[9px] tracking-[0.22em] text-slate-400 font-semibold">TOTAL HASHRATE</div>
            <div className="mt-0.5 text-xl font-extrabold text-white">{formatHashrate(totalHashrate)}</div>
          </div>

          {bulkUpgradeNotice && (
            <div className="mt-3 rounded-xl bg-emerald-500/10 border border-emerald-400/30 px-3 py-2 text-[11.5px] font-semibold text-emerald-300 text-center">
              {bulkUpgradeNotice}
            </div>
          )}

          {ownedList.length > 0 && (
            <button
              type="button"
              onClick={onUpgradeAll}
              className="mt-3 w-full rounded-xl py-2.5 flex items-center justify-center gap-1.5 text-[12px] font-extrabold text-white bg-gradient-to-b from-emerald-500 to-teal-600 shadow-[0_0_14px_-2px_rgba(16,185,129,0.5)] active:scale-[0.98] transition"
            >
              <ArrowUpCircle size={14} />
              UPGRADE ALL (cheapest first)
            </button>
          )}

          <div className="mt-4 flex flex-col gap-2.5">
            {ownedList.length === 0 && (
              <div className="text-center text-[12px] text-slate-500 mt-6">No parts yet. Buy some in the SHOP menu first.</div>
            )}
            {ownedList.map(({ item, category, level }) => (
              <PartCard key={item.id} item={item} category={category} level={level} core={core} onUpgrade={onUpgrade} />
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-500">
            <Hammer size={12} className="text-fuchsia-400 shrink-0" />
            Combine Materials + AETHER to craft a part directly, no Shop trip needed.
          </div>
          <div className="mt-3 flex flex-col gap-2.5">
            {CRAFT_RECIPES.map((recipe) => (
              <CraftRecipeCard key={recipe.id} recipe={recipe} inventory={inventory} core={core} onCraft={onCraft} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
