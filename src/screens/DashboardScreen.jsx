import { useState } from "react";
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
  Target,
  Thermometer,
  Trophy,
  UserPlus,
  Users,
  Zap,
} from "lucide-react";
import { referralTiers } from "../data/referral";
import { AetherCoinIcon } from "../components/icons/CustomIcons";
import AnimatedSprite from "../components/layout/AnimatedSprite";
import { FloatingClaimNumbers } from "../components/layout/FloatingClaimNumbers";
import ROOM_BG_IMG from "../assets/images/room-bg.webp";
import SMALL_WAREHOUSE_SPRITE_IMG from "../assets/images/small-warehouse-sprite.webp";
import GENESIS_CORE_SPRITE_IMG from "../assets/images/genesis-core-sprite.webp";
import MEGA_DATA_CENTER_SPRITE_IMG from "../assets/images/room-mega-data-center-sprite.webp";
import { calcPlayerLevel } from "../data/economy";
import { SITES, SITE_BG_IMAGES } from "../data/sites";
import { SMALL_WAREHOUSE_SPRITE_FRAMES, SMALL_WAREHOUSE_SPRITE_META } from "../data/spriteFrames";
import { GENESIS_CORE_SPRITE_FRAMES, GENESIS_CORE_SPRITE_META } from "../data/genesisCoreSpriteFrames";
import { MEGA_DATA_CENTER_SPRITE_FRAMES, MEGA_DATA_CENTER_SPRITE_META } from "../data/megaDataCenterSpriteFrames";
import { SNOWFLAKES } from "../data/uiConstants";
import { formatCore, formatHashrate, formatInt } from "../lib/format";
import { useTween } from "../lib/hooks";

// sites that have an animated sprite scene instead of a static background image
const SITE_SPRITES = {
  1: { src: SMALL_WAREHOUSE_SPRITE_IMG, frames: SMALL_WAREHOUSE_SPRITE_FRAMES, meta: SMALL_WAREHOUSE_SPRITE_META },
  4: { src: MEGA_DATA_CENTER_SPRITE_IMG, frames: MEGA_DATA_CENTER_SPRITE_FRAMES, meta: MEGA_DATA_CENTER_SPRITE_META },
  10: { src: GENESIS_CORE_SPRITE_IMG, frames: GENESIS_CORE_SPRITE_FRAMES, meta: GENESIS_CORE_SPRITE_META },
};

