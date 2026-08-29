import { useState } from "react";
import { AetherCoinIcon } from "../components/icons/CustomIcons";
import { BuyListingCard } from "../components/cards/BuyListingCard";
import { MyListingCard } from "../components/cards/MyListingCard";
import { ScreenHeader } from "../components/layout/ScreenHeader";
import { MARKET_FEE_RATE, TRADE_ITEM_POOL } from "../data/market";
import { formatInt } from "../lib/format";

export function MarketScreen({ onBack, core, marketListings, myListings, saleNotice, onBuyListing, onListItem, onCancelListing, isBackendOnline }) {
  const [tab, setTab] = useState("buy");
  const [selectedName, setSelectedName] = useState(TRADE_ITEM_POOL[0]?.name || "");
  const [priceInput, setPriceInput] = useState("");
  const priceNum = parseInt(priceInput, 10) || 0;
  const netPreview = priceNum > 0 ? Math.max(1, Math.round(priceNum * (1 - MARKET_FEE_RATE))) : 0;

  const handleSubmitListing = () => {
    if (!selectedName || priceNum <= 0) return;
    onListItem(selectedName, priceNum);
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

      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[12px] font-bold text-amber-300">
          <AetherCoinIcon size={13} />
          {formatInt(core)} AETHER
        </div>
        <div className="text-[10.5px] text-slate-500">5% fee on every successful trade</div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-1.5 bg-white/5 border border-white/10 rounded-xl p-1">
        <button
          type="button"
          onClick={() => setTab("buy")}
          className={`rounded-lg py-2 text-[11.5px] font-bold tracking-wide transition ${
            tab === "buy" ? "bg-blue-600 text-white shadow-[0_0_14px_rgba(37,99,235,0.55)]" : "text-slate-400"
          }`}
        >
          BUY
        </button>
        <button
          type="button"
          onClick={() => setTab("sell")}
          className={`rounded-lg py-2 text-[11.5px] font-bold tracking-wide transition ${
            tab === "sell" ? "bg-blue-600 text-white shadow-[0_0_14px_rgba(37,99,235,0.55)]" : "text-slate-400"
          }`}
        >
          SELL
        </button>
      </div>

      {tab === "buy" ? (
        <div className="mt-4">
          <div className="text-[11px] text-slate-500 mb-2">Listings from other miners. Buy instantly at the asking price.</div>
          <div className="grid grid-cols-2 gap-2.5">
            {marketListings.map((listing) => (
              <BuyListingCard key={listing.id} listing={listing} core={core} onBuy={onBuyListing} />
            ))}
          </div>
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
            <div className="flex flex-col gap-2.5">
              <select
                value={selectedName}
                onChange={(e) => setSelectedName(e.target.value)}
                className="w-full rounded-lg bg-black/30 border border-white/10 px-3 py-2 text-[12.5px] text-white outline-none"
              >
                {TRADE_ITEM_POOL.map((p) => (
                  <option key={p.name} value={p.name} className="bg-[#0d1420]">
                    {p.name}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min={1}
                value={priceInput}
                onChange={(e) => setPriceInput(e.target.value)}
                placeholder="Asking price (AETHER)"
                className="w-full rounded-lg bg-black/30 border border-white/10 px-3 py-2 text-[12.5px] text-white outline-none placeholder:text-slate-500"
              />
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
