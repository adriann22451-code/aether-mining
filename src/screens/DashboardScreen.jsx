import { useEffect, useRef, useState } from "react";
import {
  BookOpen,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Crown,
  Flame,
  Gem,
  Gift,
  Inbox,
  PlayCircle,
  Sparkles,
  Swords,
  Target,
  Thermometer,
  TrendingUp,
  Trophy,
  UserPlus,
  X,
  Zap,
} from "lucide-react";
import { referralTiers } from "../data/referral";
import { AetherCoinIcon } from "../components/icons/CustomIcons";
import AnimatedSprite from "../components/layout/AnimatedSprite";
import { FloatingClaimNumbers } from "../components/layout/FloatingClaimNumbers";
import ROOM_BG_IMG from "../assets/images/room-bg.webp";
import GARAGE_SPRITE_IMG from "../assets/images/garage-sprite.webp";
import SMALL_WAREHOUSE_SPRITE_IMG from "../assets/images/small-warehouse-sprite.webp";
import DESERT_SPRITE_IMG from "../assets/images/desert-sprite.webp";
import LOCAL_DATA_CENTER_SPRITE_IMG from "../assets/images/local-data-center-sprite.webp";
import VOLCANO_SPRITE_IMG from "../assets/images/volcano-sprite.webp";
import ARCTIC_FACILITY_SPRITE_IMG from "../assets/images/arctic-facility-sprite.webp";
import LUNAR_BASE_SPRITE_IMG from "../assets/images/lunar-base-sprite.webp";
import ORBITAL_STATION_SPRITE_IMG from "../assets/images/orbital-station-sprite.webp";
import GENESIS_CORE_SPRITE_IMG from "../assets/images/genesis-core-sprite.webp";
import MEGA_DATA_CENTER_SPRITE_IMG from "../assets/images/room-mega-data-center-sprite.webp";
import { calcPlayerLevel } from "../data/economy";
import { SITES, SITE_BG_IMAGES } from "../data/sites";
import { GARAGE_SPRITE_FRAMES, GARAGE_SPRITE_META } from "../data/garageSpriteFrames";
import { SMALL_WAREHOUSE_SPRITE_FRAMES, SMALL_WAREHOUSE_SPRITE_META } from "../data/spriteFrames";
import { DESERT_SPRITE_FRAMES, DESERT_SPRITE_META } from "../data/desertSpriteFrames";
import { LOCAL_DATA_CENTER_SPRITE_FRAMES, LOCAL_DATA_CENTER_SPRITE_META } from "../data/localDataCenterSpriteFrames";
import { VOLCANO_SPRITE_FRAMES, VOLCANO_SPRITE_META } from "../data/volcanoSpriteFrames";
import { ARCTIC_FACILITY_SPRITE_FRAMES, ARCTIC_FACILITY_SPRITE_META } from "../data/arcticFacilitySpriteFrames";
import { LUNAR_BASE_SPRITE_FRAMES, LUNAR_BASE_SPRITE_META } from "../data/lunarBaseSpriteFrames";
import { ORBITAL_STATION_SPRITE_FRAMES, ORBITAL_STATION_SPRITE_META } from "../data/orbitalStationSpriteFrames";
import { GENESIS_CORE_SPRITE_FRAMES, GENESIS_CORE_SPRITE_META } from "../data/genesisCoreSpriteFrames";
import { MEGA_DATA_CENTER_SPRITE_FRAMES, MEGA_DATA_CENTER_SPRITE_META } from "../data/megaDataCenterSpriteFrames";
import { SNOWFLAKES } from "../data/uiConstants";
import { formatCore, formatHashrate, formatInt } from "../lib/format";
import { useTween } from "../lib/hooks";

