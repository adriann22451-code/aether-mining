import { useState, useEffect, useRef } from "react";
import {
  Box,
  Package,
} from "lucide-react";
import { BottomNav } from "./components/layout/BottomNav";
import { DailyStreakModal } from "./components/modals/DailyStreakModal";
import { LootBoxModal } from "./components/modals/LootBoxModal";
import { OfflineEarningsModal } from "./components/modals/OfflineEarningsModal";
import { CRAFT_RECIPES, canCraftRecipe } from "./data/craft";
import { DAILY_STREAK_REWARDS, daysBetween, todayLocalDateString } from "./data/dailyStreak";
import { AETHER_MAX_SUPPLY, COOLING_EFFICIENCY, INCOME_DIVISOR, calcCoolingCapacity, calcHashrate, calcHashrateMultiplier, calcHeatGen, calcIncomeBonusPct, calcPendingCapBonusHours, miningHalvingEpoch, miningHalvingMultiplier } from "./data/economy";
import { GUILDS, guildMilestoneFor, guildRewardFor } from "./data/guild";
import { INBOX_TEMPLATE } from "./data/inbox";
import { bumpInventoryTag, parseInventoryQty } from "./data/inventory";
import { LOOTBOX_COST, rollLootbox } from "./data/lootbox";
import { AUTO_CLAIM_COST, AUTO_SELL_CAP, MARKET_FEE_RATE, TRADE_BASE_PRICES, TRADE_ITEM_POOL, makeBotListings, marketCatalog } from "./data/market";
import { MAX_LEVEL, PART_CATEGORIES, findPartItem, itemLevelUpCost } from "./data/parts";
import { SITES } from "./data/sites";
import { MACHINE_ANIMATION_CSS } from "./data/uiConstants";
import { callFunction, getTelegramWebApp, inventoryToRows, isBackendConfigured, resolveInventoryRow } from "./lib/api";
import { loadLocalSave, saveLocalSave } from "./lib/localSave";
import { formatHashrate, formatInt } from "./lib/format";
import { AchievementScreen } from "./screens/AchievementScreen";
import { CodexScreen } from "./screens/CodexScreen";
import { CraftScreen } from "./screens/CraftScreen";
import { DashboardScreen } from "./screens/DashboardScreen";
import { EventScreen } from "./screens/EventScreen";
import { GuildScreen } from "./screens/GuildScreen";
import { InboxScreen } from "./screens/InboxScreen";
import { InventoryScreen } from "./screens/InventoryScreen";
import { LeaderboardScreen } from "./screens/LeaderboardScreen";
import { MarketScreen } from "./screens/MarketScreen";
import { MissionScreen } from "./screens/MissionScreen";
import { ProfileScreen } from "./screens/ProfileScreen";
import { NetworkStatsScreen } from "./screens/NetworkStatsScreen";
import { ShopScreen } from "./screens/ShopScreen";
import { SiteScreen } from "./screens/SiteScreen";

