import { SiteCard } from "../components/cards/SiteCard";
import { ScreenHeader } from "../components/layout/ScreenHeader";
import { SITES } from "../data/sites";

export function SiteScreen({ onBack, unlockedIndex, activeSiteIndex, core, onUnlock, onSelect }) {
  return (
    <div className="px-4 pt-5 pb-6">
      <ScreenHeader title="MINING SITE" onBack={onBack} />

      <div className="mt-4 rounded-2xl bg-gradient-to-br from-cyan-950/50 via-[#0a1a2e]/80 to-indigo-950/60 border border-cyan-400/20 px-5 py-3 text-center">
        <div className="text-[10px] tracking-[0.25em] text-cyan-300 font-semibold">SITES UNLOCKED</div>
        <div className="mt-1 text-2xl font-extrabold text-white">
          {unlockedIndex + 1} / {SITES.length}
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2.5">
        {SITES.map((site, i) => (
          <SiteCard
            key={site.id}
            site={site}
            index={i}
            unlockedIndex={unlockedIndex}
            activeSiteIndex={activeSiteIndex}
            core={core}
            onUnlock={onUnlock}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  );
}
