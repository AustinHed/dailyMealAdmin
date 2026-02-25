"use client";

import { useRouter } from "next/navigation";

import type { RecipeListItem } from "@/lib/firestore";

type RecipeCardProps = {
  recipe: RecipeListItem;
};

function displayNumber(value: number | null): string {
  return value === null ? "-" : String(value);
}

export function RecipeCard({ recipe }: RecipeCardProps) {
  const router = useRouter();

  const openRecipe = () => {
    router.push(`/recipes/${recipe.id}`);
  };

  return (
    <tr
      className="cursor-pointer border-t border-slate-200 transition hover:bg-slate-50 focus-within:bg-slate-50"
      onClick={openRecipe}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openRecipe();
        }
      }}
      role="button"
      tabIndex={0}
    >
      <td className="px-4 py-3 text-sm font-medium text-slate-900">{recipe.title || "Untitled"}</td>
      <td className="px-4 py-3 text-sm text-slate-600">{recipe.cuisine || "-"}</td>
      <td className="px-4 py-3 text-sm text-slate-600">{displayNumber(recipe.servings)}</td>
      <td className="px-4 py-3 text-sm text-slate-600">{displayNumber(recipe.prepTimeMinutes)}</td>
    </tr>
  );
}
