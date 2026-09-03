import {
  Box,
  ChevronLeft,
  Cpu,
  HelpCircle,
  Sparkles,
} from "lucide-react";
import { AetherCoinIcon } from "../components/icons/CustomIcons";
import { MarketItemCard } from "../components/cards/MarketItemCard";
import { ShopItemCard } from "../components/cards/ShopItemCard";
import { LOOTBOX_COST } from "../data/lootbox";
import { AUTO_CLAIM_COST, marketCatalog } from "../data/market";
import { PART_CATEGORIES } from "../data/parts";
import { formatHashrate, formatInt } from "../lib/format";
import ICON_AUTOCLAIM from "../assets/images/icon-autoclaim.png";
import ICON_LOOTBOX from "../assets/images/icon-lootbox.png";

export function ShopScreen({ onBack, ownedItems, core, totalHashrate, onBuy, marketStock, marketOwned, onBuyMarket, autoClaimUnlocked, autoClaimActive, onBuyAutoClaim, onToggleAutoClaim, onOpenLootbox }) {
  const categorySections = PART_CATEGORIES.map((cat) => ({
    category: cat,
    items: cat.items.filter((item) => (ownedItems[item.id] || 0) <= 0),
  })).filter((section) => section.items.length > 0);
  const totalAvailable = categorySections.reduce((sum, s) => sum + s.items.length, 0);

  return (
    <div className="px-4 pt-4 pb-4 h-full flex flex-col">
      <div className="flex items-center justify-between shrink-0">
        <button
          type="button"
          onClick={onBack}
          className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center active:scale-90 transition"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="text-[14px] font-extrabold tracking-[0.15em] text-white">SHOP</span>
        <button
          type="button"
          className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center active:scale-90 transition"
        >
          <HelpCircle size={15} className="text-cyan-300" />
        </button>
      </div>

      <div className="mt-3 shrink-0 rounded-xl bg-gradient-to-br from-indigo-950/70 via-[#140a2e]/80 to-purple-950/60 border border-indigo-400/20 px-4 py-2 text-center shadow-[0_0_25px_-10px_rgba(124,58,237,0.35)]">
        <div className="text-[9px] tracking-[0.22em] text-slate-400 font-semibold">TOTAL HASHRATE</div>
        <div className="mt-0.5 text-xl font-extrabold text-white">{formatHashrate(totalHashrate)}</div>
      </div>

      <div className="mt-3 text-[11px] text-slate-500">Parts you've bought can be leveled up in the Craft &gt; UPGRADE menu.</div>

      <div className="mt-3 flex-1 min-h-0 overflow-y-auto flex flex-col gap-4 pb-1">
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Cpu size={13} className="text-emerald-300" />
            <span className="text-[11px] font-extrabold tracking-[0.12em] text-white">AUTOMATION</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>
          <div className="rounded-2xl bg-white/5 border border-white/10 p-3.5 flex items-center gap-3 backdrop-blur-sm">
            <div
              className="w-12 h-12 shrink-0 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(160deg, #10b98140 0%, #0d1420 85%)", border: "1px solid #10b98166" }}
            >
              <img src={ICON_AUTOCLAIM} alt="" className="w-8 h-8 object-contain" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[12.5px] font-bold text-white">Auto-Claim Module</div>
              <div className="text-[10.5px] text-slate-400 leading-snug">
                {autoClaimUnlocked ? "Automatically claims your pending AETHER every few seconds." : "Claims pending AETHER for you — no more tapping the Claim button."}
              </div>
            </div>
            {autoClaimUnlocked ? (
              <button
                type="button"
                onClick={onToggleAutoClaim}
                className={`shrink-0 rounded-full px-3 py-2 text-[11px] font-extrabold transition active:scale-[0.97] ${
                  autoClaimActive ? "bg-gradient-to-b from-emerald-500 to-green-600 text-white" : "bg-white/10 text-slate-400"
                }`}
              >
                {autoClaimActive ? "ON" : "OFF"}
              </button>
            ) : (
              <button
                type="button"
                onClick={onBuyAutoClaim}
                disabled={core < AUTO_CLAIM_COST}
                className={`shrink-0 rounded-lg px-3 py-2 flex items-center gap-1 text-[11px] font-extrabold transition active:scale-[0.97] ${
                  core >= AUTO_CLAIM_COST
                    ? "bg-gradient-to-b from-emerald-500 to-green-600 text-white shadow-[0_2px_10px_-2px_rgba(34,197,94,0.6)]"
                    : "bg-white/5 text-slate-500"
                }`}
              >
                <AetherCoinIcon size={11} dim={core < AUTO_CLAIM_COST} />
                {formatInt(AUTO_CLAIM_COST)}
              </button>
            )}
          </div>
        </div>

        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Box size={13} className="text-fuchsia-300" />
            <span className="text-[11px] font-extrabold tracking-[0.12em] text-white">LOOT BOX</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>
          <div className="rounded-2xl bg-white/5 border border-white/10 p-3.5 flex items-center gap-3 backdrop-blur-sm">
            <div
              className="w-12 h-12 shrink-0 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(160deg, #d946ef40 0%, #0d1420 85%)", border: "1px solid #d946ef66" }}
            >
              <img src={ICON_LOOTBOX} alt="" className="w-8 h-8 object-contain" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[12.5px] font-bold text-white">Lucky Loot Box</div>
              <div className="text-[10.5px] text-slate-400 leading-snug">Random AETHER, Materials, or a free Part — {formatInt(LOOTBOX_COST)} AETHER per try.</div>
            </div>
            <button
              type="button"
              onClick={onOpenLootbox}
              disabled={core < LOOTBOX_COST}
              className={`shrink-0 rounded-lg px-3 py-2 flex items-center gap-1 text-[11px] font-extrabold transition active:scale-[0.97] ${
                core >= LOOTBOX_COST
                  ? "bg-gradient-to-b from-fuchsia-500 to-purple-600 text-white shadow-[0_2px_10px_-2px_rgba(217,70,239,0.6)]"
                  : "bg-white/5 text-slate-500"
              }`}
            >
              <Box size={11} className={core >= LOOTBOX_COST ? "text-white" : "text-slate-600"} />
              OPEN
            </button>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Sparkles size={13} className="text-amber-300" />
            <span className="text-[11px] font-extrabold tracking-[0.12em] text-white">SPECIAL ITEM</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {marketCatalog.map((item) => (
              <MarketItemCard
                key={item.id}
                item={item}
                stock={marketStock[item.id]}
                owned={marketOwned[item.id]}
                core={core}
                onBuy={onBuyMarket}
              />
            ))}
          </div>
        </div>

        {totalAvailable === 0 && (
          <div className="text-center text-[12px] text-slate-500 mt-6">You already own every part.</div>
        )}
        {categorySections.map(({ category, items }) => {
          const CatIcon = category.icon;
          return (
            <div key={category.key}>
              <div className="flex items-center gap-1.5 mb-2">
                <CatIcon size={13} style={{ color: category.color }} />
                <span className="text-[11px] font-extrabold tracking-[0.12em] text-white">{category.label.toUpperCase()}</span>
                <div className="flex-1 h-px bg-white/10" />
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                {items.map((item) => (
                  <ShopItemCard key={item.id} item={item} category={category} core={core} onBuy={onBuy} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
