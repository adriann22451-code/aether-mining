import { useEffect, useState } from "react";
import { Blocks, Boxes, Coins, Flame, Gauge, Ghost, Layers, PiggyBank, Vault, Zap } from "lucide-react";
import { AetherCoinIcon } from "../components/icons/CustomIcons";
import { ScreenHeader } from "../components/layout/ScreenHeader";
import {
  AETHER_MAX_SUPPLY,
  BLOCK_TIME_SECONDS,
  GHOST_HASHRATE,
  HALVING_INTERVAL_BLOCKS,
  INITIAL_BLOCK_REWARD,
  TREASURY_TAX_RATE,
} from "../data/economy";
import { callFunction } from "../lib/api";
import { formatCore, formatHashrate, formatInt } from "../lib/format";

const SUBSIDY_UNLOCK_HASHRATE = 10e12; // keep in sync with backend get_network_stats() (was 100e12, see migration 0011)

function timeAgo(iso) {
  const secs = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (secs < 60) return `${secs}s ago`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

function StatRow({ icon: Icon, label, value, valueColor = "#e2e8f0", iconColor = "#38bdf8" }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
        style={{ background: `${iconColor}22`, border: `1px solid ${iconColor}55` }}
      >
        <Icon size={14} style={{ color: iconColor }} />
      </div>
      <span className="flex-1 text-[11.5px] font-semibold text-slate-300">{label}</span>
      <span className="text-[12px] font-extrabold" style={{ color: valueColor }}>{value}</span>
    </div>
  );
}

