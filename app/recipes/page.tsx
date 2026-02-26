import Link from "next/link";

import { RecipesTable } from "@/components/RecipesTable";
import { getAllRecipes } from "@/lib/firestore";

export const dynamic = "force-dynamic";

export default async function RecipesPage() {
  const recipes = await getAllRecipes();

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Recipes</h1>
          <p className="text-sm text-slate-600">Internal DailyMeal recipe manager</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/ingredients"
            className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Base Ingredients
          </Link>
          <Link
            href="/"
            className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Home
          </Link>
        </div>
      </div>

      <RecipesTable recipes={recipes} />
    </main>
  );
}
