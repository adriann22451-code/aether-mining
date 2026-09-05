import { inventoryCatalog } from "../../data/inventory";
import { RARITY_COLORS, findPartItem } from "../../data/parts";

// Shown when the user taps CRAFT on a recipe: a short "forging" animation
// (materials orbiting into a spinning ring around the target part) followed
// by a reveal of the finished part — same reveal language as LootBoxModal
// (rarityPulse / lootRaysSpin / lootFlash) so it feels consistent, not bolted-on.
export function CraftingModal({ isOpen, phase, recipe, onClose }) {
  if (!isOpen || !recipe) return null;
  const found = findPartItem(recipe.targetId);
  if (!found) return null;
  const { item, category } = found;
  const rarityColor = RARITY_COLORS[item.rarity] || category.color;
  const isShiny = item.rarity === "Epic" || item.rarity === "Legendary";
  const isCrafting = phase === "crafting";
  const materials = recipe.materials || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-5">
      <div className="w-full max-w-[340px] rounded-3xl bg-gradient-to-br from-indigo-950 via-[#140a2e] to-fuchsia-950 border border-fuchsia-400/30 p-5 text-center shadow-[0_0_40px_-10px_rgba(129,90,238,0.5)]">
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-extrabold tracking-[0.1em] text-white">CRAFTING</span>
          {!isCrafting && (
            <button
              type="button"
              onClick={onClose}
              className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center active:scale-90 transition text-slate-300 text-[12px]"
            >
              ✕
            </button>
          )}
        </div>

        <div className="relative mx-auto mt-5 w-24 h-24">
          {isCrafting ? (
            <>
              {materials.map((m, i) => {
                const mat = inventoryCatalog.find((c) => c.name === m.name);
                const MatIcon = mat?.icon;
                return (
                  <div
                    key={m.name}
                    className="absolute left-1/2 top-1/2 w-6 h-6 -ml-3 -mt-3 rounded-lg bg-[#0d1420] border border-white/10 flex items-center justify-center"
                    style={{ animation: "craftOrbit 1.3s linear infinite", animationDelay: `${i * 0.35}s` }}
                  >
                    {MatIcon && <MatIcon size={12} style={{ color: mat.iconColor }} />}
                  </div>
                );
              })}
              <div
                className="absolute inset-2 rounded-2xl border-2 border-dashed"
                style={{ borderColor: `${rarityColor}88`, animation: "craftForgeSpin 1.7s linear infinite" }}
              />
              <div className="absolute inset-4 rounded-xl bg-white/5 flex items-center justify-center overflow-hidden">
                <div
                  className="absolute inset-0"
                  style={{ background: `radial-gradient(circle, ${rarityColor}33 0%, transparent 70%)`, animation: "craftPulseCore 0.75s ease-in-out infinite alternate" }}
                />
                {item.image ? (
                  <img src={item.image} alt="" className="relative w-9 h-9 object-contain opacity-50" />
                ) : (
                  <category.icon size={24} className="relative" style={{ color: rarityColor, opacity: 0.55 }} />
                )}
              </div>
            </>
          ) : (
            <>
              {isShiny && (
                <>
                  <div
                    className="absolute left-1/2 top-1/2 w-24 h-24 rounded-full pointer-events-none"
                    style={{ background: `radial-gradient(circle, ${rarityColor}cc 0%, ${rarityColor}00 70%)`, animation: "lootFlash 0.6s ease-out forwards" }}
                  />
                  <div
                    className="absolute left-1/2 top-1/2 w-32 h-32 pointer-events-none"
                    style={{ background: `repeating-conic-gradient(${rarityColor}55 0deg 8deg, transparent 8deg 20deg)`, animation: "lootRaysSpin 5s linear infinite" }}
                  />
                </>
              )}
              <div
                className="relative mx-auto w-24 h-24 rounded-2xl flex items-center justify-center overflow-hidden"
                style={{
                  "--rglow": `${rarityColor}${item.rarity === "Legendary" ? "cc" : "99"}`,
                  background: `linear-gradient(160deg, ${rarityColor}40 0%, #0d1420 85%)`,
                  border: `1px solid ${rarityColor}66`,
                  animation: `lootRevealPop 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) both${isShiny ? `, rarityPulse ${item.rarity === "Legendary" ? "1.6s" : "2.2s"} ease-in-out 0.45s infinite` : ""}`,
                }}
              >
                {item.image ? (
                  <img src={item.image} alt={item.name} className="w-full h-full object-contain p-2" />
                ) : (
                  <category.icon size={40} style={{ color: rarityColor }} />
                )}
              </div>
            </>
          )}
        </div>

        {isCrafting ? (
          <p className="mt-4 text-[12px] font-semibold text-slate-300 tracking-wide">Forging {item.name}…</p>
        ) : (
          <>
            <div className="mt-4 text-[13px] font-extrabold text-white">{item.name} Crafted!</div>
            <div className="text-[10px] font-bold mt-0.5" style={{ color: rarityColor }}>
              {item.rarity} · {category.label}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="mt-4 w-full rounded-xl py-3 text-[13px] font-extrabold text-white bg-gradient-to-b from-fuchsia-500 to-purple-600 shadow-[0_0_18px_-2px_rgba(217,70,239,0.6)] active:scale-[0.97] transition"
            >
              NICE!
            </button>
          </>
        )}
      </div>
    </div>
  );
}
