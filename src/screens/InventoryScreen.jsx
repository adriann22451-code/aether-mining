import { useState } from "react";
import {
  ArrowUpCircle,
  Boxes,
  Cpu,
  LayoutGrid,
  Layers,
} from "lucide-react";
import { AetherCoinIcon } from "../components/icons/CustomIcons";
import { InventoryItemCard } from "../components/cards/InventoryItemCard";
import { PartCard } from "../components/cards/PartCard";
import { ScreenHeader } from "../components/layout/ScreenHeader";
import { ItemDetailModal } from "../components/modals/ItemDetailModal";
import { AUTO_SELL_CAP } from "../data/market";
import { PART_CATEGORIES } from "../data/parts";
import { formatHashrate } from "../lib/format";

export function InventoryScreen({
  onBack,
  inventory,
  autoSellEnabled,
  onToggleAutoSell,
  ownedItems,
  core,
  onUpgrade,
  totalHashrate,
  onUpgradeAll,
  bulkUpgradeNotice,
}) {
  const [tab, setTab] = useState("all");
  const [selectedItem, setSelectedItem] = useState(null);

  const ownedList = [];
  PART_CATEGORIES.forEach((cat) => {
    cat.items.forEach((item) => {
      const lvl = ownedItems[item.id] || 0;
      if (lvl > 0) ownedList.push({ item, category: cat, level: lvl });
    });
  });

  const tabs = [
    { key: "all", label: "All", icon: LayoutGrid, count: inventory.length },
    { key: "parts", label: "Parts", icon: Cpu, count: ownedList.length },
    { key: "item", label: "Items", icon: Boxes, count: inventory.filter((i) => i.type === "item").length },
    { key: "material", label: "Mats", icon: Layers, count: inventory.filter((i) => i.type === "material").length },
  ];
  const filtered = tab === "all" ? inventory : inventory.filter((i) => i.type === tab);

  return (
    <div className="px-4 pt-5 pb-6">
      <ScreenHeader title="INVENTORY" onBack={onBack} />

      <div className="mt-4 flex gap-1.5">
        {tabs.map((t) => {
          const TabIcon = t.icon;
          const active = tab === t.key;
          return (
            <button
              type="button"
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`relative flex-1 flex flex-col items-center justify-center gap-1 rounded-xl py-2.5 border transition ${
                active
                  ? "bg-gradient-to-b from-blue-600/90 to-indigo-700/90 border-blue-400/50 shadow-[0_0_16px_-2px_rgba(37,99,235,0.65)]"
                  : "bg-white/[0.04] border-white/10"
              }`}
            >
              <TabIcon size={15} className={active ? "text-white" : "text-slate-500"} />
              <span className={`text-[9px] font-extrabold tracking-wide uppercase ${active ? "text-white" : "text-slate-500"}`}>
                {t.label}
              </span>
              {t.count > 0 && (
                <span
                  className={`absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center text-[8.5px] font-extrabold ${
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

      {tab === "parts" ? (
        <div className="mt-4 flex flex-col gap-2.5">
          <div className="rounded-xl bg-gradient-to-br from-indigo-950/70 via-[#140a2e]/80 to-purple-950/60 border border-indigo-400/20 px-4 py-2 text-center shadow-[0_0_25px_-10px_rgba(124,58,237,0.35)]">
            <div className="text-[9px] tracking-[0.22em] text-slate-400 font-semibold">TOTAL HASHRATE</div>
            <div className="mt-0.5 text-xl font-extrabold text-white">{formatHashrate(totalHashrate)}</div>
          </div>

          {bulkUpgradeNotice && (
            <div className="rounded-xl bg-emerald-500/10 border border-emerald-400/30 px-3 py-2 text-[11.5px] font-semibold text-emerald-300 text-center">
              {bulkUpgradeNotice}
            </div>
          )}

          {ownedList.length > 0 && (
            <button
              type="button"
              onClick={onUpgradeAll}
              className="w-full rounded-xl py-2.5 flex items-center justify-center gap-1.5 text-[12px] font-extrabold text-white bg-gradient-to-b from-emerald-500 to-teal-600 shadow-[0_0_14px_-2px_rgba(16,185,129,0.5)] active:scale-[0.98] transition"
            >
              <ArrowUpCircle size={14} />
              UPGRADE ALL (cheapest first)
            </button>
          )}

          <div className="text-[10.5px] text-slate-500 -mt-1 mb-1">Your rig parts — tap UPGRADE right on the card to level one up. Need a new part? Use the Craft menu.</div>
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
                <AetherCoinIcon size={15} />
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

          <div className="mt-4 flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">{filtered.length} items</span>
            <span className="text-[9.5px] text-slate-600">Tap a slot for details</span>
          </div>

          {filtered.length === 0 ? (
            <div className="text-center text-[12px] text-slate-500 mt-8">Nothing here yet.</div>
          ) : (
            <div className="mt-2.5 grid grid-cols-4 gap-2.5">
              {filtered.map((item) => (
                <InventoryItemCard key={item.id} item={item} onSelect={setSelectedItem} />
              ))}
            </div>
          )}

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
