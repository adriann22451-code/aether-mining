import {
  Crown,
  Gift,
  LogOut,
  Plus,
  Shield,
  Swords,
  Users,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { ScreenHeader } from "../components/layout/ScreenHeader";
import {
  DEFAULT_GUILD_ICON, GUILD_COLOR_PRESETS, GUILD_CREATE_COST, GUILD_ICON_PRESETS, GUILD_MAX_MEMBERS,
  guildIconSrc, guildMilestoneFor, guildRewardFor,
} from "../data/guild";
import { formatHashrate, formatInt } from "../lib/format";

const CONFETTI_COLORS = ["#facc15", "#22d3ee", "#c084fc", "#4ade80", "#f472b6"];

// Guild emblem images live in public/guild-icons and may not have been
// generated/uploaded yet — fall back to the plain Shield glyph so a
// missing file never shows a broken-image icon.
function GuildEmblem({ iconKey, color, size = 44, className = "" }) {
  const [failed, setFailed] = useState(false);
  const src = guildIconSrc(iconKey);
  return (
    <div
      className={`shrink-0 rounded-2xl flex items-center justify-center overflow-hidden ${className}`}
      style={{ width: size, height: size, background: `${color}22`, border: `1.5px solid ${color}66` }}
    >
      {!failed && iconKey ? (
        <img
          src={src}
          alt=""
          className="w-full h-full object-contain"
          onError={() => setFailed(true)}
        />
      ) : (
        <Shield size={Math.round(size * 0.5)} style={{ color }} />
      )}
    </div>
  );
}

export function GuildScreen({
  onBack, core, guildInfo, guildPoints, isOwner, roster, guildList,
  onEnter, onCreateGuild, onJoinGuild, onLeaveGuild, onDisbandGuild, onKickMember, onClaimMilestone,
}) {
  const [celebrate, setCelebrate] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [tag, setTag] = useState("");
  const [color, setColor] = useState(GUILD_COLOR_PRESETS[0]);
  const [icon, setIcon] = useState(DEFAULT_GUILD_ICON);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [kickTarget, setKickTarget] = useState(null);

  useEffect(() => {
    onEnter?.();
  }, [onEnter]);

  // ---------- not in a guild yet: browse + create ----------
  if (!guildInfo) {
    return (
      <div className="px-4 pt-5 pb-6">
        <ScreenHeader title="GUILDS" onBack={onBack} />
        <p className="mt-2 text-[11.5px] leading-relaxed text-slate-400">
          Join a guild to pool hashrate contributions with other real miners and claim shared AETHER milestones together.
        </p>

        {!showCreate ? (
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="mt-4 w-full rounded-2xl border border-dashed border-fuchsia-400/40 bg-fuchsia-500/5 py-3 flex items-center justify-center gap-2 text-[12.5px] font-extrabold text-fuchsia-300 active:scale-[0.98] transition"
          >
            <Plus size={16} />
            CREATE A GUILD — {formatInt(GUILD_CREATE_COST)} AETHER
          </button>
        ) : (
          <div className="mt-4 rounded-2xl bg-white/5 border border-white/10 p-4">
            <div className="text-[11px] font-extrabold tracking-[0.12em] text-white">NEW GUILD</div>
            <input
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 24))}
              placeholder="Guild name"
              className="mt-2.5 w-full rounded-lg bg-black/30 border border-white/10 px-3 py-2 text-[12.5px] text-white placeholder:text-slate-500 outline-none focus:border-fuchsia-400/50"
            />
            <input
              value={tag}
              onChange={(e) => setTag(e.target.value.toUpperCase().slice(0, 5))}
              placeholder="TAG (2–5 letters)"
              className="mt-2 w-full rounded-lg bg-black/30 border border-white/10 px-3 py-2 text-[12.5px] text-white placeholder:text-slate-500 outline-none focus:border-fuchsia-400/50"
            />
            <div className="mt-2.5 flex items-center gap-2">
              {GUILD_COLOR_PRESETS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className="w-7 h-7 rounded-full shrink-0 transition"
                  style={{ background: c, boxShadow: color === c ? `0 0 0 2px #0a0a12, 0 0 0 4px ${c}` : "none" }}
                />
              ))}
            </div>

            <div className="mt-3 text-[10px] font-bold text-slate-400 uppercase tracking-wide">Emblem</div>
            <div className="mt-1.5 grid grid-cols-5 gap-2">
              {GUILD_ICON_PRESETS.map((preset) => {
                const isSel = icon === preset.key;
                return (
                  <button
                    key={preset.key}
                    type="button"
                    onClick={() => setIcon(preset.key)}
                    className="flex flex-col items-center rounded-2xl transition"
                    style={{ boxShadow: isSel ? `0 0 0 2px #12121e, 0 0 0 4px ${color}` : "none", opacity: isSel ? 1 : 0.55 }}
                    title={preset.label}
                  >
                    <GuildEmblem iconKey={preset.key} color={color} size={40} />
                  </button>
                );
              })}
            </div>

            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="flex-1 rounded-lg bg-white/10 border border-white/15 py-2 text-[11.5px] font-bold text-slate-300 active:scale-[0.97] transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={name.trim().length < 3 || tag.trim().length < 2 || core < GUILD_CREATE_COST}
                onClick={() => onCreateGuild(name.trim(), tag.trim(), color, icon)}
                className="flex-1 rounded-lg bg-gradient-to-b from-fuchsia-500 to-purple-700 py-2 text-[11.5px] font-extrabold text-white shadow-[0_2px_10px_-2px_rgba(217,70,239,0.6)] active:scale-[0.97] transition disabled:opacity-40"
              >
                Found it — {formatInt(GUILD_CREATE_COST)}
              </button>
            </div>
            {core < GUILD_CREATE_COST && (
              <div className="mt-2 text-[10px] text-rose-300">You need {formatInt(GUILD_CREATE_COST - core)} more AETHER.</div>
            )}
          </div>
        )}

        <div className="mt-5 text-[11px] font-extrabold tracking-[0.12em] text-white">TOP GUILDS</div>
        <div className="mt-2 flex flex-col gap-3">
          {(!guildList || guildList.length === 0) && (
            <div className="rounded-2xl bg-white/5 border border-white/10 p-4 text-center text-[11.5px] text-slate-500">
              No guilds yet — be the first to found one!
            </div>
          )}
          {(guildList || []).map((g) => (
            <div key={g.id} className="rounded-2xl bg-white/5 border border-white/10 p-3.5 backdrop-blur-sm">
              <div className="flex items-center gap-2.5">
                <GuildEmblem iconKey={g.icon} color={g.color} size={44} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <div className="text-[13px] font-bold text-white truncate">{g.name}</div>
                    <span className="shrink-0 text-[9px] font-extrabold px-1.5 py-0.5 rounded" style={{ background: `${g.color}22`, color: g.color }}>
                      {g.tag}
                    </span>
                  </div>
                  <div className="text-[10.5px] text-slate-400">
                    {g.member_count}/{GUILD_MAX_MEMBERS} members · led by {g.ownerName}
                  </div>
                </div>
              </div>
              <button
                type="button"
                disabled={g.full}
                onClick={() => onJoinGuild(g.id)}
                className="mt-3 w-full rounded-xl py-2 text-[12px] font-extrabold text-white active:scale-[0.97] transition disabled:opacity-40"
                style={{ background: g.full ? "rgba(255,255,255,0.06)" : `linear-gradient(180deg, ${g.color}, ${g.color}cc)` }}
              >
                {g.full ? "FULL" : `JOIN ${g.tag}`}
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ---------- in a guild: MMORPG-style guild hall ----------
  const milestone = guildMilestoneFor(guildInfo.milestone_index);
  const reward = guildRewardFor(guildInfo.milestone_index);
  const pct = Math.min(100, Math.round((guildPoints / milestone) * 100));
  const canClaim = guildPoints >= milestone;

  return (
    <div className="px-4 pt-5 pb-6">
      <ScreenHeader title="GUILD HALL" onBack={onBack} />

      {/* banner */}
      <div
        className="mt-4 relative rounded-2xl px-4 py-4 border overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${guildInfo.color}26, rgba(10,10,20,0.6))`, borderColor: `${guildInfo.color}55` }}
      >
        <Shield size={90} className="absolute -right-3 -bottom-4 opacity-[0.08]" style={{ color: guildInfo.color }} />
        <div className="relative flex items-center gap-3">
          <GuildEmblem iconKey={guildInfo.icon} color={guildInfo.color} size={56} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <div className="text-[16px] font-extrabold text-white truncate">{guildInfo.name}</div>
              <span className="shrink-0 text-[9.5px] font-extrabold px-1.5 py-0.5 rounded" style={{ background: `${guildInfo.color}25`, color: guildInfo.color }}>
                {guildInfo.tag}
              </span>
            </div>
            <div className="mt-0.5 flex items-center gap-1.5 text-[10.5px] text-slate-300">
              <Users size={11} />
              {guildInfo.member_count}/{GUILD_MAX_MEMBERS} members
              {isOwner && (
                <span className="ml-1 flex items-center gap-0.5 text-amber-300 font-bold">
                  <Crown size={11} /> OWNER
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* milestone */}
      <div className="relative mt-4 rounded-2xl bg-white/5 border border-white/10 p-3.5 overflow-hidden">
        {celebrate && (
          <div className="pointer-events-none absolute inset-0 z-10">
            <div
              className="absolute inset-0"
              style={{ background: `linear-gradient(90deg, transparent, ${guildInfo.color}cc, transparent)`, animation: "milestoneBarFlash 0.7s ease-out forwards" }}
            />
            {Array.from({ length: 16 }).map((_, i) => {
              const cx = Math.round((Math.random() - 0.5) * 140);
              const cr = Math.round(Math.random() * 360 + 180);
              const delay = Math.random() * 0.15;
              const left = 10 + Math.random() * 80;
              return (
                <span
                  key={i}
                  className="absolute top-2 w-1.5 h-2.5 rounded-sm"
                  style={{
                    left: `${left}%`,
                    background: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
                    "--cx": `${cx}px`,
                    "--cr": `${cr}deg`,
                    animation: `confettiFall 0.9s ease-in forwards`,
                    animationDelay: `${delay}s`,
                  }}
                />
              );
            })}
          </div>
        )}
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-extrabold tracking-[0.1em] text-white">MILESTONE #{guildInfo.milestone_index + 1}</span>
          <span className="text-[10.5px] font-semibold text-slate-400">{formatInt(guildPoints)} / {formatInt(milestone)}</span>
        </div>
        <div className="mt-2 h-2 rounded-full bg-black/40 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${guildInfo.color}, #22d3ee)` }}
          />
        </div>
        <div className="mt-2.5 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-300">
            <Gift size={12} />
            Reward: {formatInt(reward)} AETHER
          </div>
          <button
            type="button"
            disabled={!canClaim}
            onClick={() => {
              if (!canClaim) return;
              setCelebrate(true);
              onClaimMilestone();
              setTimeout(() => setCelebrate(false), 1000);
            }}
            className={`rounded-lg px-3 py-1.5 text-[11px] font-extrabold transition active:scale-[0.97] ${
              canClaim
                ? "bg-gradient-to-b from-emerald-500 to-green-600 text-white shadow-[0_2px_10px_-2px_rgba(34,197,94,0.6)]"
                : "bg-white/5 text-slate-500"
            }`}
          >
            {canClaim ? "CLAIM" : "IN PROGRESS"}
          </button>
        </div>
      </div>

      {/* roster */}
      <div className="mt-4 flex items-center justify-between">
        <div className="text-[11px] font-extrabold tracking-[0.12em] text-white">ROSTER</div>
        <div className="flex items-center gap-1 text-[10px] text-slate-500">
          <Swords size={10} /> sorted by contribution
        </div>
      </div>
      <div className="mt-2 flex flex-col gap-1.5">
        {(roster || []).map((m) => (
          <div
            key={m.id}
            className={`rounded-2xl p-3 flex items-center gap-3 border ${
              m.isYou ? "bg-cyan-500/10 border-cyan-400/40" : "bg-white/5 border-white/10"
            }`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border ${
                m.isOwner ? "bg-amber-400/20 border-amber-400/50" : "bg-white/5 border-white/10"
              }`}
            >
              {m.isOwner ? (
                <Crown size={13} className="text-amber-300" />
              ) : (
                <span className="text-[10px] font-bold text-slate-400">{(m.username || "??").slice(0, 2).toUpperCase()}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className={`text-[12px] font-bold truncate ${m.isYou ? "text-cyan-300" : "text-white"}`}>
                {m.username} {m.isYou && <span className="text-[9px] text-cyan-400 font-bold">(YOU)</span>}
              </div>
              <div className="text-[9.5px] text-slate-500">{formatInt(m.guildPoints)} pts contributed</div>
            </div>
            <div className="text-[10.5px] font-semibold text-slate-300 shrink-0">{formatHashrate(m.cachedHashrate)}</div>
            {isOwner && !m.isOwner && (
              <button
                type="button"
                onClick={() => setKickTarget(m)}
                className="shrink-0 w-6 h-6 rounded-full bg-rose-500/15 border border-rose-400/40 flex items-center justify-center text-rose-300 active:scale-[0.9] transition"
              >
                <X size={12} />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* leave / disband */}
      <div className="mt-5">
        {confirmLeave ? (
          <div className="rounded-2xl bg-rose-500/10 border border-rose-400/30 p-3.5">
            <div className="text-[11.5px] text-rose-200 leading-relaxed">
              {isOwner
                ? "Disbanding removes the guild for everyone — this can't be undone."
                : "Leave this guild? Your milestone progress will reset to 0."}
            </div>
            <div className="mt-2.5 flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmLeave(false)}
                className="flex-1 rounded-lg bg-white/10 py-1.5 text-[11px] font-bold text-slate-300 active:scale-[0.97] transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmLeave(false);
                  isOwner ? onDisbandGuild() : onLeaveGuild();
                }}
                className="flex-1 rounded-lg bg-rose-600 py-1.5 text-[11px] font-extrabold text-white active:scale-[0.97] transition"
              >
                {isOwner ? "Disband" : "Leave"}
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmLeave(true)}
            className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 flex items-center justify-center gap-1.5 text-[11.5px] font-bold text-slate-400 active:scale-[0.98] transition"
          >
            <LogOut size={13} />
            {isOwner ? "Disband Guild" : "Leave Guild"}
          </button>
        )}
      </div>

      {/* kick confirm modal */}
      {kickTarget && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={() => setKickTarget(null)}>
          <div className="w-full max-w-sm rounded-t-2xl bg-[#12121e] border-t border-white/10 p-4 pb-6" onClick={(e) => e.stopPropagation()}>
            <div className="text-[13px] font-bold text-white">Kick {kickTarget.username}?</div>
            <div className="mt-1 text-[11px] text-slate-400">They'll be removed from the guild immediately and can rejoin any guild later.</div>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => setKickTarget(null)}
                className="flex-1 rounded-lg bg-white/10 py-2 text-[11.5px] font-bold text-slate-300 active:scale-[0.97] transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onKickMember(kickTarget.id);
                  setKickTarget(null);
                }}
                className="flex-1 rounded-lg bg-rose-600 py-2 text-[11.5px] font-extrabold text-white active:scale-[0.97] transition"
              >
                Kick
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