export default function MiningDashboard() {
  const [screen, setScreen] = useState("dashboard");
  const [isLoaded, setIsLoaded] = useState(false); // gates render until the backend sync (or offline fallback) has finished
  const [loadingMsgIndex, setLoadingMsgIndex] = useState(0);
  const LOADING_MESSAGES = ["Connecting to Telegram…", "Syncing rig data…", "Warming up the GPUs…", "Loading mining sites…"];
  useEffect(() => {
    if (isLoaded) return;
    const t = setInterval(() => setLoadingMsgIndex((i) => (i + 1) % LOADING_MESSAGES.length), 1100);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded]);
  const [claimPulse, setClaimPulse] = useState(false);
  const [floatingGains, setFloatingGains] = useState([]);
  const floatingGainIdRef = useRef(0);
  const spawnFloatingGain = (amount) => {
    if (!amount || amount < 0.01) return;
    const id = ++floatingGainIdRef.current;
    const drift = Math.round((Math.random() - 0.5) * 36); // slight left/right scatter so rapid claims don't stack exactly
    setFloatingGains((list) => [...list, { id, amount, drift }]);
    setTimeout(() => {
      setFloatingGains((list) => list.filter((g) => g.id !== id));
    }, 1200);
  };

  const [core, setCore] = useState(0);
  const [totalEarned, setTotalEarned] = useState(0);
  const [totalMined, setTotalMined] = useState(0); // AETHER earned specifically via passive mining (subject to the halving supply cap)
  // shared/global side of the difficulty pool (see migration 0004) — only
  // meaningful once synced to the backend; local/offline mode has no
  // concept of other players so it keeps using the personal totalMined above
  const [globalTotalMined, setGlobalTotalMined] = useState(0);
  const [myEmissionPerSecond, setMyEmissionPerSecond] = useState(null);

  // --- AETHER economy tracking: breakdown of income by source and spending by category ---
  const [incomeStats, setIncomeStats] = useState({
    mining: 0, offline: 0, dailyStreak: 0, missions: 0, events: 0, guild: 0, lootbox: 0, marketSales: 0, autoSell: 0, inbox: 0,
  });
  const [spendStats, setSpendStats] = useState({
    shop: 0, upgrades: 0, sites: 0, specialItems: 0, boost: 0, autoClaim: 0, lootbox: 0, crafting: 0, marketBuys: 0,
  });
  const addIncome = (category, amount) => setIncomeStats((s) => ({ ...s, [category]: s[category] + amount }));
  const addSpend = (category, amount) => setSpendStats((s) => ({ ...s, [category]: s[category] + amount }));
  const [unlockedIndex, setUnlockedIndex] = useState(0); // only the Garage is unlocked for a new player
  const [activeSiteIndex, setActiveSiteIndex] = useState(0);
  // A brand-new player owns nothing yet — the starter Rig Parts arrive in the
  // Inbox as the "Starter Mining Kit" and must be claimed manually.
  const [ownedItems, setOwnedItems] = useState({});
  const [pending, setPending] = useState(0);

  // --- economy tracking: used for functional missions/events/achievements ---
  const [claimCount, setClaimCount] = useState(0); // total claims (lifetime)
  const [dailyClaims, setDailyClaims] = useState(0);
  const [lastClaimDay, setLastClaimDay] = useState(null);
  const [upgradeCount, setUpgradeCount] = useState(0); // total part upgrades (lifetime)
  const [marketVisited, setMarketVisited] = useState(false);
  const [claimedMissionIds, setClaimedMissionIds] = useState([]);
  const [claimedEventIds, setClaimedEventIds] = useState([]);
  const [inventory, setInventory] = useState([]); // starts empty — items/materials are earned via mining, missions, marketplace, etc.
  const [playerName, setPlayerName] = useState("AETHER MINER");

  // --- inbox: claimable rewards, starting with the new-player Starter Mining Kit ---
  const [inboxItems, setInboxItems] = useState(() => INBOX_TEMPLATE.map((i) => ({ ...i, claimed: false })));

  // --- guild / clan ---
  const [guildId, setGuildId] = useState(null);
  const [guildPoints, setGuildPoints] = useState(0);
  const [guildMilestoneIndex, setGuildMilestoneIndex] = useState(0);

  // --- loot box ---
  const [showLootboxModal, setShowLootboxModal] = useState(false);
  const [lootboxPhase, setLootboxPhase] = useState("idle");
  const [lootboxResult, setLootboxResult] = useState(null);

  // --- daily login streak ---
  const [loginStreak, setLoginStreak] = useState(0);
  const [lastClaimDate, setLastClaimDate] = useState(null); // date string of the last successful daily claim
  const [showDailyModal, setShowDailyModal] = useState(false);
  const today = todayLocalDateString();
  const dailyUnclaimed = lastClaimDate !== today;
  const pendingStreakDay = !lastClaimDate ? 1 : daysBetween(lastClaimDate, today) === 1 ? loginStreak + 1 : daysBetween(lastClaimDate, today) > 1 ? 1 : loginStreak;

  useEffect(() => {
    // wait until the real saved/server state has actually loaded — before
    // that, lastClaimDate is still its initial `null`, which always made
    // dailyUnclaimed look true and popped this modal on literally every
    // app open, even right after already claiming today
    if (!isLoaded) return;
    if (dailyUnclaimed) setShowDailyModal(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded]);

  const handleClaimDaily = async () => {
    if (!dailyUnclaimed) return;

    if (isBackendOnline) {
      setShowDailyModal(false); // close immediately, apply real numbers once the server responds
      try {
        const { reward, streakDay, player: p } = await callFunction("game-actions", { action: "claimDaily", today });
        setCore(Number(p.core));
        setTotalEarned(Number(p.total_earned));
        setIncomeStats((s) => ({ ...s, ...p.income_stats }));
        setLoginStreak(streakDay);
        setLastClaimDate(today);
      } catch (e) {
        pushToast(e.message || "Daily reward failed to claim.", "warning");
        setShowDailyModal(true); // let them try again
      }
      return;
    }

    // offline/local-save fallback — unchanged, purely client-side
    const cycleDay = ((pendingStreakDay - 1) % 7) + 1;
    const reward = applyDroneBonus(DAILY_STREAK_REWARDS[cycleDay - 1]);
    setCore((c) => c + reward);
    setTotalEarned((t) => t + reward);
    addIncome("dailyStreak", reward);
    setLoginStreak(pendingStreakDay);
    setLastClaimDate(today);
    setShowDailyModal(false);
  };

  const handleClaimInboxItem = (id) => {
    const item = inboxItems.find((i) => i.id === id);
    if (!item || item.claimed) return;
    if (item.aether > 0) {
      const amount = applyDroneBonus(item.aether);
      setCore((c) => c + amount);
      setTotalEarned((t) => t + amount);
      addIncome("inbox", amount);
    }
    if (item.partIds && item.partIds.length > 0) {
      setOwnedItems((prev) => {
        const next = { ...prev };
        item.partIds.forEach((pid) => {
          if (!next[pid]) next[pid] = 1;
        });
        return next;
      });
    }
    setInboxItems((prev) => prev.map((i) => (i.id === id ? { ...i, claimed: true } : i)));
  };
  const [marketStock, setMarketStock] = useState(() => Object.fromEntries(marketCatalog.map((m) => [m.id, m.stock])));
  const [marketOwned, setMarketOwned] = useState(() => Object.fromEntries(marketCatalog.map((m) => [m.id, 0])));

  // --- player-to-player marketplace (real listings from the backend once online) ---
  const [marketListings, setMarketListings] = useState([]);
  const [myListings, setMyListings] = useState([]);
  const [saleNotice, setSaleNotice] = useState("");
  const [bulkUpgradeNotice, setBulkUpgradeNotice] = useState("");

  // --- global toast notifications (Boost ended, listing sold, etc.) ---
  const [toasts, setToasts] = useState([]);
  const pushToast = (message, tone = "info") => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev, { id, message, tone }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  // --- auto-sell excess Materials for AETHER (Marketplace convenience) ---
  const [autoSellEnabled, setAutoSellEnabled] = useState(false);

  // --- late-game sinks: prestige (permanent reset) & boost (temporary) ---
  const [prestigeCount, setPrestigeCount] = useState(0);
  const [boostEndTime, setBoostEndTime] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [claimCooldownUntil, setClaimCooldownUntil] = useState(0);
  const CLAIM_COOLDOWN_MS = 5000; // anti-spam: locks the Claim button for 5s after each tap

  // --- Mystery Site: random temporary event with a huge hashrate surge ---
  const [mysterySiteAvailableUntil, setMysterySiteAvailableUntil] = useState(0);
  const [mysteryBoostEndTime, setMysteryBoostEndTime] = useState(0);
  const mysterySiteAvailable = now < mysterySiteAvailableUntil;
  const mysteryBoostActive = now < mysteryBoostEndTime;
  const mysteryMultiplier = mysteryBoostActive ? 5 : 1;

  // --- automation: Auto-Claim Module (one-time purchase, toggleable) ---
  const [autoClaimUnlocked, setAutoClaimUnlocked] = useState(false);
  const [autoClaimActive, setAutoClaimActive] = useState(true);

  // --- overheat system: GPU + Processor generate heat, Cooling dissipates it ---
  const [heatLevel, setHeatLevel] = useState(20);
  const [isOverheating, setIsOverheating] = useState(false);
  const heatGen = calcHeatGen(ownedItems);
  const coolingCap = calcCoolingCapacity(ownedItems);
  // GPU+Processor hp runs ~10x higher than Cooling hp at matching tiers, so Cooling's
  // effective capacity is scaled up here — a player with matched-tier gear stays safe.
  const heatRatio = heatGen / Math.max(1, coolingCap * COOLING_EFFICIENCY);
  const heatMultiplier = isOverheating ? 0.7 : 1;

  const [isBackendOnline, setIsBackendOnline] = useState(false); // true once sync-player init succeeds

  const prestigeMultiplier = 1 + prestigeCount * 0.1;
  const boostActive = now < boostEndTime;
  const boostMultiplier = boostActive ? 2 : 1;

  const totalMarketBonus = marketCatalog.reduce((sum, item) => sum + item.hpBonus * (marketOwned[item.id] || 0), 0);
  // Processor no longer adds flat hashrate — it's a % multiplier on top of
  // GPU+Rack+Market hashrate (see calcHashrateMultiplier)
  const hashrateMultiplier = 1 + calcHashrateMultiplier(ownedItems);
  const hashrateBase = (calcHashrate(ownedItems) + totalMarketBonus) * hashrateMultiplier;
  const totalHashrate = hashrateBase * SITES[activeSiteIndex].bonus * prestigeMultiplier * boostMultiplier * heatMultiplier * mysteryMultiplier;
  // once synced, the halving curve + actual AETHER/sec both come from the
  // shared global pool (server-authoritative — see migration 0004) instead
  // of this player's own hashrate/INCOME_DIVISOR; offline/local-save mode
  // has no concept of other players so it keeps the old personal formula
  const halvingEpoch = isBackendOnline ? miningHalvingEpoch(globalTotalMined) : miningHalvingEpoch(totalMined);
  const halvingMultiplier = isBackendOnline ? miningHalvingMultiplier(globalTotalMined) : miningHalvingMultiplier(totalMined);
  const perSecond = isBackendOnline && myEmissionPerSecond != null
    ? myEmissionPerSecond
    : (totalHashrate / INCOME_DIVISOR) * halvingMultiplier;
  // Battery extends the claim cap beyond the base 6h (see calcPendingCapBonusHours)
  const pendingCap = perSecond * 3600 * (6 + calcPendingCapBonusHours(ownedItems));
  const boostCost = Math.max(500, Math.round(((hashrateBase * SITES[activeSiteIndex].bonus * prestigeMultiplier) / INCOME_DIVISOR) * 3600 * 1.5));
  const canPrestige = unlockedIndex >= SITES.length - 1;
  // Drone's role: % bonus on Missions/Events/Guild/Daily Streak/Loot Box
  // AETHER rewards — deliberately NOT applied to passive mining or the
  // offline-mining catch-up, and not to auto-sell (that's a trade, not a reward)
  const applyDroneBonus = (amount) => amount * (1 + calcIncomeBonusPct(ownedItems));

  // kept fresh on every render so the autosave interval (set up once) always
  // writes the latest values without needing a giant effect dependency list
  const gameStateRef = useRef(null);
  gameStateRef.current = {
    core, totalEarned, totalMined, incomeStats, spendStats, unlockedIndex, activeSiteIndex,
    ownedItems, pending, claimCount, dailyClaims, lastClaimDay, upgradeCount, marketVisited,
    claimedMissionIds, claimedEventIds,
    // icon/color/desc on each inventory item are React component references —
    // JSON can't serialize functions, so store the same lightweight
    // {name, type, qty} shape the backend uses and re-attach the icon via
    // resolveInventoryRow() on load (see inventoryToRows below)
    inventory: inventoryToRows(inventory), playerName,
    inboxClaimedIds: inboxItems.filter((i) => i.claimed).map((i) => i.id),
    guildId, guildPoints, guildMilestoneIndex, loginStreak, lastClaimDate, marketOwned,
    autoSellEnabled, prestigeCount, boostEndTime, mysterySiteAvailableUntil, mysteryBoostEndTime,
    autoClaimUnlocked, autoClaimActive, perSecond, savedAt: Date.now(),
  };


  // --- offline earnings: credited when the player returns after being away from the tab ---
  const [offlineEarnings, setOfflineEarnings] = useState(0);
  const [offlineDuration, setOfflineDuration] = useState(0);
  const [showOfflineModal, setShowOfflineModal] = useState(false);
  const perSecondRef = useRef(perSecond);
  useEffect(() => {
    perSecondRef.current = perSecond;
  }, [perSecond]);

  // --- Telegram Mini App init: adopt the app's theme, expand to full height ---
  useEffect(() => {
    const tg = getTelegramWebApp();
    if (!tg) return;
    try {
      tg.ready();
      tg.expand();
      if (tg.setHeaderColor) tg.setHeaderColor("#0a0a16");
      if (tg.setBackgroundColor) tg.setBackgroundColor("#0a0a16");
      if (tg.disableVerticalSwipes) tg.disableVerticalSwipes();
    } catch (e) {
      // running outside Telegram, or an older client — safe to ignore
    }
  }, []);

  // --- load from the server once on mount (falls back to local-only "offline mode" if
  //     there's no Telegram context or the backend URL hasn't been configured yet) ---
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!isBackendConfigured()) {
        // No real Telegram launch context (or backend not set up) — fall back
        // to whatever was last saved locally, so progress survives a reload
        // instead of always starting from zero.
        const saved = loadLocalSave();
        if (saved && !cancelled) {
          setCore(Number(saved.core) || 0);
          setTotalEarned(Number(saved.totalEarned) || 0);
          setTotalMined(Number(saved.totalMined) || 0);
          if (saved.incomeStats) setIncomeStats((s) => ({ ...s, ...saved.incomeStats }));
          if (saved.spendStats) setSpendStats((s) => ({ ...s, ...saved.spendStats }));
          setUnlockedIndex(saved.unlockedIndex || 0);
          setActiveSiteIndex(saved.activeSiteIndex || 0);
          setOwnedItems(saved.ownedItems || {});
          setClaimCount(saved.claimCount || 0);
          setDailyClaims(saved.dailyClaims || 0);
          setLastClaimDay(saved.lastClaimDay || null);
          setUpgradeCount(saved.upgradeCount || 0);
          setMarketVisited(Boolean(saved.marketVisited));
          setClaimedMissionIds(Array.isArray(saved.claimedMissionIds) ? saved.claimedMissionIds : []);
          setClaimedEventIds(Array.isArray(saved.claimedEventIds) ? saved.claimedEventIds : []);
          if (Array.isArray(saved.inventory)) setInventory(saved.inventory.map(resolveInventoryRow));
          if (saved.playerName) setPlayerName(saved.playerName);
          const claimedIds = Array.isArray(saved.inboxClaimedIds) ? saved.inboxClaimedIds : [];
          if (claimedIds.length) setInboxItems((prev) => prev.map((i) => (claimedIds.includes(i.id) ? { ...i, claimed: true } : i)));
          setGuildId(saved.guildId || null);
          setGuildPoints(Number(saved.guildPoints) || 0);
          setGuildMilestoneIndex(saved.guildMilestoneIndex || 0);
          setLoginStreak(saved.loginStreak || 0);
          if (saved.lastClaimDate) setLastClaimDate(saved.lastClaimDate);
          if (saved.marketOwned) setMarketOwned((s) => ({ ...s, ...saved.marketOwned }));
          setAutoSellEnabled(Boolean(saved.autoSellEnabled));
          setPrestigeCount(saved.prestigeCount || 0);
          if (saved.boostEndTime) setBoostEndTime(saved.boostEndTime);
          if (saved.mysterySiteAvailableUntil) setMysterySiteAvailableUntil(saved.mysterySiteAvailableUntil);
          if (saved.mysteryBoostEndTime) setMysteryBoostEndTime(saved.mysteryBoostEndTime);
          setAutoClaimUnlocked(Boolean(saved.autoClaimUnlocked));
          setAutoClaimActive(saved.autoClaimActive !== false);

          // catch up on mining income accrued while the tab was closed, using
          // the hash rate we had at the last save — same 6h cap the live
          // ticker itself uses, so this can't be abused for infinite offline gains
          if (saved.savedAt && saved.perSecond > 0) {
            const elapsedSeconds = Math.max(0, (Date.now() - saved.savedAt) / 1000);
            const cap = saved.perSecond * 3600 * 6;
            const caughtUp = Math.min(cap, (Number(saved.pending) || 0) + elapsedSeconds * saved.perSecond);
            setPending(caughtUp);
          } else {
            setPending(Number(saved.pending) || 0);
          }
        }
        if (!cancelled) setIsLoaded(true);
        return;
      }
      try {
        const { player: p, inventory: inv, guild, globalTotalMined: gtm, myEmissionPerSecond: eps } = await callFunction("sync-player", { action: "init" });
        if (cancelled) return;

        setCore(Number(p.core));
        setTotalEarned(Number(p.total_earned));
        setTotalMined(Number(p.total_mined));
        setGlobalTotalMined(Number(gtm) || 0);
        if (typeof eps === "number") setMyEmissionPerSecond(eps);
        if (p.income_stats && Object.keys(p.income_stats).length) setIncomeStats((s) => ({ ...s, ...p.income_stats }));
        if (p.spend_stats && Object.keys(p.spend_stats).length) setSpendStats((s) => ({ ...s, ...p.spend_stats }));
        setUnlockedIndex(p.unlocked_index);
        setActiveSiteIndex(p.active_site_index);
        setOwnedItems(p.owned_items || {});
        setPending(Number(p.pending));
        setPlayerName(p.username);
        setGuildId(p.guild_id);
        setGuildPoints(Number(p.guild_points));
        setGuildMilestoneIndex(guild ? guild.milestone_index : 0);
        setLoginStreak(p.login_streak);
        if (p.last_claim_date) setLastClaimDate(p.last_claim_date);
        if (p.market_owned && Object.keys(p.market_owned).length) setMarketOwned((s) => ({ ...s, ...p.market_owned }));
        setAutoSellEnabled(Boolean(p.auto_sell_enabled));
        setPrestigeCount(p.prestige_count);
        if (p.boost_end_time) setBoostEndTime(new Date(p.boost_end_time).getTime());
        setAutoClaimUnlocked(Boolean(p.auto_claim_unlocked));
        setAutoClaimActive(Boolean(p.auto_claim_active));
        const claimedIds = Array.isArray(p.inbox_claimed_ids) ? p.inbox_claimed_ids : [];
        setInboxItems((prev) => prev.map((i) => (claimedIds.includes(i.id) ? { ...i, claimed: true } : i)));
        setClaimedMissionIds(Array.isArray(p.claimed_mission_ids) ? p.claimed_mission_ids : []);
        setClaimedEventIds(Array.isArray(p.claimed_event_ids) ? p.claimed_event_ids : []);
        if (Array.isArray(inv)) setInventory(inv.map(resolveInventoryRow));

        setIsBackendOnline(true);
      } catch (e) {
        // server unreachable / auth failed — still let the player play locally
        console.error("sync-player init failed:", e);
      } finally {
        if (!cancelled) setIsLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- local-save fallback: while there's no backend connection, periodically
  //     (and on tab-hide / close) write the current state to localStorage so
  //     progress survives a reload instead of resetting to zero each time ---
  useEffect(() => {
    if (!isLoaded) return;
    const flush = () => {
      if (!isBackendOnline && gameStateRef.current) saveLocalSave(gameStateRef.current);
    };
    const id = setInterval(flush, 4000);
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("beforeunload", flush);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("beforeunload", flush);
      flush(); // also catch progress made right up until navigating away within the app
    };
  }, [isLoaded, isBackendOnline]);

  // --- push everything except AETHER balance/pending (those only ever change via
  //     sync-player's claim or marketplace trades) to sync-full-state periodically ---
  const pushFullState = () => {
    if (!isBackendOnline) return;
    callFunction("sync-full-state", {
      state: {
        username: playerName,
        owned_items: ownedItems,
        unlocked_index: unlockedIndex,
        active_site_index: activeSiteIndex,
        income_stats: incomeStats,
        spend_stats: spendStats,
        claimed_mission_ids: claimedMissionIds,
        claimed_event_ids: claimedEventIds,
        inbox_claimed_ids: inboxItems.filter((i) => i.claimed).map((i) => i.id),
        market_owned: marketOwned,
        auto_sell_enabled: autoSellEnabled,
        auto_claim_unlocked: autoClaimUnlocked,
        auto_claim_active: autoClaimActive,
        prestige_count: prestigeCount,
        boost_end_time: boostEndTime ? new Date(boostEndTime).toISOString() : null,
        login_streak: loginStreak,
        last_claim_date: lastClaimDate,
        guild_id: guildId,
        guild_points: guildPoints,
      },
      inventory: inventoryToRows(inventory),
    }).catch((e) => console.error("sync-full-state failed:", e));
  };

  useEffect(() => {
    if (!isLoaded) return;
    const t = setInterval(pushFullState, 8000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isLoaded, isBackendOnline, ownedItems, unlockedIndex, activeSiteIndex, incomeStats, spendStats,
    claimedMissionIds, claimedEventIds, inboxItems, marketOwned, autoSellEnabled, autoClaimUnlocked,
    autoClaimActive, prestigeCount, boostEndTime, loginStreak, lastClaimDate, guildId, guildPoints, playerName,
  ]);

  // --- shared/global supply pool (migration 0004): ping the server every
  //     ~20s so this player stays counted in the ACTIVE hashrate pool
  //     between real claims, and pick up the latest emission-per-second
  //     share (which shifts as other players join/leave) along the way ---
  useEffect(() => {
    if (!isLoaded || !isBackendOnline) return;
    const beat = async () => {
      try {
        const { myEmissionPerSecond: eps } = await callFunction("sync-player", { action: "heartbeat" });
        if (typeof eps === "number") setMyEmissionPerSecond(eps);
      } catch (e) {
        // a missed heartbeat just means one fewer active-hashrate tick —
        // harmless, the next one will pick it back up
      }
    };
    const t = setInterval(beat, 20000);
    return () => clearInterval(t);
  }, [isLoaded, isBackendOnline]);

  // --- also push immediately when the Mini App is closed/backgrounded, not just every 8s ---
  useEffect(() => {
    if (!isLoaded) return;
    document.addEventListener("visibilitychange", pushFullState);
    window.addEventListener("beforeunload", pushFullState);
    return () => {
      document.removeEventListener("visibilitychange", pushFullState);
      window.removeEventListener("beforeunload", pushFullState);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isLoaded, isBackendOnline, ownedItems, unlockedIndex, activeSiteIndex, incomeStats, spendStats,
    claimedMissionIds, claimedEventIds, inboxItems, marketOwned, autoSellEnabled, autoClaimUnlocked,
    autoClaimActive, prestigeCount, boostEndTime, loginStreak, lastClaimDate, guildId, guildPoints, playerName,
  ]);

  useEffect(() => {
    let hiddenAt = null;
    const OFFLINE_CAP_SECONDS = 6 * 3600; // matches the 6h pending cap horizon
    const MIN_AWAY_SECONDS = 30; // ignore quick tab-switches
    const handleVisibility = () => {
      if (document.hidden) {
        hiddenAt = Date.now();
      } else if (hiddenAt) {
        const elapsedSec = (Date.now() - hiddenAt) / 1000;
        hiddenAt = null;
        if (elapsedSec >= MIN_AWAY_SECONDS) {
          const cappedSec = Math.min(elapsedSec, OFFLINE_CAP_SECONDS);
          const earnings = perSecondRef.current * cappedSec;
          if (earnings > 0.5) {
            setCore((c) => c + earnings);
            setTotalEarned((t) => t + earnings);
            setTotalMined((m) => Math.min(AETHER_MAX_SUPPLY, m + earnings));
            addIncome("offline", earnings);
            setOfflineEarnings(earnings);
            setOfflineDuration(cappedSec);
            setShowOfflineModal(true);
          }
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = setInterval(() => {
      setPending((p) => Math.min(pendingCap, p + perSecond));
      setNow(Date.now());
      setHeatLevel((h) => {
        const equilibrium = Math.min(150, Math.max(5, heatRatio * 40));
        const next = h + (equilibrium - h) * 0.15;
        setIsOverheating((prev) => (prev ? next < 80 ? false : true : next >= 100 ? true : false));
        return Math.max(0, Math.min(150, next));
      });
      if (guildId) {
        const guild = GUILDS.find((g) => g.id === guildId);
        if (guild) {
          const membersRate = guild.members.reduce((s, m) => s + m.rate, 0);
          const playerRate = Math.max(5, totalHashrate / 1e8);
          setGuildPoints((p) => p + membersRate + playerRate);
        }
      }
    }, 1000);
    return () => clearInterval(t);
  }, [perSecond, pendingCap, heatRatio, guildId, totalHashrate]);

  useEffect(() => {
    const t = setInterval(() => setClaimPulse((p) => !p), 1400);
    return () => clearInterval(t);
  }, []);

  // auto-sell excess Materials above the cap, converting them straight to AETHER (5% fee applies)
  useEffect(() => {
    if (!autoSellEnabled) return;
    const t = setInterval(() => {
      setInventory((prev) => {
        let totalGained = 0;
        let soldAny = false;
        const next = prev.map((it) => {
          if (it.type !== "material") return it;
          const qty = parseInventoryQty(it.tag);
          if (qty <= AUTO_SELL_CAP) return it;
          const excess = qty - AUTO_SELL_CAP;
          const basePrice = TRADE_BASE_PRICES[it.name] || 100;
          const proceeds = Math.round(excess * basePrice * (1 - MARKET_FEE_RATE));
          totalGained += proceeds;
          soldAny = true;
          return { ...it, tag: `x${AUTO_SELL_CAP}` };
        });
        if (soldAny) {
          setCore((c) => c + totalGained);
          setTotalEarned((t2) => t2 + totalGained);
          addIncome("autoSell", totalGained);
          pushToast(`Auto-sold excess Materials for ${formatInt(totalGained)} AETHER.`, "success");
        }
        return soldAny ? next : prev;
      });
    }, 8000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSellEnabled]);

  // toast when a temporary Boost expires
  const prevBoostActiveRef = useRef(boostActive);
  useEffect(() => {
    if (prevBoostActiveRef.current && !boostActive) {
      pushToast("Your Boost has ended.", "warning");
    }
    prevBoostActiveRef.current = boostActive;
  }, [boostActive]);

  useEffect(() => {
    if (screen === "market") setMarketVisited(true);
  }, [screen]);

  const handleClaim = async () => {
    if (now < claimCooldownUntil) return;
    if (pending < 0.01 && !isBackendOnline) return;
    setClaimCooldownUntil(Date.now() + CLAIM_COOLDOWN_MS);
    const claimedAmount = pending;
    if (isBackendOnline) {
      try {
        const { awarded, player: p, globalTotalMined: gtm, myEmissionPerSecond: eps } = await callFunction("sync-player", { action: "claim" });
        setCore(Number(p.core));
        setTotalEarned(Number(p.total_earned));
        setTotalMined(Number(p.total_mined));
        if (typeof gtm === "number") setGlobalTotalMined(gtm);
        if (typeof eps === "number") setMyEmissionPerSecond(eps);
        addIncome("mining", awarded);
        setPending(0);
        spawnFloatingGain(awarded);
      } catch (e) {
        console.error("claim failed:", e);
        return;
      }
    } else {
      setCore((c) => c + pending);
      setTotalEarned((t) => t + pending);
      setTotalMined((m) => Math.min(AETHER_MAX_SUPPLY, m + pending));
      addIncome("mining", pending);
      setPending(0);
      spawnFloatingGain(claimedAmount);
    }
    setClaimCount((c) => c + 1);
    const today = new Date().toDateString();
    setDailyClaims((d) => (lastClaimDay === today ? d + 1 : 1));
    setLastClaimDay(today);
  };

  const handleBuyAutoClaim = () => {
    if (autoClaimUnlocked || core < AUTO_CLAIM_COST) return;
    setCore((c) => c - AUTO_CLAIM_COST);
    addSpend("autoClaim", AUTO_CLAIM_COST);
    setAutoClaimUnlocked(true);
    setAutoClaimActive(true);
  };

  const handleToggleAutoClaim = () => {
    if (!autoClaimUnlocked) return;
    setAutoClaimActive((a) => !a);
  };

  const handleJoinGuild = (id) => {
    if (guildId) return;
    setGuildId(id);
    setGuildPoints(0);
    setGuildMilestoneIndex(0);
  };

  const handleClaimGuildMilestone = () => {
    const milestone = guildMilestoneFor(guildMilestoneIndex);
    if (guildPoints < milestone) return;
    const reward = applyDroneBonus(guildRewardFor(guildMilestoneIndex));
    setCore((c) => c + reward);
    setTotalEarned((t) => t + reward);
    addIncome("guild", reward);
    setGuildPoints((p) => p - milestone);
    setGuildMilestoneIndex((i) => i + 1);
  };

  const handleOpenLootbox = async () => {
    if (lootboxPhase === "opening" || core < LOOTBOX_COST) return;

    if (isBackendOnline) {
      setCore((c) => c - LOOTBOX_COST); // optimistic — corrected below once the server responds
      addSpend("lootbox", LOOTBOX_COST);
      setLootboxPhase("opening");
      try {
        const { reward, player: p } = await callFunction("game-actions", { action: "openLootbox" });
        setTimeout(() => {
          let result;
          if (reward.type === "aether") {
            result = { type: "aether", amount: reward.amount, label: reward.label || "AETHER" };
          } else if (reward.type === "material") {
            const poolItem = TRADE_ITEM_POOL.find((it) => it.name === reward.name);
            result = { type: "material", name: reward.name, qty: reward.qty, icon: poolItem?.icon, image: poolItem?.image, iconColor: poolItem?.iconColor };
            setInventory((prev) => {
              const existing = prev.find((it) => it.name === reward.name && it.type !== "rig");
              if (existing) {
                return prev.map((it) => (it.id === existing.id ? { ...it, tag: `x${parseInventoryQty(it.tag) + reward.qty}` } : it));
              }
              return [
                ...prev,
                {
                  id: `lootbox-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                  name: reward.name,
                  type: "material",
                  tag: `x${reward.qty}`,
                  icon: poolItem?.icon,
                  image: poolItem?.image,
                  iconColor: poolItem?.iconColor,
                  selected: false,
                  desc: "Won from a Loot Box.",
                },
              ];
            });
          } else {
            const found = findPartItem(reward.itemId);
            result = { type: "part", item: found?.item, category: found?.cat };
          }
          setCore(Number(p.core));
          setOwnedItems(p.owned_items);
          setSpendStats((s) => ({ ...s, ...p.spend_stats }));
          setIncomeStats((s) => ({ ...s, ...p.income_stats }));
          setLootboxResult(result);
          setLootboxPhase("result");
        }, 900);
      } catch (e) {
        setLootboxPhase("idle");
        pushToast(e.message || "Loot Box failed to open.", "warning");
      }
      return;
    }

    // offline/local-save fallback — unchanged, purely client-side roll
    setCore((c) => c - LOOTBOX_COST);
    addSpend("lootbox", LOOTBOX_COST);
    setLootboxPhase("opening");
    setTimeout(() => {
      const result = rollLootbox(ownedItems);
      if (result.type === "aether") {
        const amount = applyDroneBonus(result.amount);
        result.amount = amount; // keep the modal's displayed number in sync with what's actually credited
        setCore((c) => c + amount);
        setTotalEarned((t) => t + amount);
        addIncome("lootbox", amount);
      } else if (result.type === "material") {
        setInventory((prev) => {
          const existing = prev.find((it) => it.name === result.name && it.type !== "rig");
          if (existing) {
            return prev.map((it) => (it.id === existing.id ? { ...it, tag: `x${parseInventoryQty(it.tag) + result.qty}` } : it));
          }
          return [
            ...prev,
            {
              id: `lootbox-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              name: result.name,
              type: "material",
              tag: `x${result.qty}`,
              icon: result.icon,
              image: result.image,
              iconColor: result.iconColor,
              selected: false,
              desc: "Won from a Loot Box.",
            },
          ];
        });
      } else if (result.type === "part") {
        setOwnedItems((prev) => ({ ...prev, [result.item.id]: 1 }));
      }
      setLootboxResult(result);
      setLootboxPhase("result");
    }, 900);
  };

  // kept fresh every render so the auto-claim interval below always calls the
  // CURRENT handleClaim (with up-to-date pending/isBackendOnline/etc in its
  // closure) instead of a stale one captured back when the interval was
  // first set up — the interval itself is only created once per on/off
  // toggle, not every second, so without this it would keep re-checking
  // whatever `pending` happened to be at that one moment forever
  const handleClaimRef = useRef(null);
  handleClaimRef.current = handleClaim;

  useEffect(() => {
    if (!autoClaimUnlocked || !autoClaimActive) return;
    const t = setInterval(() => {
      handleClaimRef.current();
    }, 5000);
    return () => clearInterval(t);
  }, [autoClaimUnlocked, autoClaimActive]);

  const handleLevelUpItem = async (itemId) => {
    const found = findPartItem(itemId);
    if (!found) return;
    const lvl = ownedItems[itemId] || 0;
    if (lvl <= 0 || lvl >= MAX_LEVEL) return;
    if (isBackendOnline) {
      try {
        const { player: p } = await callFunction("game-actions", { action: "upgradePart", itemId });
        setCore(Number(p.core));
        setOwnedItems(p.owned_items);
        setSpendStats((s) => ({ ...s, ...p.spend_stats }));
        setUpgradeCount(p.upgrade_count);
      } catch (e) {
        pushToast(e.message || "Upgrade failed.", "warning");
      }
      return;
    }
    const cost = itemLevelUpCost(found.item, lvl);
    if (core < cost) return;
    setCore((c) => c - cost);
    addSpend("upgrades", cost);
    setOwnedItems((p) => ({ ...p, [itemId]: lvl + 1 }));
    setUpgradeCount((u) => u + 1);
  };

  // spend AETHER on the cheapest available upgrade across all owned parts, repeatedly, until funds run out
  const handleUpgradeAll = async () => {
    if (isBackendOnline) {
      try {
        const { totalLevels, totalSpent, player: p } = await callFunction("game-actions", { action: "upgradeAll" });
        if (p) {
          setCore(Number(p.core));
          setOwnedItems(p.owned_items);
          setSpendStats((s) => ({ ...s, ...p.spend_stats }));
          setUpgradeCount(p.upgrade_count);
        }
        setBulkUpgradeNotice(
          totalLevels > 0
            ? `Upgraded ${totalLevels} level${totalLevels === 1 ? "" : "s"} for ${formatInt(totalSpent)} AETHER.`
            : "Not enough AETHER to upgrade anything right now."
        );
      } catch (e) {
        setBulkUpgradeNotice(e.message || "Bulk upgrade failed.");
      }
      setTimeout(() => setBulkUpgradeNotice(""), 4000);
      return;
    }

    let budget = core;
    const items = { ...ownedItems };
    let totalSpent = 0;
    let totalLevels = 0;
    for (let safety = 0; safety < 5000; safety++) {
      let bestId = null;
      let bestCost = Infinity;
      for (const cat of PART_CATEGORIES) {
        for (const item of cat.items) {
          const lvl = items[item.id] || 0;
          if (lvl <= 0 || lvl >= MAX_LEVEL) continue;
          const cost = itemLevelUpCost(item, lvl);
          if (cost < bestCost) {
            bestCost = cost;
            bestId = item.id;
          }
        }
      }
      if (bestId === null || bestCost > budget) break;
      budget -= bestCost;
      items[bestId] = (items[bestId] || 0) + 1;
      totalSpent += bestCost;
      totalLevels += 1;
    }
    if (totalLevels > 0) {
      setOwnedItems(items);
      setCore((c) => c - totalSpent);
      addSpend("upgrades", totalSpent);
      setUpgradeCount((u) => u + totalLevels);
      setBulkUpgradeNotice(`Upgraded ${totalLevels} level${totalLevels === 1 ? "" : "s"} for ${formatInt(totalSpent)} AETHER.`);
    } else {
      setBulkUpgradeNotice("Not enough AETHER to upgrade anything right now.");
    }
    setTimeout(() => setBulkUpgradeNotice(""), 4000);
  };

  const handleBuyShopItem = async (itemId) => {
    const found = findPartItem(itemId);
    if (!found) return;
    if (ownedItems[itemId]) return; // already owned
    if (isBackendOnline) {
      try {
        const { player: p } = await callFunction("game-actions", { action: "buyPart", itemId });
        setCore(Number(p.core));
        setOwnedItems(p.owned_items);
        setSpendStats((s) => ({ ...s, ...p.spend_stats }));
      } catch (e) {
        pushToast(e.message || "Purchase failed.", "warning");
      }
      return;
    }
    if (core < found.item.buyCost) return;
    setCore((c) => c - found.item.buyCost);
    addSpend("shop", found.item.buyCost);
    setOwnedItems((p) => ({ ...p, [itemId]: 1 }));
  };

  // craft a part directly from Materials + AETHER instead of buying it in the Shop
  const handleCraft = async (recipeId) => {
    const recipe = CRAFT_RECIPES.find((r) => r.id === recipeId);
    if (!recipe) return;
    if (isBackendOnline) {
      try {
        const { player: p } = await callFunction("game-actions", { action: "craftItem", recipeId });
        setCore(Number(p.core));
        setOwnedItems(p.owned_items);
        setSpendStats((s) => ({ ...s, ...p.spend_stats }));
        setInventory((prev) =>
          prev
            .map((it) => {
              const needed = recipe.materials.find((m) => m.name === it.name);
              if (!needed) return it;
              const have = parseInventoryQty(it.tag);
              return { ...it, tag: `x${Math.max(0, have - needed.qty)}` };
            })
            .filter((it) => it.type !== "material" || parseInventoryQty(it.tag) > 0)
        );
      } catch (e) {
        pushToast(e.message || "Crafting failed.", "warning");
      }
      return;
    }
    if (!canCraftRecipe(recipe, inventory, core)) return;
    setCore((c) => c - recipe.aetherCost);
    addSpend("crafting", recipe.aetherCost);
    setInventory((prev) =>
      prev.map((it) => {
        const needed = recipe.materials.find((m) => m.name === it.name);
        if (!needed) return it;
        const have = parseInventoryQty(it.tag);
        return { ...it, tag: `x${Math.max(0, have - needed.qty)}` };
      })
    );
    setOwnedItems((prev) => {
      const currentLevel = prev[recipe.targetId] || 0;
      const nextLevel = Math.min(MAX_LEVEL, currentLevel + 1);
      return { ...prev, [recipe.targetId]: Math.max(1, nextLevel) };
    });
  };

  const handleUnlockSite = async () => {
    const next = unlockedIndex + 1;
    if (next >= SITES.length) return;
    if (isBackendOnline) {
      try {
        const { player: p } = await callFunction("game-actions", { action: "unlockSite" });
        setCore(Number(p.core));
        setUnlockedIndex(p.unlocked_index);
        setActiveSiteIndex(p.active_site_index);
        setSpendStats((s) => ({ ...s, ...p.spend_stats }));
      } catch (e) {
        pushToast(e.message || "Couldn't unlock this site.", "warning");
      }
      return;
    }
    const cost = SITES[next].cost;
    if (core < cost) return;
    setCore((c) => c - cost);
    addSpend("sites", cost);
    setUnlockedIndex(next);
    setActiveSiteIndex(next);
  };

  const handleSelectSite = (index) => {
    if (index > unlockedIndex) return;
    setActiveSiteIndex(index);
  };

  const handleClaimMission = (id, reward) => {
    if (claimedMissionIds.includes(id)) return;
    const amount = applyDroneBonus(reward);
    setCore((c) => c + amount);
    setTotalEarned((t) => t + amount);
    addIncome("missions", amount);
    setClaimedMissionIds((ids) => [...ids, id]);
  };

  const handleClaimEvent = (id, reward) => {
    if (claimedEventIds.includes(id)) return;
    const amount = applyDroneBonus(reward);
    setCore((c) => c + amount);
    setTotalEarned((t) => t + amount);
    addIncome("events", amount);
    setClaimedEventIds((ids) => [...ids, id]);
  };

  const handleBuyMarketItem = (item) => {
    const stock = marketStock[item.id];
    if (stock <= 0 || core < item.price) return;
    setCore((c) => c - item.price);
    addSpend("specialItems", item.price);
    setMarketStock((s) => ({ ...s, [item.id]: s[item.id] - 1 }));
    setMarketOwned((o) => ({ ...o, [item.id]: o[item.id] + 1 }));
    setInventory((inv) => [
      ...inv,
      { id: `market-${item.id}-${Date.now()}`, name: item.name, type: "item", tag: "x1", icon: item.icon, image: item.image, iconColor: item.iconColor, selected: false, desc: `Bought from the Marketplace (${item.rarity}). Grants +${formatHashrate(item.hpBonus)} permanent hashrate.` },
    ]);
  };

  // --- player-to-player trading: buy from another miner's listing ---
  // offline/preview mode (no backend configured yet): show demo bot listings so the
  // Marketplace screen isn't empty. Buying/listing/cancelling are disabled in this mode.
  useEffect(() => {
    if (isBackendOnline || !isLoaded) return;
    setMarketListings(makeBotListings(6));
  }, [isBackendOnline, isLoaded]);

  const refreshListings = async () => {
    if (!isBackendOnline) return;
    try {
      const { listings } = await callFunction("marketplace", { action: "browse" });
      const resolved = (listings || []).map((l) => {
        const poolItem = TRADE_ITEM_POOL.find((p) => p.name === l.item_name);
        return {
          id: l.id,
          name: l.item_name,
          type: l.item_type,
          price: Number(l.price),
          seller: l.seller ? l.seller.username : "Unknown",
          icon: poolItem ? poolItem.icon : Package,
          image: poolItem ? poolItem.image : undefined,
          iconColor: poolItem ? poolItem.iconColor : "#94a3b8",
        };
      });
      setMarketListings(resolved.filter((l) => l.seller !== playerName));
      setMyListings(resolved.filter((l) => l.seller === playerName));
    } catch (e) {
      console.error("marketplace browse failed:", e);
    }
  };

  useEffect(() => {
    if (!isBackendOnline) return;
    refreshListings();
    const t = setInterval(refreshListings, 15000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBackendOnline]);

  const handleBuyListing = async (listingId) => {
    const listing = marketListings.find((l) => l.id === listingId);
    if (!listing || core < listing.price) return;
    if (!isBackendOnline) return; // real trading requires the backend
    try {
      await callFunction("marketplace", { action: "buy", listingId });
      setCore((c) => c - listing.price);
      addSpend("marketBuys", listing.price);
      setInventory((prev) => {
        const existing = prev.find((it) => it.name === listing.name && it.type !== "rig");
        if (existing) return prev.map((it) => (it.id === existing.id ? { ...it, tag: bumpInventoryTag(it.tag) } : it));
        return [
          ...prev,
          {
            id: `trade-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            name: listing.name,
            type: listing.type,
            tag: "x1",
            icon: listing.icon,
            image: listing.image,
            iconColor: listing.iconColor,
            selected: false,
            desc: `Traded from another miner (${listing.seller}) via the Marketplace.`,
          },
        ];
      });
      pushToast(`Bought ${listing.name} from ${listing.seller}!`, "success");
      refreshListings();
    } catch (e) {
      pushToast(e.message || "That listing is no longer available.", "warning");
      refreshListings();
    }
  };

  const handleListItem = async (name, price) => {
    const poolItem = TRADE_ITEM_POOL.find((p) => p.name === name);
    if (!poolItem || !price || price <= 0) return;
    if (!isBackendOnline) return; // real trading requires the backend
    try {
      await callFunction("marketplace", { action: "list", itemName: poolItem.name, itemType: poolItem.type, price });
      setInventory((prev) =>
        prev
          .map((it) => (it.name === name ? { ...it, tag: `x${Math.max(0, parseInventoryQty(it.tag) - 1)}` } : it))
          .filter((it) => it.name !== name || parseInventoryQty(it.tag) > 0)
      );
      pushToast(`Listed ${name} for ${formatInt(price)} AETHER.`, "success");
      refreshListings();
    } catch (e) {
      pushToast(e.message || "Couldn't list that item.", "warning");
    }
  };

  const handleCancelListing = async (listingId) => {
    if (!isBackendOnline) return;
    try {
      await callFunction("marketplace", { action: "cancel", listingId });
      refreshListings();
    } catch (e) {
      pushToast(e.message || "Couldn't cancel that listing.", "warning");
    }
  };

  const handlePrestige = () => {
    if (!canPrestige) return;
    setPrestigeCount((p) => p + 1);
    setOwnedItems({ gpu_0: 1, rack_0: 1, cooling_0: 1, battery_0: 1, processor_0: 1, drone_0: 1 });
    setCore(0);
    setPending(0);
    setUnlockedIndex(0);
    setActiveSiteIndex(0);
  };

  const handleBoost = () => {
    if (boostActive || core < boostCost) return;
    setCore((c) => c - boostCost);
    addSpend("boost", boostCost);
    setBoostEndTime(Date.now() + 30 * 60 * 1000);
  };

  const handleActivateMysterySite = () => {
    if (!mysterySiteAvailable) return;
    setMysterySiteAvailableUntil(0);
    setMysteryBoostEndTime(Date.now() + 10 * 60 * 1000); // 10 minutes of 5x hashrate surge
  };

  // periodically roll a small chance to spawn a Mystery Site event when none is available or active
  useEffect(() => {
    const t = setInterval(() => {
      const nowTs = Date.now();
      if (nowTs < mysterySiteAvailableUntil || nowTs < mysteryBoostEndTime) return;
      if (Math.random() < 0.12) {
        setMysterySiteAvailableUntil(nowTs + 120000); // 2 minutes to activate before it vanishes
      }
    }, 10000);
    return () => clearInterval(t);
  }, [mysterySiteAvailableUntil, mysteryBoostEndTime]);

  if (!isLoaded) {
    return (
      <div
        className="app-shell relative flex flex-col items-center justify-center w-full max-w-md mx-auto text-white select-none overflow-hidden"
        style={{
          fontFamily: "'Rajdhani', 'Chakra Petch', 'Segoe UI', sans-serif",
          background: "radial-gradient(ellipse at 50% 0%, #1a1035 0%, #0a0a16 45%, #05050c 100%)",
        }}
      >
        <style>{`
          @keyframes loaderOrbit { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
          @keyframes loaderScan { 0% { transform: translateY(-100%); opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } 100% { transform: translateY(100%); opacity: 0; } }
          @keyframes loaderFloat { 0%, 100% { transform: translateY(0) scale(1); opacity: 0.4; } 50% { transform: translateY(-14px) scale(1.3); opacity: 0.9; } }
          @keyframes loaderBarFill { 0% { transform: translateX(-100%); } 100% { transform: translateX(250%); } }
        `}</style>

        {/* floating background particles */}
        {[...Array(14)].map((_, i) => (
          <span
            key={i}
            className="absolute rounded-full bg-indigo-300"
            style={{
              width: 2 + (i % 3),
              height: 2 + (i % 3),
              left: `${(i * 37) % 100}%`,
              top: `${(i * 53) % 100}%`,
              opacity: 0.5,
              animation: `loaderFloat ${2.4 + (i % 5) * 0.4}s ease-in-out infinite`,
              animationDelay: `${(i % 7) * 0.3}s`,
            }}
          />
        ))}

        {/* orbiting core */}
        <div className="relative w-24 h-24 flex items-center justify-center">
          <div
            className="absolute inset-0 rounded-full border-2 border-transparent"
            style={{ borderTopColor: "#818cf8", borderRightColor: "#818cf866", animation: "loaderOrbit 1.8s linear infinite" }}
          />
          <div
            className="absolute inset-[6px] rounded-full border-2 border-transparent"
            style={{ borderBottomColor: "#c084fc", borderLeftColor: "#c084fc55", animation: "loaderOrbit 1.3s linear infinite reverse" }}
          />
          <div className="absolute inset-0" style={{ animation: "loaderOrbit 2.2s linear infinite" }}>
            <div
              className="absolute rounded-full bg-cyan-300"
              style={{ width: 6, height: 6, top: -1, left: "50%", transform: "translateX(-50%)", boxShadow: "0 0 10px 3px rgba(103,232,249,0.85)" }}
            />
          </div>
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-400 to-purple-600 flex items-center justify-center text-2xl shadow-[0_0_30px_-2px_rgba(129,140,248,0.85)] animate-pulse">
            ⚡
          </div>
        </div>

        <div className="mt-6 text-[14px] font-extrabold tracking-[0.2em] text-white" style={{ textShadow: "0 0 12px rgba(129,140,248,0.6)" }}>
          AETHER MINING
        </div>

        <div className="mt-2.5 h-4 relative overflow-hidden w-full flex items-center justify-center">
          <div key={loadingMsgIndex} className="text-[10.5px] text-slate-400" style={{ animation: "loaderScan 1.1s ease-in-out" }}>
            {LOADING_MESSAGES[loadingMsgIndex]}
          </div>
        </div>

        <div className="mt-4 w-32 h-1 rounded-full bg-white/10 overflow-hidden relative">
          <div
            className="absolute inset-y-0 w-1/3 rounded-full bg-gradient-to-r from-indigo-400 to-cyan-300"
            style={{ animation: "loaderBarFill 1.4s ease-in-out infinite" }}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className="app-shell flex flex-col w-full max-w-md mx-auto text-white select-none"
      style={{
        fontFamily: "'Rajdhani', 'Chakra Petch', 'Segoe UI', sans-serif",
        background: "radial-gradient(ellipse at 50% 0%, #1a1035 0%, #0a0a16 45%, #05050c 100%)",
        WebkitTextSizeAdjust: "100%",
        textSizeAdjust: "100%",
      }}
    >
      <style>{MACHINE_ANIMATION_CSS}</style>

      {/* GLOBAL TOAST NOTIFICATIONS — Boost ended, listing sold, auto-sell, etc. */}
      <div className="fixed top-2 left-0 right-0 z-[60] flex flex-col items-center gap-1.5 px-4 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto max-w-[340px] w-full rounded-xl px-3.5 py-2 text-[11.5px] font-semibold text-center shadow-lg backdrop-blur-sm border ${
              t.tone === "success"
                ? "bg-emerald-500/15 border-emerald-400/40 text-emerald-300"
                : t.tone === "warning"
                ? "bg-amber-500/15 border-amber-400/40 text-amber-300"
                : "bg-white/10 border-white/20 text-white"
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        {screen === "shop" ? (
          <ShopScreen
            onBack={() => setScreen("dashboard")}
            ownedItems={ownedItems}
            core={core}
            totalHashrate={totalHashrate}
            onBuy={handleBuyShopItem}
            marketStock={marketStock}
            marketOwned={marketOwned}
            onBuyMarket={handleBuyMarketItem}
            autoClaimUnlocked={autoClaimUnlocked}
            autoClaimActive={autoClaimActive}
            onBuyAutoClaim={handleBuyAutoClaim}
            onToggleAutoClaim={handleToggleAutoClaim}
            onOpenLootbox={() => {
              setLootboxPhase("idle");
              setLootboxResult(null);
              setShowLootboxModal(true);
            }}
          />
        ) : screen === "site" ? (
          <SiteScreen
            onBack={() => setScreen("dashboard")}
            unlockedIndex={unlockedIndex}
            activeSiteIndex={activeSiteIndex}
            core={core}
            onUnlock={handleUnlockSite}
            onSelect={handleSelectSite}
          />
        ) : screen === "inventory" ? (
          <InventoryScreen
            onBack={() => setScreen("dashboard")}
            inventory={inventory}
            autoSellEnabled={autoSellEnabled}
            onToggleAutoSell={() => setAutoSellEnabled((a) => !a)}
            ownedItems={ownedItems}
            core={core}
            onUpgrade={handleLevelUpItem}
          />
        ) : screen === "craft" ? (
          <CraftScreen
            onBack={() => setScreen("dashboard")}
            ownedItems={ownedItems}
            core={core}
            totalHashrate={totalHashrate}
            inventory={inventory}
            onUpgrade={handleLevelUpItem}
            onCraft={handleCraft}
            onUpgradeAll={handleUpgradeAll}
            bulkUpgradeNotice={bulkUpgradeNotice}
          />
        ) : screen === "market" ? (
          <MarketScreen
            onBack={() => setScreen("dashboard")}
            core={core}
            marketListings={marketListings}
            myListings={myListings}
            saleNotice={saleNotice}
            onBuyListing={handleBuyListing}
            onListItem={handleListItem}
            onCancelListing={handleCancelListing}
            isBackendOnline={isBackendOnline}
          />
        ) : screen === "profile" ? (
          <ProfileScreen
            onBack={() => setScreen("dashboard")}
            totalEarned={totalEarned}
            totalHashrate={totalHashrate}
            unlockedIndex={unlockedIndex}
            name={playerName}
            onRename={setPlayerName}
            totalMined={isBackendOnline ? globalTotalMined : totalMined}
            isGlobalSupply={isBackendOnline}
            incomeStats={incomeStats}
            spendStats={spendStats}
            onNavigate={setScreen}
          />
        ) : screen === "networkStats" ? (
          <NetworkStatsScreen
            onBack={() => setScreen("dashboard")}
            isBackendOnline={isBackendOnline}
            totalMined={isBackendOnline ? globalTotalMined : totalMined}
            totalHashrate={totalHashrate}
          />
        ) : screen === "missions" ? (
          <MissionScreen
            onBack={() => setScreen("dashboard")}
            stats={{ dailyClaims, upgradeCount, totalHashrate, marketVisited }}
            claimedMissionIds={claimedMissionIds}
            onClaim={handleClaimMission}
          />
        ) : screen === "event" ? (
          <EventScreen
            onBack={() => setScreen("dashboard")}
            stats={{ claimCount, totalEarned, totalHashrate }}
            claimedEventIds={claimedEventIds}
            onClaim={handleClaimEvent}
          />
        ) : screen === "achievements" ? (
          <AchievementScreen onBack={() => setScreen("dashboard")} totalEarned={totalEarned} totalHashrate={totalHashrate} unlockedIndex={unlockedIndex} />
        ) : screen === "leaderboard" ? (
          <LeaderboardScreen onBack={() => setScreen("dashboard")} playerName={playerName} totalHashrate={totalHashrate} totalEarned={totalEarned} isBackendOnline={isBackendOnline} />
        ) : screen === "guild" ? (
          <GuildScreen
            onBack={() => setScreen("dashboard")}
            playerName={playerName}
            totalHashrate={totalHashrate}
            guildId={guildId}
            guildPoints={guildPoints}
            milestoneIndex={guildMilestoneIndex}
            onJoinGuild={handleJoinGuild}
            onClaimMilestone={handleClaimGuildMilestone}
          />
        ) : screen === "inbox" ? (
          <InboxScreen onBack={() => setScreen("dashboard")} inboxItems={inboxItems} onClaimInboxItem={handleClaimInboxItem} />
        ) : screen === "codex" ? (
          <CodexScreen onBack={() => setScreen("dashboard")} />
        ) : (
          <DashboardScreen
            core={core}
            pending={pending}
            totalHashrate={totalHashrate}
            site={SITES[activeSiteIndex]}
            siteIndex={activeSiteIndex}
            unlockedIndex={unlockedIndex}
            claimPulse={claimPulse}
            floatingGains={floatingGains}
            onClaim={handleClaim}
            claimCooldownRemaining={Math.max(0, Math.ceil((claimCooldownUntil - now) / 1000))}
            onNavigate={setScreen}
            boostActive={boostActive}
            boostEndTime={boostEndTime}
            boostCost={boostCost}
            onBoost={handleBoost}
            onOpenDaily={() => setShowDailyModal(true)}
            dailyUnclaimed={dailyUnclaimed}
            autoClaimActive={autoClaimUnlocked && autoClaimActive}
            heatLevel={heatLevel}
            isOverheating={isOverheating}
            mysterySiteAvailable={mysterySiteAvailable}
            mysteryBoostActive={mysteryBoostActive}
            mysterySiteAvailableUntil={mysterySiteAvailableUntil}
            mysteryBoostEndTime={mysteryBoostEndTime}
            onActivateMysterySite={handleActivateMysterySite}
            halvingEpoch={halvingEpoch}
            inboxUnclaimed={inboxItems.some((i) => !i.claimed)}
            totalEarned={totalEarned}
            // TEMP DEV/TEST CONTROL — lets you preview every site's visual without
            // actually unlocking it (doesn't touch unlockedIndex or progress/save).
            // Safe to delete this line + the prev/next arrows in DashboardScreen
            // once you're done reviewing site art.
            onDevPreviewSite={setActiveSiteIndex}
          />
        )}
      </div>
      <DailyStreakModal
        isOpen={showDailyModal}
        onClose={() => setShowDailyModal(false)}
        streak={pendingStreakDay}
        pendingDay={pendingStreakDay}
        alreadyClaimedToday={!dailyUnclaimed}
        onClaim={handleClaimDaily}
      />
      <OfflineEarningsModal
        isOpen={showOfflineModal}
        onClose={() => setShowOfflineModal(false)}
        earnings={offlineEarnings}
        durationSeconds={offlineDuration}
      />
      <LootBoxModal
        isOpen={showLootboxModal}
        onClose={() => setShowLootboxModal(false)}
        phase={lootboxPhase}
        result={lootboxResult}
        core={core}
        onOpen={handleOpenLootbox}
      />
      <BottomNav screen={screen} setScreen={setScreen} />
    </div>
  );
}
