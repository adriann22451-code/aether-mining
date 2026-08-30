import { useState } from "react";
import { useTonConnectUI, useTonAddress } from "@tonconnect/ui-react";
import {
  Box,
  Gauge,
  Inbox,
  MapPinned,
  Network,
  Pencil,
  Wallet,
} from "lucide-react";
import { AetherCoinIcon } from "../components/icons/CustomIcons";
import { ScreenHeader } from "../components/layout/ScreenHeader";
import { AETHER_MAX_SUPPLY, calcPlayerLevel, miningHalvingEpoch, miningHalvingMultiplier } from "../data/economy";
import { SITES } from "../data/sites";
import { formatCore, formatHashrate, formatInt } from "../lib/format";

export function ProfileScreen({ onBack, totalEarned, totalHashrate, unlockedIndex, name, onRename, totalMined, isGlobalSupply, incomeStats, spendStats, onNavigate }) {
  const profileStats = [
    { id: 1, label: "TOTAL EARNED", value: `${formatCore(totalEarned)} AETHER`, valueColor: "#facc15", icon: AetherCoinIcon, iconColor: "#facc15" },
    { id: 2, label: "CURRENT HASHRATE", value: formatHashrate(totalHashrate), valueColor: "#38bdf8", icon: Gauge, iconColor: "#facc15" },
    { id: 3, label: "MINING SITE", value: `${unlockedIndex + 1} / ${SITES.length}`, valueColor: "#e2e8f0", icon: MapPinned, iconColor: "#38bdf8" },
  ];
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(name);
  const supplyPct = Math.min(100, (totalMined / AETHER_MAX_SUPPLY) * 100);
  const halvingEpoch = miningHalvingEpoch(totalMined);
  const halvingMultiplier = miningHalvingMultiplier(totalMined);
  const playerLevel = calcPlayerLevel(totalEarned);

  const [tonConnectUI] = useTonConnectUI();
  const tonAddress = useTonAddress();
  const formatTonAddress = (addr) => (addr ? `${addr.slice(0, 4)}…${addr.slice(-4)}` : "");

  const INCOME_LABELS = {
    mining: "Mining", offline: "Offline Earnings", dailyStreak: "Daily Streak", missions: "Missions",
    events: "Events", guild: "Guild", lootbox: "Loot Box", marketSales: "Market Sales", autoSell: "Auto-Sell", inbox: "Inbox",
  };
  const SPEND_LABELS = {
    shop: "Shop (Parts)", upgrades: "Upgrades", sites: "Sites", specialItems: "Special Items",
    boost: "Boost", autoClaim: "Auto-Claim", lootbox: "Loot Box", crafting: "Crafting", marketBuys: "Market Buys",
  };
  const incomeRows = Object.entries(incomeStats).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  const spendRows = Object.entries(spendStats).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  const totalIncomeSum = incomeRows.reduce((s, [, v]) => s + v, 0);
  const totalSpendSum = spendRows.reduce((s, [, v]) => s + v, 0);

  const commitName = () => {
    const trimmed = nameInput.trim();
    onRename(trimmed.length > 0 ? trimmed.slice(0, 20) : name);
    setIsEditingName(false);
  };

  return (
    <div className="px-4 pt-5 pb-6">
      <ScreenHeader title="PROFILE" onBack={onBack} />

      <div className="mt-4 rounded-2xl bg-white/5 border border-white/10 p-4 flex items-center gap-4 backdrop-blur-sm">
        <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-indigo-400 to-purple-600 flex items-center justify-center text-2xl overflow-hidden ring-2 ring-indigo-300/40 shrink-0">
          🧑‍🚀
        </div>
        <div className="flex-1 min-w-0">
          {isEditingName ? (
            <div className="flex items-center gap-1.5">
              <input
                autoFocus
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitName();
                  if (e.key === "Escape") {
                    setNameInput(name);
                    setIsEditingName(false);
                  }
                }}
                maxLength={20}
                className="flex-1 min-w-0 rounded-lg bg-black/30 border border-cyan-400/40 px-2 py-1 text-[14px] font-extrabold text-white outline-none"
              />
              <button
                type="button"
                onClick={commitName}
                className="shrink-0 rounded-lg bg-cyan-500/90 px-2.5 py-1 text-[11px] font-extrabold text-black active:scale-95 transition"
              >
                SAVE
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <span className="text-[15px] font-extrabold text-white truncate">{name}</span>
              <button
                type="button"
                onClick={() => {
                  setNameInput(name);
                  setIsEditingName(true);
                }}
                className="shrink-0 active:scale-90 transition"
              >
                <Pencil size={12} className="text-slate-400" />
              </button>
            </div>
          )}
          <div className="mt-1 text-[12px] font-bold text-slate-300">Lv. {playerLevel.level}</div>
          <div className="mt-1.5 flex items-center gap-2">
            <div className="flex-1 h-1.5 rounded-full bg-black/40 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-all duration-500"
                style={{ width: `${playerLevel.progressPct}%` }}
              />
            </div>
          </div>
          <div className="mt-1 text-[10px] text-slate-400 font-mono">
            {formatInt(playerLevel.intoLevel)} / {formatInt(playerLevel.reqForNext)}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2.5">
        {profileStats.map((stat) => (
          <div key={stat.id} className="rounded-2xl bg-white/5 border border-white/10 px-4 py-3 flex items-center gap-3 backdrop-blur-sm">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
              style={{ background: `${stat.iconColor}22`, border: `1px solid ${stat.iconColor}55` }}
            >
              <stat.icon size={16} style={{ color: stat.iconColor }} />
            </div>
            <span className="flex-1 text-[12px] font-bold text-slate-300 tracking-wide">{stat.label}</span>
            <span className="text-[13px] font-extrabold" style={{ color: stat.valueColor }}>
              {stat.value}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-2xl bg-gradient-to-br from-indigo-950/70 via-[#140a2e]/80 to-purple-950/60 border border-indigo-400/20 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[12px] font-extrabold tracking-[0.1em] text-white">
            <AetherCoinIcon size={14} />
            {isGlobalSupply ? "GLOBAL AETHER SUPPLY" : "AETHER SUPPLY (LOCAL)"}
          </div>
          <span className="text-[10.5px] font-semibold text-slate-400">Epoch {halvingEpoch}</span>
        </div>
        <div className="mt-2 h-2 rounded-full bg-black/40 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-500"
            style={{ width: `${supplyPct}%` }}
          />
        </div>
        <div className="mt-1.5 flex items-center justify-between text-[10.5px]">
          <span className="text-slate-400">
            {formatCore(totalMined)} / {formatInt(AETHER_MAX_SUPPLY)} {isGlobalSupply ? "mined network-wide" : "mined (this device)"}
          </span>
          <span className="font-bold text-amber-300">{(halvingMultiplier * 100).toFixed(halvingMultiplier < 0.01 ? 3 : 0)}% rate</span>
        </div>
        <p className="mt-2 text-[10px] leading-relaxed text-slate-500">
          {isGlobalSupply
            ? "The 100M supply is shared by every miner — your AETHER/sec is your share of the network's active hashrate, split like real mining difficulty. Missions, Events, Guild, and Loot Box rewards aren't affected."
            : "Not connected to the shared network right now, so this is a local-only estimate using just your own hashrate. Missions, Events, Guild, and Loot Box rewards aren't affected."}
        </p>
        {onNavigate && (
          <button
            type="button"
            onClick={() => onNavigate("networkStats")}
            className="mt-3 w-full rounded-xl bg-white/10 border border-white/15 py-2.5 flex items-center justify-center gap-2 text-[11px] font-extrabold tracking-wide text-indigo-200 active:scale-[0.98] transition"
          >
            <Network size={14} />
            VIEW NETWORK STATS
          </button>
        )}
      </div>

      <div className="mt-4 rounded-2xl bg-white/5 border border-white/10 p-4">
        <div className="flex items-center gap-1.5 text-[12px] font-extrabold tracking-[0.1em] text-white">
          <Gauge size={14} className="text-cyan-300" />
          AETHER ECONOMY
        </div>

        <div className="mt-3 text-[10px] font-bold tracking-[0.15em] text-emerald-400">INCOME BY SOURCE</div>
        <div className="mt-1.5 flex flex-col gap-1">
          {incomeRows.length === 0 && <div className="text-[10.5px] text-slate-500">No income yet.</div>}
          {incomeRows.map(([key, value]) => (
            <div key={key} className="flex items-center justify-between text-[11px]">
              <span className="text-slate-300">{INCOME_LABELS[key] || key}</span>
              <span className="font-semibold text-emerald-300">+{formatCore(value)}</span>
            </div>
          ))}
          {incomeRows.length > 0 && (
            <div className="flex items-center justify-between text-[11px] pt-1 mt-1 border-t border-white/10">
              <span className="font-bold text-white">Total</span>
              <span className="font-extrabold text-emerald-300">+{formatCore(totalIncomeSum)}</span>
            </div>
          )}
        </div>

        <div className="mt-4 text-[10px] font-bold tracking-[0.15em] text-rose-400">SPENDING BY CATEGORY</div>
        <div className="mt-1.5 flex flex-col gap-1">
          {spendRows.length === 0 && <div className="text-[10.5px] text-slate-500">No spending yet.</div>}
          {spendRows.map(([key, value]) => (
            <div key={key} className="flex items-center justify-between text-[11px]">
              <span className="text-slate-300">{SPEND_LABELS[key] || key}</span>
              <span className="font-semibold text-rose-300">-{formatCore(value)}</span>
            </div>
          ))}
          {spendRows.length > 0 && (
            <div className="flex items-center justify-between text-[11px] pt-1 mt-1 border-t border-white/10">
              <span className="font-bold text-white">Total</span>
              <span className="font-extrabold text-rose-300">-{formatCore(totalSpendSum)}</span>
            </div>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={() => (tonAddress ? tonConnectUI.disconnect() : tonConnectUI.openModal())}
        className={`mt-4 w-full rounded-2xl py-3.5 flex items-center justify-center gap-2 text-[13px] font-extrabold tracking-wide active:scale-[0.98] transition ${
          tonAddress
            ? "bg-emerald-600/90 text-white shadow-[0_0_18px_rgba(16,185,129,0.4)]"
            : "bg-blue-600/90 text-white shadow-[0_0_18px_rgba(37,99,235,0.4)]"
        }`}
      >
        <Wallet size={16} />
        {tonAddress ? `Connected · ${formatTonAddress(tonAddress)}` : "CONNECT WALLET"}
      </button>
    </div>
  );
}
