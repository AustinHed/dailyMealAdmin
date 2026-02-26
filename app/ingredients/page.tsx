import Link from "next/link";

import { getAllIngredients } from "@/lib/firestore";

export const dynamic = "force-dynamic";

export default async function IngredientsPage() {
  const ingredients = await getAllIngredients();

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Ingredient Review</h1>
          <p className="text-sm text-slate-600">
            Browse ingredients across all recipes and jump directly into edits.
          </p>
        </div>
        <Link
          href="/recipes"
          className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Back to Recipes
        </Link>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full border-collapse">
          <thead className="bg-slate-100">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                Recipe
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                Ingredient
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                FDCID
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                Amount
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                Unit
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {ingredients.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-sm text-slate-500" colSpan={6}>
                  No ingredients found.
                </td>
              </tr>
            ) : (
              ingredients.map((item) => (
                <tr key={`${item.recipeId}-${item.ingredientIndex}`} className="border-t border-slate-200">
                  <td className="px-4 py-3 text-sm font-medium text-slate-900">{item.recipeTitle}</td>
                  <td className="px-4 py-3 text-sm text-slate-700">{item.ingredient.name}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{item.ingredient.fdcId || "-"}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{item.ingredient.amount || "-"}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{item.ingredient.unit || "-"}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/ingredients/${item.recipeId}`}
                        className="rounded border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Edit Ingredients
                      </Link>
                      <Link
                        href={`/recipes/${item.recipeId}`}
                        className="rounded border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Full Recipe
                      </Link>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
