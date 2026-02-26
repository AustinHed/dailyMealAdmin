"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import type { RecipeListItem } from "@/lib/firestore";
import { readLocalIdList, writeLocalIdList } from "@/lib/local-id-storage";

const CLEANED_RECIPES_STORAGE_KEY = "dailymeal.cleanedRecipes";

type RecipesTableProps = {
  recipes: RecipeListItem[];
};

type RecipeSortMode =
  | "title"
  | "recent"
  | "missingCalories"
  | "missingProtein"
  | "missingFat"
  | "missingCarbs";

function displayNumber(value: number | null): string {
  return value === null ? "-" : String(value);
}

function formatDate(value: number | null): string {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function sortRecipes(recipes: RecipeListItem[], sortMode: RecipeSortMode): RecipeListItem[] {
  const items = [...recipes];

  if (sortMode === "recent") {
    items.sort((a, b) => {
      const aCreatedAt = a.createdAtMs ?? Number.NEGATIVE_INFINITY;
      const bCreatedAt = b.createdAtMs ?? Number.NEGATIVE_INFINITY;

      if (aCreatedAt !== bCreatedAt) {
        return bCreatedAt - aCreatedAt;
      }

      return a.title.localeCompare(b.title);
    });

    return items;
  }

  if (sortMode.startsWith("missing")) {
    const macroKey =
      sortMode === "missingCalories"
        ? "calories"
        : sortMode === "missingProtein"
          ? "protein"
          : sortMode === "missingFat"
            ? "fat"
            : "carbs";

    items.sort((a, b) => {
      const aMissing = a.nutrition[macroKey] === null;
      const bMissing = b.nutrition[macroKey] === null;

      if (aMissing !== bMissing) {
        return aMissing ? -1 : 1;
      }

      const aCreatedAt = a.createdAtMs ?? Number.NEGATIVE_INFINITY;
      const bCreatedAt = b.createdAtMs ?? Number.NEGATIVE_INFINITY;
      if (aCreatedAt !== bCreatedAt) {
        return bCreatedAt - aCreatedAt;
      }

      return a.title.localeCompare(b.title);
    });

    return items;
  }

  items.sort((a, b) => a.title.localeCompare(b.title));
  return items;
}

function formatMacro(value: number | null): string {
  if (value === null) {
    return "-";
  }

  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export function RecipesTable({ recipes }: RecipesTableProps) {
  const router = useRouter();
  const [sortMode, setSortMode] = useState<RecipeSortMode>("recent");
  const [cleanedRecipeIds, setCleanedRecipeIds] = useState<string[]>(() =>
    readLocalIdList(CLEANED_RECIPES_STORAGE_KEY),
  );

  const sortedRecipes = useMemo(() => sortRecipes(recipes, sortMode), [recipes, sortMode]);
  const cleanedSet = useMemo(() => new Set(cleanedRecipeIds), [cleanedRecipeIds]);

  const toggleCleaned = (recipeId: string) => {
    setCleanedRecipeIds((current) => {
      const next = current.includes(recipeId)
        ? current.filter((id) => id !== recipeId)
        : [...current, recipeId];
      writeLocalIdList(CLEANED_RECIPES_STORAGE_KEY, next);
      return next;
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-sm text-slate-700">
          Total recipes: <span className="font-semibold">{recipes.length}</span> | Cleaned:{" "}
          <span className="font-semibold">
            {recipes.filter((recipe) => cleanedSet.has(recipe.id)).length}
          </span>
        </p>

        <label className="flex items-center gap-2 text-sm text-slate-700">
          Sort by
          <select
            value={sortMode}
            onChange={(event) => setSortMode(event.target.value as RecipeSortMode)}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-slate-200 focus:ring"
          >
            <option value="recent">Recently added</option>
            <option value="title">Title (A-Z)</option>
            <option value="missingCalories">Missing calories</option>
            <option value="missingProtein">Missing protein</option>
            <option value="missingFat">Missing fat</option>
            <option value="missingCarbs">Missing carbs</option>
          </select>
        </label>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full border-collapse">
          <thead className="bg-slate-100">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                Cleaned
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                Title
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                Cuisine
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                Servings
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                Prep Time
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                Added
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                Calories
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                Protein (g)
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                Fat (g)
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                Carbs (g)
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedRecipes.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-sm text-slate-500" colSpan={10}>
                  No recipes found in Firestore.
                </td>
              </tr>
            ) : (
              sortedRecipes.map((recipe) => (
                <tr
                  key={recipe.id}
                  className="cursor-pointer border-t border-slate-200 transition hover:bg-slate-50"
                  onClick={() => router.push(`/recipes/${recipe.id}`)}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={cleanedSet.has(recipe.id)}
                      onChange={() => toggleCleaned(recipe.id)}
                      onClick={(event) => event.stopPropagation()}
                      className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300"
                    />
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-slate-900">
                    {recipe.title || "Untitled"}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">{recipe.cuisine || "-"}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {displayNumber(recipe.servings)}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {displayNumber(recipe.prepTimeMinutes)}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {formatDate(recipe.createdAtMs)}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {formatMacro(recipe.nutrition.calories)}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {formatMacro(recipe.nutrition.protein)}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {formatMacro(recipe.nutrition.fat)}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {formatMacro(recipe.nutrition.carbs)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