// sites that have an animated sprite scene instead of a static background image
const SITE_SPRITES = {
  0: { src: GARAGE_SPRITE_IMG, frames: GARAGE_SPRITE_FRAMES, meta: GARAGE_SPRITE_META },
  1: { src: SMALL_WAREHOUSE_SPRITE_IMG, frames: SMALL_WAREHOUSE_SPRITE_FRAMES, meta: SMALL_WAREHOUSE_SPRITE_META },
  4: { src: MEGA_DATA_CENTER_SPRITE_IMG, frames: MEGA_DATA_CENTER_SPRITE_FRAMES, meta: MEGA_DATA_CENTER_SPRITE_META },
  3: { src: LOCAL_DATA_CENTER_SPRITE_IMG, frames: LOCAL_DATA_CENTER_SPRITE_FRAMES, meta: LOCAL_DATA_CENTER_SPRITE_META },
  5: { src: DESERT_SPRITE_IMG, frames: DESERT_SPRITE_FRAMES, meta: DESERT_SPRITE_META },
  6: { src: VOLCANO_SPRITE_IMG, frames: VOLCANO_SPRITE_FRAMES, meta: VOLCANO_SPRITE_META },
  7: { src: ARCTIC_FACILITY_SPRITE_IMG, frames: ARCTIC_FACILITY_SPRITE_FRAMES, meta: ARCTIC_FACILITY_SPRITE_META },
  8: { src: LUNAR_BASE_SPRITE_IMG, frames: LUNAR_BASE_SPRITE_FRAMES, meta: LUNAR_BASE_SPRITE_META },
  9: { src: ORBITAL_STATION_SPRITE_IMG, frames: ORBITAL_STATION_SPRITE_FRAMES, meta: ORBITAL_STATION_SPRITE_META },
  10: { src: GENESIS_CORE_SPRITE_IMG, frames: GENESIS_CORE_SPRITE_FRAMES, meta: GENESIS_CORE_SPRITE_META },
};

