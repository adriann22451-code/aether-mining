import { AetherCoinIcon } from "../icons/CustomIcons";
import { canCraftRecipe, isRecipeOwned } from "../../data/craft";
import { getInventoryQty, inventoryCatalog } from "../../data/inventory";
import { RARITY_COLORS, findPartItem } from "../../data/parts";
import { formatInt } from "../../lib/format";

export function CraftRecipeCard({ recipe, inventory, core, ownedItems, onCraft }) {
  const found = findPartItem(recipe.targetId);
  if (!found) return null;
  const { item, category } = found;
  const Icon = category.icon;
  const rarityColor = RARITY_COLORS[item.rarity] || category.color;
  const isShiny = item.rarity === "Epic" || item.rarity === "Legendary";
  const owned = isRecipeOwned(recipe, ownedItems);
  const canCraft = canCraftRecipe(recipe, inventory, core, ownedItems);
  const canAffordAether = core >= recipe.aetherCost;

  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 p-3 flex items-center gap-3 backdrop-blur-sm">
      <div
        className="relative w-14 h-14 shrink-0 rounded-xl flex items-center justify-center overflow-hidden"
        style={{
          "--rglow": `${rarityColor}${item.rarity === "Legendary" ? "cc" : "99"}`,
          background: `linear-gradient(160deg, ${rarityColor}40 0%, #0d1420 85%)`,
          border: `1px solid ${rarityColor}66`,
          animation: isShiny ? `rarityPulse ${item.rarity === "Legendary" ? "1.6s" : "2.2s"} ease-in-out infinite` : undefined,
        }}
      >
        <div className="absolute -right-3 -top-3 w-6 h-6 rotate-45 opacity-80" style={{ background: rarityColor }} />
        {item.image ? (
          <img src={item.image} alt={item.name} className="relative w-full h-full object-contain p-1" />
        ) : (
          <Icon size={30} className="relative" style={{ color: rarityColor }} />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-[12.5px] font-bold text-white truncate">{item.name}</span>
          <span className="text-[9px] font-bold shrink-0" style={{ color: rarityColor }}>
            {item.rarity}
          </span>
        </div>
        {owned ? (
          <div className="mt-1.5 text-[10px] font-semibold text-emerald-400">Already owned — level it up from Inventory instead.</div>
        ) : (
          <>
            <div className="mt-1.5 flex flex-wrap items-center gap-1">
              {recipe.materials.map((m) => {
                const have = getInventoryQty(inventory, m.name);
                const enough = have >= m.qty;
                const mat = inventoryCatalog.find((c) => c.name === m.name);
                const MatIcon = mat?.icon;
                return (
                  <span
                    key={m.name}
                    className={`flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9.5px] font-bold ${
                      enough ? "bg-white/5 text-slate-300" : "bg-rose-500/10 text-rose-400"
                    }`}
                  >
                    {MatIcon && <MatIcon size={10} style={{ color: mat.iconColor }} />}
                    {have}/{m.qty}
                  </span>
                );
              })}
            </div>
            <div className={`mt-1.5 text-[10px] font-semibold flex items-center gap-1 ${canAffordAether ? "text-amber-300" : "text-rose-400"}`}>
              <AetherCoinIcon size={10} />
              {formatInt(recipe.aetherCost)} AETHER
            </div>
          </>
        )}
      </div>
      <button
        type="button"
        onClick={() => onCraft(recipe.id)}
        disabled={!canCraft}
        className={`shrink-0 self-stretch rounded-lg px-3 flex items-center justify-center text-[11px] font-extrabold transition active:scale-[0.97] ${
          canCraft
            ? "bg-gradient-to-b from-fuchsia-500 to-purple-600 text-white shadow-[0_2px_10px_-2px_rgba(217,70,239,0.6)]"
            : "bg-white/5 text-slate-500"
        }`}
      >
        {owned ? "OWNED" : "CRAFT"}
      </button>
    </div>
  );
}