export function NetworkStatsScreen({ onBack, isBackendOnline, totalMined, totalHashrate }) {
  const [tab, setTab] = useState("tokenomics");
  const [stats, setStats] = useState(null);
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(isBackendOnline);
  const [error, setError] = useState(null);
  const [nextBlockIn, setNextBlockIn] = useState(null);

  useEffect(() => {
    if (!isBackendOnline) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    callFunction("sync-player", { action: "network_stats" })
      .then(({ stats: s, blocks: b }) => {
        if (cancelled) return;
        setStats(s);
        setBlocks(b || []);
        setNextBlockIn(Math.round(Number(s.next_block_in_seconds)));
        setError(null);
      })
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [isBackendOnline]);

  // ticks the "next block in Xs" countdown locally between server refreshes
  useEffect(() => {
    if (nextBlockIn === null) return;
    const t = setInterval(() => {
      setNextBlockIn((s) => (s === null ? null : s <= 0 ? 60 : s - 1));
    }, 1000);
    return () => clearInterval(t);
  }, [nextBlockIn === null]);

  const epoch = stats ? stats.current_epoch : 0;
  const currentBlockReward = stats ? stats.current_block_reward : INITIAL_BLOCK_REWARD;
  const mined = stats ? Number(stats.total_mined) : totalMined;
  const carryover = stats ? Number(stats.carryover_pool) : 0;
  const realActiveHashrate = stats ? Number(stats.real_active_hashrate) : totalHashrate;
  const subsidyActive = stats ? stats.subsidy_active : false;
  const treasury = stats ? Number(stats.treasury_pool) : 0;
  const reserve = stats ? Number(stats.reserve_pool) : 0;
  const supplyPct = Math.min(100, (mined / AETHER_MAX_SUPPLY) * 100);
  const carryoverPct = Math.min(100, (carryover / AETHER_MAX_SUPPLY) * 100);
  const treasuryPct = Math.min(100, (treasury / AETHER_MAX_SUPPLY) * 100);
  const reservePct = Math.min(100, (reserve / AETHER_MAX_SUPPLY) * 100);
  const subsidyProgressPct = Math.min(100, (realActiveHashrate / SUBSIDY_UNLOCK_HASHRATE) * 100);

  return (
    <div className="px-4 pt-5 pb-6">
      <ScreenHeader title="NETWORK STATS" onBack={onBack} />

      {!isBackendOnline && (
        <div className="mt-3 rounded-xl bg-amber-500/10 border border-amber-400/30 px-3 py-2 text-[10.5px] text-amber-200">
          Not connected to the shared network right now — showing tokenomics reference numbers only. Live supply, carryover pool, and the block explorer need a connection.
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 gap-2 bg-white/5 border border-white/10 rounded-xl p-1">
        {[
          { key: "tokenomics", label: "Tokenomics", icon: Coins },
          { key: "explorer", label: "Block Explorer", icon: Blocks },
        ].map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-[11px] font-extrabold tracking-wide transition ${
              tab === t.key ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/40" : "text-slate-400"
            }`}
          >
            <t.icon size={13} />
            {t.label}
          </button>
        ))}
      </div>

      {tab === "tokenomics" ? (
        <>
          {/* SUPPLY OVERVIEW */}
          <div className="mt-4 rounded-2xl bg-gradient-to-br from-indigo-950/70 via-[#140a2e]/80 to-purple-950/60 border border-indigo-400/20 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[12px] font-extrabold tracking-[0.1em] text-white">
                <AetherCoinIcon size={14} />
                CIRCULATING SUPPLY
              </div>
              <span className="text-[10.5px] font-semibold text-slate-400">Epoch {epoch}</span>
            </div>
            {nextBlockIn !== null && (
              <div className="mt-1 flex items-center gap-1.5 text-[10px] text-cyan-300">
                <Blocks size={11} />
                Next block in {nextBlockIn}s
              </div>
            )}
            <div className="mt-2 h-2 rounded-full bg-black/40 overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-500" style={{ width: `${supplyPct}%` }} />
            </div>
            <div className="mt-1.5 flex items-center justify-between text-[10.5px]">
              <span className="text-slate-400">{formatCore(mined)} / {formatInt(AETHER_MAX_SUPPLY)} minted</span>
              <span className="font-bold text-amber-300">{supplyPct.toFixed(supplyPct < 1 ? 3 : 1)}%</span>
            </div>

            {/* CARRYOVER POOL */}
            <div className="mt-3 pt-3 border-t border-white/10">
              <div className="flex items-center gap-1.5 text-[11px] font-extrabold tracking-[0.08em] text-fuchsia-300">
                <PiggyBank size={13} />
                CARRYOVER POOL (RESERVED)
              </div>
              <div className="mt-2 h-2 rounded-full bg-black/40 overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-fuchsia-400 to-purple-500 transition-all duration-500" style={{ width: `${carryoverPct}%` }} />
              </div>
              <div className="mt-1.5 flex items-center justify-between text-[10.5px]">
                <span className="text-slate-400">{formatCore(carryover)} AETHER banked</span>
                <span className="font-bold text-fuchsia-300">{carryoverPct.toFixed(3)}%</span>
              </div>
              <p className="mt-2 text-[10px] leading-relaxed text-slate-500">
                Whenever the network is quiet, the ghost hashrate floor (below) means active miners don't claim 100% of that block's reward. The unclaimed remainder isn't lost — it's banked here, then released back out as a subsidy once enough real players are mining together. Minted + banked can never exceed the 100M max supply.
              </p>
              <div className="mt-3 flex items-center justify-between text-[10px]">
                <span className="text-slate-400">Subsidy unlock progress (real network hashrate vs {formatHashrate(SUBSIDY_UNLOCK_HASHRATE)})</span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-black/40 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${subsidyActive ? "bg-emerald-400" : "bg-slate-500"}`}
                  style={{ width: `${subsidyProgressPct}%` }}
                />
              </div>
              <div className="mt-1 text-[10px] font-bold" style={{ color: subsidyActive ? "#34d399" : "#94a3b8" }}>
                {subsidyActive ? "SUBSIDY ACTIVE — carryover pool is draining back out to active miners" : "Subsidy locked — needs more real active hashrate network-wide"}
              </div>
            </div>
          </div>

          {/* TREASURY & RESERVE POOLS */}
          <div className="mt-4 rounded-2xl bg-white/5 border border-white/10 p-4">
            <div className="flex items-center gap-1.5 text-[12px] font-extrabold tracking-[0.1em] text-white">
              <Vault size={14} className="text-emerald-300" />
              TREASURY POOL
            </div>
            <div className="mt-2 h-2 rounded-full bg-black/40 overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 transition-all duration-500" style={{ width: `${treasuryPct}%` }} />
            </div>
            <div className="mt-1.5 flex items-center justify-between text-[10.5px]">
              <span className="text-slate-400">{formatCore(treasury)} AETHER banked</span>
              <span className="font-bold text-emerald-300">{(TREASURY_TAX_RATE * 100).toFixed(0)}% of every block</span>
            </div>
            <p className="mt-2 text-[10px] leading-relaxed text-slate-500">
              5% of every block's reward is redirected here automatically the moment that block mints — every 60 seconds, network-wide, whether or not anyone happens to claim anything that minute. The accounted-for source for future Missions, Events, Daily Streak, Guild, and Loot Box rewards, instead of AETHER just appearing from nowhere.
            </p>

            <div className="mt-4 pt-3 border-t border-white/10 flex items-center gap-1.5 text-[12px] font-extrabold tracking-[0.1em] text-white">
              <Layers size={14} className="text-sky-300" />
              RESERVE POOL
            </div>
            <div className="mt-2 h-2 rounded-full bg-black/40 overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-sky-400 to-blue-500 transition-all duration-500" style={{ width: `${reservePct}%` }} />
            </div>
            <div className="mt-1.5 flex items-center justify-between text-[10.5px]">
              <span className="text-slate-400">{formatCore(reserve)} AETHER banked</span>
              <span className="font-bold text-sky-300">from Shop + Upgrades</span>
            </div>
            <p className="mt-2 text-[10px] leading-relaxed text-slate-500">
              Every AETHER spent on Shop purchases, part upgrades, crafting, and Mining Site unlocks is banked here in full — earmarked for the upcoming AETHER staking-reward feature.
            </p>
          </div>

          {/* BLOCK REWARD SCHEDULE */}
          <div className="mt-4 rounded-2xl bg-white/5 border border-white/10 p-4">
            <div className="flex items-center gap-1.5 text-[12px] font-extrabold tracking-[0.1em] text-white">
              <Zap size={14} className="text-cyan-300" />
              BLOCK REWARD SCHEDULE
            </div>
            <div className="mt-1 divide-y divide-white/5">
              <StatRow icon={Boxes} label="Block time" value={`${BLOCK_TIME_SECONDS}s`} iconColor="#38bdf8" />
              <StatRow icon={AetherCoinIcon} label="Initial block reward (epoch 0)" value={`${formatInt(INITIAL_BLOCK_REWARD)} AETHER`} valueColor="#facc15" iconColor="#facc15" />
              <StatRow icon={Blocks} label="Halving interval" value={`${formatInt(HALVING_INTERVAL_BLOCKS)} blocks`} iconColor="#c084fc" />
              <StatRow icon={Flame} label="Current block reward" value={`${formatCore(currentBlockReward)} AETHER`} valueColor="#fb923c" iconColor="#fb923c" />
              <StatRow icon={Ghost} label="Ghost hashrate (difficulty floor)" value={formatHashrate(GHOST_HASHRATE)} valueColor="#94a3b8" iconColor="#94a3b8" />
              <StatRow icon={Gauge} label="Real active network hashrate" value={formatHashrate(realActiveHashrate)} iconColor="#38bdf8" />
            </div>
            <p className="mt-3 text-[10px] leading-relaxed text-slate-500">
              Reward halves every {formatInt(HALVING_INTERVAL_BLOCKS)} blocks at the reference pace — {formatInt(INITIAL_BLOCK_REWARD)} → {formatInt(INITIAL_BLOCK_REWARD / 2)} → {formatInt(INITIAL_BLOCK_REWARD / 4)} → ... — same shape as Bitcoin's halving. Summed over every halving era this totals exactly the 100M max supply, asymptotically approached and never exceeded.
            </p>
          </div>
        </>
      ) : (
        <div className="mt-4">
          {nextBlockIn !== null && (
            <div className="mb-3 rounded-xl bg-cyan-500/10 border border-cyan-400/30 px-3 py-2 flex items-center justify-between">
              <span className="text-[10.5px] text-cyan-200">Next block mints in</span>
              <span className="text-[13px] font-extrabold text-cyan-300">{nextBlockIn}s</span>
            </div>
          )}
          {loading && <div className="text-center text-[11px] text-slate-400 py-8">Loading block explorer…</div>}
          {error && <div className="text-center text-[11px] text-red-400 py-8">{error}</div>}
          {!loading && !error && blocks.length === 0 && (
            <div className="text-center text-[11px] text-slate-500 py-8">No blocks minted yet — a new block mints network-wide every 60 seconds.</div>
          )}
          <div className="flex flex-col gap-2">
            {blocks.map((b, i) => (
              <div key={i} className="rounded-xl bg-white/5 border border-white/10 px-3 py-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold text-white truncate">Block · Epoch {b.halving_epoch}</span>
                  <span className="text-[9.5px] text-slate-500 shrink-0">{timeAgo(b.block_time)}</span>
                </div>
                <div className="mt-1 flex items-center justify-between text-[10.5px]">
                  <span className="text-slate-400">{b.active_miners} active miner{b.active_miners === 1 ? "" : "s"} · {formatHashrate(b.active_hashrate)}</span>
                  <span className="font-bold text-amber-300">+{formatCore(b.total_reward)} AETHER</span>
                </div>
                {(b.subsidy_reward > 0 || b.treasury_cut > 0) && (
                  <div className="mt-1 flex flex-col gap-0.5">
                    {b.subsidy_reward > 0 && (
                      <div className="text-[9.5px] text-fuchsia-300">incl. {formatCore(b.subsidy_reward)} subsidy from carryover pool</div>
                    )}
                    {b.treasury_cut > 0 && (
                      <div className="text-[9.5px] text-emerald-300">{formatCore(b.treasury_cut)} sent to Treasury pool (5% of this block)</div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