export function DashboardScreen({ core, pending, totalHashrate, site, siteIndex, unlockedIndex, claimPulse, floatingGains, onClaim, claimCooldownRemaining = 0, onNavigate, boostActive, boostEndTime, boostCost, onBoost, onWatchAdBoost, adBoostAvailable, onOpenDaily, dailyUnclaimed, autoClaimActive, heatLevel, isOverheating, mysterySiteAvailable, mysteryBoostActive, mysterySiteAvailableUntil, mysteryBoostEndTime, onActivateMysterySite, halvingEpoch, inboxUnclaimed, totalEarned, referralCount = 0, claimedReferralIds = [], incomeStats, spendStats, onDevPreviewSite, telegramPhotoUrl }) {
  const coreDisplay = useTween(core, 700);
  const pendingDisplay = useTween(pending, 350);
  const [parallax, setParallax] = useState({ x: 0, y: 0 });
  const [showBalanceHistory, setShowBalanceHistory] = useState(false);

  // Measures the space left for the mining-rig art (below the header, above
  // the progress bar / claim button) so the art box itself can be sized to
  // exactly match the current site's native media ratio — no cropping AND
  // no empty letterbox strip inside the box, since the box IS the media's
  // size (centered in whatever room is left; any leftover space shows the
  // normal page background outside the box, not inside it).
  const artWrapRef = useRef(null);
  const [artWrapSize, setArtWrapSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const el = artWrapRef.current;
    if (!el) return;
    const compute = () => setArtWrapSize({ width: el.clientWidth, height: el.clientHeight });
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const handleParallaxMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    const py = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    setParallax({ x: px, y: py });
  };
  const resetParallax = () => setParallax({ x: 0, y: 0 });
  const rigs = [
    { color: "from-fuchsia-500 to-purple-700", x: "8%", y: "42%", size: 78 },
    { color: "from-cyan-400 to-blue-700", x: "26%", y: "36%", size: 92 },
    { color: "from-amber-400 to-orange-700", x: "48%", y: "30%", size: 84 },
    { color: "from-cyan-300 to-teal-700", x: "10%", y: "68%", size: 56 },
    { color: "from-slate-400 to-slate-700", x: "34%", y: "70%", size: 50 },
  ];
  const sideItems = [
    { icon: Trophy, label: "Missions", badge: true, key: "missions" },
    { icon: Gift, label: "Event", badge: true, key: "event" },
    { icon: Target, label: "Achievements", badge: false, key: "achievements" },
  ];
  const nextSite = SITES[unlockedIndex + 1];
  const progressPct = nextSite ? Math.min(100, (core / nextSite.cost) * 100) : 100;
  const SiteIcon = site.icon;

  const spriteMeta = SITE_SPRITES[siteIndex]?.meta;
  let artBoxStyle = { width: "100%", height: "100%" };
  if (spriteMeta && artWrapSize.width && artWrapSize.height) {
    const scale = Math.min(artWrapSize.width / spriteMeta.frameWidth, artWrapSize.height / spriteMeta.frameHeight);
    artBoxStyle = { width: spriteMeta.frameWidth * scale, height: spriteMeta.frameHeight * scale };
  } else if (spriteMeta) {
    // not measured yet on first paint — render invisible-sized to avoid a
    // full-box flash before the real (correctly-ratioed) size is known
    artBoxStyle = { width: 0, height: 0 };
  }

  return (
    <div className="relative px-3 pt-2 pb-2 h-full flex flex-col gap-1.5 overflow-hidden">
      {isOverheating && (
        <div
          className="pointer-events-none absolute inset-0 z-40"
          style={{
            boxShadow: "inset 0 0 90px 10px rgba(239,68,68,0.55)",
            animation: "overheatVignette 1.3s ease-in-out infinite",
          }}
        />
      )}
      {/* HEADER BAR — profile/balance, quick-access toolbar, mystery-site
          banner and heat gauge. Flows normally above the art (not an
          overlay on top of it), so the mining-rig art box below can be
          sized to its own native ratio with zero cropping and zero empty
          space inside it. */}
      <div className="shrink-0 flex flex-col gap-1.5">
          <div className="flex items-center gap-2 pointer-events-auto">
            <button
              type="button"
              onClick={() => onNavigate("profile")}
              className="flex items-center gap-1.5 bg-white/10 border border-white/15 rounded-xl pl-1 pr-2.5 py-1 backdrop-blur-sm active:scale-95 transition"
            >
              <div
                className="relative rounded-lg bg-gradient-to-br from-indigo-400 to-purple-600 flex items-center justify-center text-[13px] overflow-hidden ring-1 ring-indigo-300/40"
                style={{ width: 26, height: 26 }}
              >
                {telegramPhotoUrl ? (
                  <img src={telegramPhotoUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  "🧑‍🚀"
                )}
              </div>
              <span className="text-[10px] font-extrabold text-indigo-300 tracking-wide whitespace-nowrap">LV.{calcPlayerLevel(totalEarned).level}</span>
            </button>

            <div className="flex-1 flex items-center gap-1.5 bg-white/10 border border-white/15 rounded-xl px-2.5 py-1.5 backdrop-blur-sm min-w-0">
              <button
                type="button"
                onClick={() => setShowBalanceHistory(true)}
                className="flex items-center gap-1 min-w-0 active:scale-95 transition"
              >
                <AetherCoinIcon size={16} />
                <span className="text-[11px] font-extrabold text-amber-200 whitespace-nowrap truncate">{formatCore(coreDisplay)}</span>
              </button>
              <div className="w-px h-3.5 bg-white/15 shrink-0" />
              <div
                className={`flex items-center gap-1 min-w-0 ${boostActive ? "rounded-full border px-1.5 -my-0.5" : ""}`}
                style={boostActive ? { animation: "boostGlowPulse 1.1s ease-in-out infinite" } : undefined}
              >
                {boostActive ? (
                  <Zap size={11} className="text-amber-300 shrink-0" style={{ animation: "boostSparkle 1.1s ease-in-out infinite" }} />
                ) : (
                  <Gem size={11} className="text-indigo-300 shrink-0" />
                )}
                <span className="text-[11px] font-extrabold text-slate-200 whitespace-nowrap truncate">{formatHashrate(totalHashrate)}</span>
              </div>
            </div>
          </div>

          {/* single compact row, horizontally scrollable — keeps the HUD
              thin (doesn't eat into the site art below) while still giving
              each icon a comfortable, un-cramped size instead of squeezing
              9 into fixed grid columns */}
          <div
            className="no-scrollbar flex items-center gap-1 overflow-x-auto bg-white/10 border border-white/15 rounded-xl px-1 py-1 backdrop-blur-sm pointer-events-auto"
            style={{ scrollbarWidth: "none" }}
          >
            {[
              { icon: Inbox, key: "inbox", badge: inboxUnclaimed },
              ...sideItems,
              { icon: Calendar, key: "__daily", onPress: onOpenDaily, badge: dailyUnclaimed },
              { icon: Crown, key: "leaderboard" },
              { icon: Swords, key: "guild" },
              { icon: UserPlus, key: "referral", badge: referralTiers.some((t) => referralCount >= t.friends && !claimedReferralIds.includes(t.id)) },
              { icon: BookOpen, key: "codex" },
            ].map((item, i) => (
              <button
                type="button"
                key={item.key || i}
                onClick={() => (item.onPress ? item.onPress() : onNavigate(item.key))}
                className="relative shrink-0 w-9 h-9 rounded-lg flex items-center justify-center active:scale-90 transition hover:bg-white/10"
              >
                <item.icon
                  size={16}
                  className="text-amber-300"
                  style={{ filter: "drop-shadow(0 0 4px rgba(251,191,36,0.6))" }}
                />
                {item.badge && <span className="absolute top-0.5 right-1.5 w-1.5 h-1.5 rounded-full bg-red-500 ring-1 ring-black/60" />}
              </button>
            ))}
          </div>

          {mysterySiteAvailable && (() => {
            const secsLeft = Math.max(0, Math.ceil((mysterySiteAvailableUntil - Date.now()) / 1000));
            return (
              <button
                type="button"
                onClick={onActivateMysterySite}
                className="relative w-full rounded-xl px-3 py-2 flex items-center gap-2 text-left active:scale-[0.98] transition overflow-hidden pointer-events-auto"
                style={{
                  background: "linear-gradient(90deg, rgba(217,70,239,0.3), rgba(99,102,241,0.3))",
                  border: "1px solid rgba(217,70,239,0.5)",
                  animation: "portalBorderPulse 1.4s ease-in-out infinite",
                }}
              >
                <div
                  className="pointer-events-none absolute inset-y-0 w-1/3"
                  style={{
                    background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)",
                    animation: "portalShimmerSweep 2.2s ease-in-out infinite",
                  }}
                />
                <Sparkles size={16} className="text-fuchsia-300 shrink-0" style={{ animation: "sparkleTwinkle 1.1s ease-in-out infinite" }} />
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-extrabold text-white">Mysterious Site Detected!</div>
                  <div className="text-[9.5px] text-fuchsia-200">Tap to activate a 5x hashrate surge before it vanishes</div>
                </div>
                <span
                  className="shrink-0 text-[9px] font-mono font-bold"
                  style={secsLeft <= 5 ? { animation: "urgentCountdown 0.5s ease-in-out infinite" } : { color: "#f5d0fe" }}
                >
                  {secsLeft}s
                </span>
              </button>
            );
          })()}
          {mysteryBoostActive && (
            <div
              className="w-full rounded-xl px-3 py-2 flex items-center gap-2 pointer-events-auto"
              style={{
                background: "linear-gradient(90deg, rgba(217,70,239,0.25), rgba(99,102,241,0.25))",
                border: "1px solid rgba(217,70,239,0.4)",
                animation: "portalBorderPulse 1.8s ease-in-out infinite",
              }}
            >
              <Zap
                size={16}
                className="text-fuchsia-300 shrink-0"
                style={{ filter: "drop-shadow(0 0 5px rgba(217,70,239,0.9))", animation: "surgeFlicker 2.4s linear infinite" }}
              />
              <div className="flex-1 min-w-0 text-[11px] font-extrabold text-white">Mysterious Surge Active — 5x Hashrate!</div>
              <span className="shrink-0 text-[9px] font-mono font-bold text-fuchsia-200">
                {Math.max(0, Math.ceil((mysteryBoostEndTime - Date.now()) / 60000))}m left
              </span>
            </div>
          )}

          <div className="flex items-center gap-2 pointer-events-auto">
            <Thermometer
              size={12}
              className={isOverheating ? "text-red-400" : heatLevel > 70 ? "text-amber-400" : "text-cyan-300"}
            />
            <div className="flex-1 h-1.5 rounded-full bg-black/40 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, heatLevel)}%`,
                  background: isOverheating
                    ? "linear-gradient(90deg, #f87171, #ef4444)"
                    : heatLevel > 70
                    ? "linear-gradient(90deg, #fbbf24, #f59e0b)"
                    : "linear-gradient(90deg, #22d3ee, #38bdf8)",
                }}
              />
            </div>
            <span className={`text-[9px] font-bold shrink-0 ${isOverheating ? "text-red-400" : "text-slate-400"}`}>
              {Math.round(heatLevel)}%
            </span>
          </div>
          {isOverheating && (
            <div className="flex items-center gap-1 text-[9.5px] font-bold text-red-400 animate-pulse pointer-events-auto">
              <Flame size={10} />
              OVERHEATING — hashrate reduced by 30%. Upgrade Cooling to fix it!
            </div>
          )}
      </div>

      {/* MINING RIG VISUAL AREA — the box is sized in JS (see artBoxStyle
          above) to exactly match the current site's native media ratio:
          the animated sprite scenes' real frame ratio (16:9-ish for
          Genesis Core / Mega Data Center, portrait for Small Warehouse),
          or the full remaining space for sites using a static full-room
          image. That's what removes the empty top/bottom letterbox strip
          — the box IS the art's size, centered in whatever room this flex
          area has left, instead of being stretched/cropped to fill it. */}
      <div ref={artWrapRef} className="relative flex-1 min-h-0 flex flex-col items-center gap-2">
      <div
        className="relative rounded-xl overflow-hidden border"
        style={{
          borderColor: `${site.theme.accent}33`,
          ...artBoxStyle,
        }}
        onPointerMove={handleParallaxMove}
        onPointerLeave={resetParallax}
      >
        {isOverheating && (
          <div
            className="pointer-events-none absolute inset-0 z-30"
            style={{
              background: "radial-gradient(ellipse at 50% 60%, rgba(248,113,113,0.35) 0%, rgba(248,113,113,0) 65%)",
              animation: "heatHaze 1.8s ease-in-out infinite",
            }}
          />
        )}
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(160deg, ${site.theme.from} 0%, ${site.theme.via} 40%, ${site.theme.to} 100%)`,
            transform: `translate3d(${parallax.x * 3}px, ${parallax.y * 3}px, 0) scale(1.03)`,
            transition: "transform 0.15s ease-out",
          }}
        />

        {/* one full isometric mining room image (AI-generated), or an animated
            sprite scene for sites that have one (e.g. Small Warehouse, Genesis Core) */}
        {SITE_SPRITES[siteIndex] ? (
          <div
            className="absolute inset-0"
            style={{
              transform: `translate3d(${parallax.x * 8}px, ${parallax.y * 8}px, 0) scale(1.02)`,
              transition: "transform 0.15s ease-out",
            }}
          >
            <AnimatedSprite
              className="w-full h-full"
              src={SITE_SPRITES[siteIndex].src}
              frames={SITE_SPRITES[siteIndex].frames}
              frameWidth={SITE_SPRITES[siteIndex].meta.frameWidth}
              frameHeight={SITE_SPRITES[siteIndex].meta.frameHeight}
              sheetWidth={SITE_SPRITES[siteIndex].meta.sheetWidth}
              sheetHeight={SITE_SPRITES[siteIndex].meta.sheetHeight}
            />
          </div>
        ) : (
          <img
            src={SITE_BG_IMAGES[siteIndex] || ROOM_BG_IMG}
            alt="Mining Room"
            draggable={false}
            className="absolute inset-0 w-full h-full"
            style={{
              objectFit: "cover",
              objectPosition: "center",
              transform: `translate3d(${parallax.x * 8}px, ${parallax.y * 8}px, 0) scale(1.06)`,
              transition: "transform 0.15s ease-out",
            }}
          />
        )}

        {/* TEMP DEV/TEST CONTROL — cycles the visual through every site (locked
            or not) so you can preview all the art. Doesn't touch unlockedIndex,
            so real progress/save is untouched. Delete this block + the
            onDevPreviewSite prop once you're done reviewing site art. */}
        {onDevPreviewSite && (
          <div className="absolute bottom-2 right-2 z-10 flex items-center gap-1">
            <button
              type="button"
              onClick={() => onDevPreviewSite((siteIndex - 1 + SITES.length) % SITES.length)}
              className="w-6 h-6 rounded-lg bg-black/40 backdrop-blur-sm flex items-center justify-center active:scale-90 transition"
            >
              <ChevronLeft size={13} className="text-white" />
            </button>
            <button
              type="button"
              onClick={() => onDevPreviewSite((siteIndex + 1) % SITES.length)}
              className="w-6 h-6 rounded-lg bg-black/40 backdrop-blur-sm flex items-center justify-center active:scale-90 transition"
            >
              <ChevronRight size={13} className="text-white" />
            </button>
          </div>
        )}

        <div
          className="absolute bottom-2 left-2 z-10 flex items-center gap-1.5 bg-black/30 rounded-lg px-2 py-1 backdrop-blur-sm"
          style={{ transform: `translate3d(${parallax.x * 14}px, ${parallax.y * 14}px, 0)`, transition: "transform 0.12s ease-out" }}
        >
          <SiteIcon
            size={12}
            style={{
              color: site.theme.accent,
              filter: `drop-shadow(0 0 4px ${site.theme.accent}) drop-shadow(0 0 8px ${site.theme.accent}aa)`,
            }}
          />
          <span className="text-[9px] font-bold" style={{ color: site.theme.accent, textShadow: `0 0 6px ${site.theme.accent}88` }}>
            {site.name}
          </span>
        </div>

        {/* SNOWFALL — Arctic Facility only */}
        {site.id === 7 && (
          <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden">
            {SNOWFLAKES.map((f, i) => (
              <div
                key={i}
                className="absolute rounded-full bg-white/85 shadow-[0_0_3px_rgba(255,255,255,0.8)]"
                style={{
                  left: `${f.left}%`,
                  top: "-6%",
                  width: f.size,
                  height: f.size,
                  "--drift": `${f.drift}px`,
                  animation: `snowFall ${f.duration}s linear ${f.delay}s infinite`,
                }}
              />
            ))}
          </div>
        )}

      </div>

      {/* SITE INFO / STATS CARD — fills the leftover vertical space below the
          art box (the box is width-bound to the media's native ratio, so on
          a tall phone there's room left; this puts it to use instead of
          leaving it empty). */}
      <div className="w-full flex-1 min-h-0 rounded-xl bg-white/5 border border-white/10 p-3 flex flex-col gap-2.5 overflow-hidden">
        <div className="flex items-start gap-2">
          <div
            className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: `${site.theme.accent}22`, border: `1px solid ${site.theme.accent}44` }}
          >
            <SiteIcon size={16} style={{ color: site.theme.accent }} />
          </div>
          <div className="min-w-0">
            <div className="text-[13px] font-bold text-slate-100 truncate">{site.name}</div>
            <div className="text-[10.5px] text-slate-400 leading-snug line-clamp-2">{site.desc}</div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-1.5">
          <div className="rounded-lg bg-black/25 px-2 py-1.5 flex flex-col items-center gap-0.5">
            <Zap size={12} className="text-cyan-300" />
            <span className="text-[10px] font-bold text-slate-100">{formatHashrate(totalHashrate)}</span>
            <span className="text-[8px] text-slate-500 uppercase tracking-wide">Hashrate</span>
          </div>
          <div className="rounded-lg bg-black/25 px-2 py-1.5 flex flex-col items-center gap-0.5">
            <TrendingUp size={12} className="text-emerald-300" />
            <span className="text-[10px] font-bold text-slate-100">×{site.bonus}</span>
            <span className="text-[8px] text-slate-500 uppercase tracking-wide">Site Bonus</span>
          </div>
          <div className="rounded-lg bg-black/25 px-2 py-1.5 flex flex-col items-center gap-0.5">
            <Thermometer size={12} className={isOverheating ? "text-red-400" : "text-amber-300"} />
            <span className={`text-[10px] font-bold ${isOverheating ? "text-red-400" : "text-slate-100"}`}>{Math.round(heatLevel)}%</span>
            <span className="text-[8px] text-slate-500 uppercase tracking-wide">Temp</span>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-lg bg-black/25 px-2.5 py-1.5">
          <span className="text-[10px] text-slate-400">Total Aether earned</span>
          <div className="flex items-center gap-1">
            <AetherCoinIcon size={12} />
            <span className="text-[11px] font-bold text-amber-200">{formatCore(totalEarned)}</span>
          </div>
        </div>
      </div>
      </div>

      {/* NEXT MINING SITE PROGRESS */}
      <div className="shrink-0 rounded-xl bg-white/5 border border-white/10 px-3.5 py-1.5 flex items-center gap-3 backdrop-blur-sm">
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-semibold text-slate-200 truncate">
            {nextSite ? `Heading to ${nextSite.name}` : "Genesis Core — Top Site"}
          </div>
          <div className="mt-1 flex items-center gap-2">
            <div className="flex-1 h-1.5 rounded-full bg-black/40 overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500" style={{ width: `${progressPct}%` }} />
            </div>
            <span className="text-[9px] font-bold text-slate-400 shrink-0">
              {nextSite ? `${Math.round(progressPct)}%` : "MAX"}
            </span>
          </div>
        </div>
        {nextSite && (
          <div className="flex items-center gap-1 pl-2 border-l border-white/10 shrink-0">
            <AetherCoinIcon size={13} />
            <span className="text-[12px] font-bold text-amber-200">{formatInt(nextSite.cost)}</span>
          </div>
        )}
        <button
          type="button"
          onClick={() => onNavigate("site")}
          className="shrink-0 w-7 h-7 rounded-full bg-white/10 flex items-center justify-center active:scale-90 transition"
        >
          <ChevronRight size={14} />
        </button>
      </div>

      {/* CLAIM + BOOST BUTTONS */}
      <div className="shrink-0 flex gap-2 items-stretch">
        <div className="relative flex-1">
        <button
          type="button"
          onClick={onClaim}
          disabled={pending < 0.01 || claimCooldownRemaining > 0}
          className={`relative h-full w-full rounded-xl py-3 flex items-center justify-center gap-2 font-extrabold text-[14px] text-amber-950 transition-transform active:scale-[0.98] ${
            pending < 0.01 || claimCooldownRemaining > 0 ? "opacity-50" : claimPulse ? "shadow-[0_0_30px_rgba(251,191,36,0.55)]" : "shadow-[0_0_18px_rgba(251,191,36,0.3)]"
          }`}
          style={{ background: "linear-gradient(180deg, #ffe27a 0%, #fbbf24 45%, #f59e0b 100%)" }}
        >
          {autoClaimActive && (
            <span className="absolute -top-1.5 -right-1.5 flex items-center gap-0.5 bg-emerald-500 text-white text-[8px] font-extrabold px-1.5 py-0.5 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.7)]">
              <Zap size={8} />
              AUTO
            </span>
          )}
          {halvingEpoch > 0 && (
            <span className="absolute -top-1.5 -left-1.5 flex items-center gap-0.5 bg-slate-800 text-amber-300 text-[8px] font-extrabold px-1.5 py-0.5 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.5)] border border-amber-400/40">
              ½ ×{halvingEpoch}
            </span>
          )}
          {claimCooldownRemaining > 0 ? (
            <span className="tracking-wide">WAIT {claimCooldownRemaining}s</span>
          ) : (
            <>
              <span className="tracking-wide">CLAIM</span>
              <span className="flex items-center gap-1.5 bg-black/15 rounded-full px-2.5 py-0.5">
                <AetherCoinIcon size={13} />
                {formatCore(pendingDisplay)} AETHER
              </span>
            </>
          )}
        </button>
        <FloatingClaimNumbers items={floatingGains} />
        </div>
        <div className="shrink-0 w-[84px] flex flex-col gap-1.5">
          <button
            type="button"
            onClick={onBoost}
            disabled={boostActive || core < boostCost}
            className={`flex-1 rounded-xl flex flex-col items-center justify-center gap-0.5 font-extrabold text-[10px] transition-transform active:scale-[0.98] ${
              boostActive
                ? "bg-emerald-500/20 border border-emerald-400/50 text-emerald-300"
                : core < boostCost
                ? "bg-white/5 border border-white/10 text-slate-500"
                : "bg-gradient-to-b from-fuchsia-500 to-purple-700 text-white shadow-[0_0_16px_-2px_rgba(217,70,239,0.6)]"
            }`}
          >
            <Zap size={14} />
            {boostActive ? `${Math.max(0, Math.ceil((boostEndTime - Date.now()) / 60000))}m 2x` : "BOOST 2x"}
            {!boostActive && <span className="text-[9px] opacity-80">{formatInt(boostCost)}</span>}
          </button>
          {!boostActive && onWatchAdBoost ? (
            <button
              type="button"
              onClick={onWatchAdBoost}
              disabled={!adBoostAvailable}
              className={`flex-1 rounded-xl flex items-center justify-center gap-1 font-bold text-[9.5px] transition-transform active:scale-[0.98] ${
                adBoostAvailable
                  ? "bg-sky-500/15 border border-sky-400/40 text-sky-300"
                  : "bg-white/5 border border-white/10 text-slate-500"
              }`}
            >
              <PlayCircle size={11} />
              {adBoostAvailable ? "FREE (AD)" : "WATCHED"}
            </button>
          ) : (
            <div className="flex-1" />
          )}
        </div>
      </div>

      {showBalanceHistory && (
        <BalanceHistoryModal incomeStats={incomeStats} spendStats={spendStats} onClose={() => setShowBalanceHistory(false)} />
      )}
    </div>
  );
}

const INCOME_LABELS = {
  mining: "Mining claims", offline: "Offline earnings", dailyStreak: "Daily streak", missions: "Missions",
  events: "Events", referrals: "Referrals", guild: "Guild milestones", lootbox: "Loot Box wins",
  marketSales: "Marketplace sales", autoSell: "Auto-sell", inbox: "Inbox gifts",
};
const SPEND_LABELS = {
  shop: "Shop purchases", upgrades: "Part upgrades", sites: "Site unlocks", specialItems: "Special items",
  boost: "2x Boost", autoClaim: "Auto-claim", lootbox: "Loot Box", crafting: "Crafting", marketBuys: "Marketplace buys",
};

function BalanceHistoryModal({ incomeStats, spendStats, onClose }) {
  const income = Object.entries(incomeStats || {}).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  const spend = Object.entries(spendStats || {}).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  const totalIn = income.reduce((s, [, v]) => s + v, 0);
  const totalOut = spend.reduce((s, [, v]) => s + v, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-sm max-h-[75vh] overflow-y-auto rounded-t-2xl bg-[#12121e] border-t border-white/10 p-4 pb-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="text-[13px] font-extrabold text-white">BALANCE HISTORY</div>
          <button type="button" onClick={onClose} className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-slate-300 active:scale-90 transition">
            <X size={14} />
          </button>
        </div>

        <div className="mt-3 flex gap-2">
          <div className="flex-1 rounded-xl bg-emerald-500/10 border border-emerald-400/25 px-3 py-2">
            <div className="text-[9.5px] font-bold text-emerald-300/80">TOTAL EARNED</div>
            <div className="text-[14px] font-extrabold text-emerald-300">+{formatCore(totalIn)}</div>
          </div>
          <div className="flex-1 rounded-xl bg-rose-500/10 border border-rose-400/25 px-3 py-2">
            <div className="text-[9.5px] font-bold text-rose-300/80">TOTAL SPENT</div>
            <div className="text-[14px] font-extrabold text-rose-300">-{formatCore(totalOut)}</div>
          </div>
        </div>

        <div className="mt-4 text-[10.5px] font-extrabold tracking-[0.1em] text-slate-400">EARNED FROM</div>
        <div className="mt-1.5 flex flex-col gap-1">
          {income.length === 0 && <div className="text-[11px] text-slate-500 py-2">Nothing earned yet.</div>}
          {income.map(([key, value]) => (
            <div key={key} className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
              <span className="text-[11.5px] text-slate-200">{INCOME_LABELS[key] || key}</span>
              <span className="text-[11.5px] font-bold text-emerald-300">+{formatCore(value)}</span>
            </div>
          ))}
        </div>

        <div className="mt-4 text-[10.5px] font-extrabold tracking-[0.1em] text-slate-400">SPENT ON</div>
        <div className="mt-1.5 flex flex-col gap-1">
          {spend.length === 0 && <div className="text-[11px] text-slate-500 py-2">Nothing spent yet.</div>}
          {spend.map(([key, value]) => (
            <div key={key} className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
              <span className="text-[11.5px] text-slate-200">{SPEND_LABELS[key] || key}</span>
              <span className="text-[11.5px] font-bold text-rose-300">-{formatCore(value)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
