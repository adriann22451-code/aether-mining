import { useState } from "react";
import {
  ArrowUpCircle,
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

  return (
    <div className="px-4 pt-5 pb-6">
      <ScreenHeader title="CRAFT" onBack={onBack} />

      <div className="mt-4 grid grid-cols-2 gap-1.5 bg-white/5 border border-white/10 rounded-xl p-1">
        <button
          type="button"
          onClick={() => setTab("upgrade")}
          className={`rounded-lg py-2 text-[11.5px] font-bold tracking-wide transition ${
            tab === "upgrade" ? "bg-blue-600 text-white shadow-[0_0_14px_rgba(37,99,235,0.55)]" : "text-slate-400"
          }`}
        >
          UPGRADE
        </button>
        <button
          type="button"
          onClick={() => setTab("craft")}
          className={`rounded-lg py-2 text-[11.5px] font-bold tracking-wide transition ${
            tab === "craft" ? "bg-blue-600 text-white shadow-[0_0_14px_rgba(37,99,235,0.55)]" : "text-slate-400"
          }`}
        >
          CRAFT
        </button>
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
          <div className="mt-3 text-[11px] text-slate-500">Combine Materials + AETHER to craft a part directly, no Shop trip needed.</div>
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
