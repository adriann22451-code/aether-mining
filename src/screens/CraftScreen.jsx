import { Hammer } from "lucide-react";
import { CraftRecipeCard } from "../components/cards/CraftRecipeCard";
import { ScreenHeader } from "../components/layout/ScreenHeader";
import { CRAFT_RECIPES } from "../data/craft";

export function CraftScreen({ onBack, ownedItems, core, inventory, onCraft }) {
  return (
    <div className="px-4 pt-5 pb-6">
      <ScreenHeader title="CRAFT" onBack={onBack} />

      <div className="mt-4 flex items-center gap-1.5 text-[11px] text-slate-500">
        <Hammer size={12} className="text-fuchsia-400 shrink-0" />
        Combine Materials + AETHER to craft a part you don't own yet. Already own it? Level it up from the Inventory screen instead.
      </div>
      <div className="mt-3 flex flex-col gap-2.5">
        {CRAFT_RECIPES.map((recipe) => (
          <CraftRecipeCard key={recipe.id} recipe={recipe} inventory={inventory} core={core} ownedItems={ownedItems} onCraft={onCraft} />
        ))}
      </div>
    </div>
  );
}
