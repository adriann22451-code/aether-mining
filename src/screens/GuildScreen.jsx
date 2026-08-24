import {
  Crown,
  Gift,
} from "lucide-react";
import { ScreenHeader } from "../components/layout/ScreenHeader";
import { GUILDS, guildMilestoneFor, guildRewardFor } from "../data/guild";
import { formatHashrate, formatInt } from "../lib/format";

export function GuildScreen({ onBack, playerName, totalHashrate, guildId, guildPoints, milestoneIndex, onJoinGuild, onClaimMilestone }) {
  const guild = GUILDS.find((g) => g.id === guildId);
  const milestone = guildMilestoneFor(milestoneIndex);
  const reward = guildRewardFor(milestoneIndex);
  const pct = Math.min(100, Math.round((guildPoints / milestone) * 100));
  const canClaim = guildPoints >= milestone;

  if (!guild) {
    return (
      <div className="px-4 pt-5 pb-6">
        <ScreenHeader title="GUILD" onBack={onBack} />
        <p className="mt-2 text-[11.5px] leading-relaxed text-slate-400">
          Join a guild to combine hashrate with other miners and earn shared AETHER rewards at weekly milestones.
        </p>
        <div className="mt-4 flex flex-col gap-3">
          {GUILDS.map((g) => {
            const totalRate = g.members.reduce((s, m) => s + m.rate, 0);
            return (
              <div key={g.id} className="rounded-2xl bg-white/5 border border-white/10 p-3.5 backdrop-blur-sm">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 text-[11px] font-extrabold"
                    style={{ background: `${g.color}22`, border: `1px solid ${g.color}55`, color: g.color }}
                  >
                    {g.tag}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-bold text-white">{g.name}</div>
                    <div className="text-[10.5px] text-slate-400">{g.members.length} members · ~{totalRate} pts/s</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onJoinGuild(g.id)}
                  className="mt-3 w-full rounded-xl py-2 text-[12px] font-extrabold text-white active:scale-[0.97] transition"
                  style={{ background: `linear-gradient(180deg, ${g.color}, ${g.color}cc)` }}
                >
                  JOIN {g.tag}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 pt-5 pb-6">
      <ScreenHeader title="GUILD" onBack={onBack} />

      <div
        className="mt-4 rounded-2xl px-4 py-3 border"
        style={{ background: `${guild.color}15`, borderColor: `${guild.color}44` }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-[10px] font-extrabold"
            style={{ background: `${guild.color}22`, border: `1px solid ${guild.color}55`, color: guild.color }}
          >
            {guild.tag}
          </div>
          <div>
            <div className="text-[13.5px] font-extrabold text-white">{guild.name}</div>
            <div className="text-[10.5px] text-slate-400">{guild.members.length + 1} members</div>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-2xl bg-white/5 border border-white/10 p-3.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-extrabold tracking-[0.1em] text-white">WEEKLY MILESTONE #{milestoneIndex + 1}</span>
          <span className="text-[10.5px] font-semibold text-slate-400">{formatInt(guildPoints)} / {formatInt(milestone)}</span>
        </div>
        <div className="mt-2 h-2 rounded-full bg-black/40 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${guild.color}, #22d3ee)` }}
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
            onClick={onClaimMilestone}
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

      <div className="mt-4 text-[11px] font-extrabold tracking-[0.12em] text-white">MEMBERS</div>
      <div className="mt-2 flex flex-col gap-1.5">
        <div className="rounded-2xl bg-cyan-500/10 border border-cyan-400/40 p-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-cyan-400/20 border border-cyan-400/50 flex items-center justify-center shrink-0">
            <Crown size={13} className="text-cyan-300" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[12px] font-bold text-cyan-300 truncate">
              {playerName} <span className="text-[9px] text-cyan-400 font-bold">(YOU)</span>
            </div>
          </div>
          <div className="text-[10.5px] font-semibold text-slate-300">{formatHashrate(totalHashrate)}</div>
        </div>
        {guild.members.map((m) => (
          <div key={m.name} className="rounded-2xl bg-white/5 border border-white/10 p-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0 text-[10px] font-bold text-slate-400">
              {m.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0 text-[12px] font-bold text-white truncate">{m.name}</div>
            <div className="text-[10.5px] font-semibold text-slate-400">~{m.rate} pts/s</div>
          </div>
        ))}
      </div>
    </div>
  );
}
