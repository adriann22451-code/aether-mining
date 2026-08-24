import { useState } from "react";
import {
  Coins,
  Inbox,
} from "lucide-react";
import { InventoryItemCard } from "../components/cards/InventoryItemCard";
import { PartCard } from "../components/cards/PartCard";
import { ScreenHeader } from "../components/layout/ScreenHeader";
import { ItemDetailModal } from "../components/modals/ItemDetailModal";
import { AUTO_SELL_CAP } from "../data/market";
import { PART_CATEGORIES } from "../data/parts";

export function InventoryScreen({ onBack, inventory, autoSellEnabled, onToggleAutoSell, ownedItems, core, onUpgrade }) {
  const [tab, setTab] = useState("all");
  const [selectedItem, setSelectedItem] = useState(null);
  const tabs = [
    { key: "all", label: "ALL" },
    { key: "parts", label: "PARTS" },
    { key: "item", label: "ITEM" },
    { key: "material", label: "MATERIAL" },
  ];
  const filtered = tab === "all" ? inventory : inventory.filter((i) => i.type === tab);

  const ownedList = [];
  PART_CATEGORIES.forEach((cat) => {
    cat.items.forEach((item) => {
      const lvl = ownedItems[item.id] || 0;
      if (lvl > 0) ownedList.push({ item, category: cat, level: lvl });
    });
  });

  return (
    <div className="px-4 pt-5 pb-6">
      <ScreenHeader title="INVENTORY" onBack={onBack} />

      <div className="mt-4 grid grid-cols-4 gap-1.5 bg-white/5 border border-white/10 rounded-xl p-1">
        {tabs.map((t) => (
          <button
            type="button"
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-lg py-2 text-[10.5px] font-bold tracking-wide transition ${
              tab === t.key ? "bg-blue-600 text-white shadow-[0_0_14px_rgba(37,99,235,0.55)]" : "text-slate-400"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "parts" ? (
        <div className="mt-4 flex flex-col gap-2.5">
          <div className="text-[10.5px] text-slate-500 -mt-1 mb-1">Your rig parts — tap UPGRADE right on the card to level one up. Need to upgrade a lot at once? Use the Craft menu.</div>
          {ownedList.length === 0 && (
            <div className="text-center text-[12px] text-slate-500 mt-6">No parts yet. Check your Inbox or buy some in the SHOP menu.</div>
          )}
          {ownedList.map(({ item, category, level }) => (
            <PartCard key={item.id} item={item} category={category} level={level} core={core} onUpgrade={onUpgrade} />
          ))}
        </div>
      ) : (
        <>
          {tab === "material" && (
            <div className="mt-4 rounded-2xl bg-white/5 border border-white/10 p-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-emerald-400/15 border border-emerald-400/40 flex items-center justify-center shrink-0">
                <Coins size={15} className="text-emerald-300" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-bold text-white">Auto-Sell Excess</div>
                <div className="text-[10px] text-slate-400 leading-snug">Materials over {AUTO_SELL_CAP} are sold for AETHER automatically (5% fee).</div>
              </div>
              <button
                type="button"
                onClick={onToggleAutoSell}
                className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-extrabold transition active:scale-[0.97] ${
                  autoSellEnabled ? "bg-gradient-to-b from-emerald-500 to-green-600 text-white" : "bg-white/10 text-slate-400"
                }`}
              >
                {autoSellEnabled ? "ON" : "OFF"}
              </button>
            </div>
          )}

          <div className="mt-4 grid grid-cols-3 gap-2.5">
            {filtered.map((item) => (
              <InventoryItemCard key={item.id} item={item} onSelect={setSelectedItem} />
            ))}
          </div>

          <button
            type="button"
            className="mt-5 w-full rounded-2xl bg-blue-600/90 py-3.5 flex items-center justify-center text-[13px] font-extrabold text-white tracking-wide active:scale-[0.98] transition shadow-[0_0_18px_rgba(37,99,235,0.4)]"
          >
            SELL IN BULK
          </button>
        </>
      )}

      <ItemDetailModal item={selectedItem} onClose={() => setSelectedItem(null)} />
    </div>
  );
}