export function DashboardScreen({ core, pending, totalHashrate, site, siteIndex, unlockedIndex, claimPulse, floatingGains, onClaim, claimCooldownRemaining = 0, onNavigate, boostActive, boostEndTime, boostCost, onBoost, onWatchAdBoost, adBoostAvailable, onOpenDaily, dailyUnclaimed, autoClaimActive, heatLevel, isOverheating, mysterySiteAvailable, mysteryBoostActive, mysterySiteAvailableUntil, mysteryBoostEndTime, onActivateMysterySite, halvingEpoch, inboxUnclaimed, totalEarned, referralCount = 0, claimedReferralIds = [], onDevPreviewSite }) {
  const coreDisplay = useTween(core, 700);
  const pendingDisplay = useTween(pending, 350);
  const [parallax, setParallax] = useState({ x: 0, y: 0 });
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
      {/* MINING RIG VISUAL AREA — themed by current Mining Site. Fills the
          entire remaining screen space (no more 16:9 letterboxing on tall
          phone screens). The header, quick-access toolbar, mystery-site
          banner and heat gauge float as a HUD overlay on top of it. */}
      <div className="relative flex-1 min-h-0">
      <div
        className="relative w-full h-full rounded-xl overflow-hidden border"
        style={{
          borderColor: `${site.theme.accent}33`,
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

        {/* HUD OVERLAY — profile/balance, quick-access toolbar, mystery-site
            banner and heat gauge float on top of the visual instead of taking
            up separate rows, so the site art fills nearly the whole screen */}
        <div
          className="absolute top-0 left-0 right-0 z-20 px-2.5 pt-2.5 pb-4 flex flex-col gap-1.5 pointer-events-none"
          style={{ background: "linear-gradient(180deg, rgba(4,6,16,0.75) 0%, rgba(4,6,16,0.45) 55%, transparent 100%)" }}
        >
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
                🧑‍🚀
              </div>
              <span className="text-[10px] font-extrabold text-indigo-300 tracking-wide whitespace-nowrap">LV.{calcPlayerLevel(totalEarned).level}</span>
            </button>

            <div className="flex-1 flex items-center gap-1.5 bg-white/10 border border-white/15 rounded-xl px-2.5 py-1.5 backdrop-blur-sm min-w-0">
              <div className="flex items-center gap-1 min-w-0">
                <AetherCoinIcon size={16} />
                <span className="text-[11px] font-extrabold text-amber-200 whitespace-nowrap truncate">{formatCore(coreDisplay)}</span>
              </div>
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

          <div className="grid grid-cols-9 gap-1 bg-white/10 border border-white/15 rounded-xl p-0.5 backdrop-blur-sm pointer-events-auto">
            {[
              { icon: Inbox, key: "inbox", badge: inboxUnclaimed },
              ...sideItems,
              { icon: Calendar, key: "__daily", onPress: onOpenDaily, badge: dailyUnclaimed },
              { icon: Crown, key: "leaderboard" },
              { icon: Users, key: "guild" },
              { icon: UserPlus, key: "referral", badge: referralTiers.some((t) => referralCount >= t.friends && !claimedReferralIds.includes(t.id)) },
              { icon: BookOpen, key: "codex" },
            ].map((item, i) => (
              <button
                type="button"
                key={item.key || i}
                onClick={() => (item.onPress ? item.onPress() : onNavigate(item.key))}
                className="relative aspect-square rounded-lg flex items-center justify-center active:scale-90 transition hover:bg-white/10"
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

        {/* one full isometric mining room image (AI-generated), or an animated
            sprite scene for sites that have one (e.g. Small Warehouse, Genesis Core) */}
        {SITE_SPRITES[siteIndex] ? (
          <div
            className="absolute inset-0"
            style={{
              transform: `translate3d(${parallax.x * 8}px, ${parallax.y * 8}px, 0) scale(1.06)`,
              transition: "transform 0.15s ease-out",
            }}
          >
            <AnimatedSprite
              fill
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

        {/* SUBTLE SMOKE PARTICLE FROM THE MACHINE */}
        <div
          className="absolute z-10 rounded-full"
          style={{
            left: "44%",
            top: "30%",
            width: 6,
            height: 6,
            background: "rgba(255,255,255,0.5)",
            animation: "smokeRise 3.2s ease-out infinite",
          }}
        />
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
      <div className="shrink-0 flex gap-2">
        <div className="relative flex-1">
        <button
          type="button"
          onClick={onClaim}
          disabled={pending < 0.01 || claimCooldownRemaining > 0}
          className={`relative w-full rounded-xl py-3 flex items-center justify-center gap-2 font-extrabold text-[14px] text-amber-950 transition-transform active:scale-[0.98] ${
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
        <div className="shrink-0 flex flex-col gap-1.5">
          <button
            type="button"
            onClick={onBoost}
            disabled={boostActive || core < boostCost}
            className={`w-[84px] rounded-xl py-3 flex flex-col items-center justify-center gap-0.5 font-extrabold text-[10px] transition-transform active:scale-[0.98] ${
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
          {!boostActive && onWatchAdBoost && (
            <button
              type="button"
              onClick={onWatchAdBoost}
              disabled={!adBoostAvailable}
              className={`w-[84px] rounded-xl py-1.5 flex items-center justify-center gap-1 font-bold text-[9px] transition-transform active:scale-[0.98] ${
                adBoostAvailable
                  ? "bg-sky-500/15 border border-sky-400/40 text-sky-300"
                  : "bg-white/5 border border-white/10 text-slate-500"
              }`}
            >
              <PlayCircle size={11} />
              {adBoostAvailable ? "FREE (AD)" : "WATCHED"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
