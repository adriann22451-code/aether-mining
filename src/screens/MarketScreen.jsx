import { useMemo, useState } from "react";
import { Boxes, Package, ShoppingCart, Sparkles, Tag } from "lucide-react";
import { AetherCoinIcon } from "../components/icons/CustomIcons";
import { BuyListingCard } from "../components/cards/BuyListingCard";
import { MyListingCard } from "../components/cards/MyListingCard";
import { ScreenHeader } from "../components/layout/ScreenHeader";
import { parseInventoryQty } from "../data/inventory";
import { MARKET_FEE_RATE, TRADE_ITEM_POOL } from "../data/market";
import { RARITY_COLORS } from "../data/parts";
import { formatInt } from "../lib/format";

const TYPE_FILTERS = [
  { key: "all", label: "All", icon: Sparkles },
  { key: "item", label: "Items", icon: Package },
  { key: "material", label: "Materials", icon: Boxes },
];

export function MarketScreen({ onBack, core, inventory, marketListings, myListings, saleNotice, onBuyListing, onListItem, onCancelListing, isBackendOnline }) {
  const [tab, setTab] = useState("buy");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedName, setSelectedName] = useState("");
  const [priceInput, setPriceInput] = useState("");

  const sellableItems = useMemo(() => {
    return (inventory || [])
      .filter((it) => it.type !== "rig")
      .map((it) => {
        const poolItem = TRADE_ITEM_POOL.find((p) => p.name === it.name);
        if (!poolItem) return null;
        const qty = parseInventoryQty(it.tag);
        return qty > 0 ? { ...poolItem, qty } : null;
      })
      .filter(Boolean);
  }, [inventory]);

  const selected = sellableItems.find((it) => it.name === selectedName) || sellableItems[0] || null;
  const priceNum = parseInt(priceInput, 10) || 0;
  const netPreview = priceNum > 0 ? Math.max(1, Math.round(priceNum * (1 - MARKET_FEE_RATE))) : 0;
  const filteredListings = typeFilter === "all" ? marketListings : marketListings.filter((l) => l.type === typeFilter);

  const handleSelectItem = (name) => {
    setSelectedName(name);
    setPriceInput("");
  };

  const handleSubmitListing = () => {
    if (!selected || priceNum <= 0) return;
    onListItem(selected.name, priceNum);
    setPriceInput("");
  };

  return (
    <div className="px-4 pt-5 pb-6">
      <ScreenHeader title="MARKETPLACE" onBack={onBack} />

      {!isBackendOnline && (
        <div className="mt-3 rounded-xl bg-amber-500/10 border border-amber-400/30 px-3 py-2 text-[11px] font-semibold text-amber-300">
          Preview mode — showing demo listings. Connect the backend to trade with real players.
        </div>
      )}

      <div className="mt-3 flex items-center gap-2">
        <div className="flex-1 rounded-xl bg-white/5 border border-white/10 px-3 py-2 flex items-center justify-between">
          <span className="text-[9.5px] font-bold text-slate-500 uppercase tracking-wide">Balance</span>
          <div className="flex items-center gap-1 text-[12.5px] font-extrabold text-amber-300">
            <AetherCoinIcon size={13} />
            {formatInt(core)}
          </div>
        </div>
        <div className="flex-1 rounded-xl bg-white/5 border border-white/10 px-3 py-2 flex items-center justify-between">
          <span className="text-[9.5px] font-bold text-slate-500 uppercase tracking-wide">Listings</span>
          <span className="text-[12.5px] font-extrabold text-sky-300">{marketListings.length}</span>
        </div>
      </div>
      <div className="mt-1.5 text-[10px] text-slate-500 text-center">5% marketplace fee is deducted on every successful trade</div>

      <div className="mt-3 grid grid-cols-2 gap-1.5 bg-white/5 border border-white/10 rounded-xl p-1">
        <button
          type="button"
          onClick={() => setTab("buy")}
          className={`rounded-lg py-2 flex items-center justify-center gap-1.5 text-[11.5px] font-bold tracking-wide transition ${
            tab === "buy" ? "bg-gradient-to-b from-blue-500 to-indigo-600 text-white shadow-[0_0_14px_rgba(37,99,235,0.55)]" : "text-slate-400"
          }`}
        >
          <ShoppingCart size={13} />
          BUY
        </button>
        <button
          type="button"
          onClick={() => setTab("sell")}
          className={`rounded-lg py-2 flex items-center justify-center gap-1.5 text-[11.5px] font-bold tracking-wide transition ${
            tab === "sell" ? "bg-gradient-to-b from-blue-500 to-indigo-600 text-white shadow-[0_0_14px_rgba(37,99,235,0.55)]" : "text-slate-400"
          }`}
        >
          <Tag size={13} />
          SELL
        </button>
      </div>

      {tab === "buy" ? (
        <div className="mt-4">
          <div className="flex items-center gap-1.5 mb-3 overflow-x-auto no-scrollbar">
            {TYPE_FILTERS.map((f) => {
              const FIcon = f.icon;
              const active = typeFilter === f.key;
              return (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setTypeFilter(f.key)}
                  className={`shrink-0 flex items-center gap-1 rounded-full px-3 py-1.5 text-[10.5px] font-bold transition ${
                    active ? "bg-sky-500/20 border border-sky-400/50 text-sky-300" : "bg-white/5 border border-white/10 text-slate-400"
                  }`}
                >
                  <FIcon size={11} />
                  {f.label}
                </button>
              );
            })}
          </div>

          {filteredListings.length === 0 ? (
            <div className="mt-8 flex flex-col items-center text-center gap-2">
              <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                <ShoppingCart size={24} className="text-slate-600" />
              </div>
              <div className="text-[12px] font-bold text-slate-400">No listings right now</div>
              <div className="text-[10.5px] text-slate-500 max-w-[220px]">Check back soon, or switch to Sell and be the first to list something.</div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2.5">
              {filteredListings.map((listing) => (
                <BuyListingCard key={listing.id} listing={listing} core={core} onBuy={onBuyListing} />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="mt-4">
          {saleNotice && (
            <div className="mb-3 rounded-xl bg-emerald-500/10 border border-emerald-400/30 px-3 py-2 text-[11.5px] font-semibold text-emerald-300">
              {saleNotice}
            </div>
          )}

          <div className="rounded-2xl bg-white/5 border border-white/10 p-3.5">
            <div className="text-[11px] font-extrabold tracking-[0.12em] text-white mb-2.5">LIST AN ITEM</div>

            {sellableItems.length === 0 ? (
              <div className="py-4 flex flex-col items-center text-center gap-2">
                <Package size={26} className="text-slate-600" />
                <div className="text-[11.5px] text-slate-400 max-w-[240px]">You don't have any tradeable items yet. Mine, craft, or earn materials to list them here.</div>
              </div>
            ) : (
              <>
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                  {sellableItems.map((it) => {
                    const isSel = selected && selected.name === it.name;
                    const rarityColor = RARITY_COLORS[it.rarity] || RARITY_COLORS.Common;
                    const ItemIcon = it.icon;
                    return (
                      <button
                        key={it.name}
                        type="button"
                        onClick={() => handleSelectItem(it.name)}
                        className="relative shrink-0 w-16 flex flex-col items-center gap-1"
                      >
                        <div
                          className="relative w-14 h-14 rounded-xl flex items-center justify-center overflow-hidden transition"
                          style={{
                            background: `linear-gradient(160deg, ${rarityColor}33 0%, #0d1420 85%)`,
                            border: isSel ? `2px solid ${rarityColor}` : `1px solid ${rarityColor}55`,
                            boxShadow: isSel ? `0 0 12px -1px ${rarityColor}99` : undefined,
                          }}
                        >
                          {it.image ? (
                            <img src={it.image} alt={it.name} className="w-full h-full object-contain" />
                          ) : (
                            <ItemIcon size={26} style={{ color: rarityColor }} />
                          )}
                          <span className="absolute bottom-0 right-0 bg-black/80 text-white text-[8.5px] font-bold px-1 rounded-tl-md">x{it.qty}</span>
                        </div>
                        <span className="text-[8.5px] text-slate-400 truncate w-full text-center leading-tight">{it.name}</span>
                      </button>
                    );
                  })}
                </div>

                {selected && (
                  <div className="mt-3 flex flex-col gap-2.5">
                    <div className="flex items-center gap-1.5 text-[10.5px] text-slate-400">
                      Selling <span className="font-bold text-white">{selected.name}</span>
                      <span className="font-bold" style={{ color: RARITY_COLORS[selected.rarity] }}>{selected.rarity}</span>
                    </div>
                    <input
                      type="number"
                      min={1}
                      value={priceInput}
                      onChange={(e) => setPriceInput(e.target.value)}
                      placeholder="Asking price (AETHER)"
                      className="w-full rounded-lg bg-black/30 border border-white/10 px-3 py-2 text-[12.5px] text-white outline-none placeholder:text-slate-500"
                    />
                    <div className="flex gap-1.5">
                      {[0.9, 1, 1.15].map((mult) => {
                        const val = Math.max(1, Math.round((selected.basePrice * mult) / 10) * 10);
                        return (
                          <button
                            key={mult}
                            type="button"
                            onClick={() => setPriceInput(String(val))}
                            className="flex-1 rounded-lg bg-white/5 border border-white/10 py-1.5 text-[10.5px] font-bold text-slate-300 active:scale-[0.97] transition"
                          >
                            {formatInt(val)}
                          </button>
                        );
                      })}
                    </div>
                    {priceNum > 0 && (
                      <div className="text-[10.5px] text-slate-400">
                        You'll receive <span className="text-emerald-400 font-bold">{formatInt(netPreview)} AETHER</span> after the 5% marketplace fee
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={handleSubmitListing}
                      disabled={priceNum <= 0}
                      className={`w-full rounded-xl py-2.5 text-[12px] font-extrabold transition active:scale-[0.97] ${
                        priceNum > 0
                          ? "bg-gradient-to-b from-blue-500 to-indigo-600 text-white shadow-[0_0_16px_-2px_rgba(59,130,246,0.5)]"
                          : "bg-white/5 text-slate-500"
                      }`}
                    >
                      LIST FOR SALE
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="mt-4 text-[11px] font-extrabold tracking-[0.12em] text-white">MY LISTINGS ({myListings.length})</div>
          <div className="mt-2 flex flex-col gap-2.5">
            {myListings.length === 0 && (
              <div className="text-center text-[12px] text-slate-500 mt-4">You have no active listings.</div>
            )}
            {myListings.map((listing) => (
              <MyListingCard key={listing.id} listing={listing} onCancel={onCancelListing} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
