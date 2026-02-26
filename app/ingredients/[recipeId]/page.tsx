import Link from "next/link";
import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { z } from "zod";

import { RecipeEditorForm, type SaveRecipeFormState } from "@/components/RecipeEditorForm";
import { getAllRecipes, getRecipeById, updateRecipeIngredients } from "@/lib/firestore";

export const dynamic = "force-dynamic";

const ingredientSchema = z.object({
  name: z.string().trim().min(1),
  amount: z.string().trim().default(""),
  unit: z.string().trim().default(""),
  notes: z.string().trim().default(""),
  fdcId: z.string().trim().default(""),
  ingredientId: z.string().trim().default(""),
  unitType: z.string().trim().default(""),
  category: z.string().trim().default(""),
});

const formSchema = z.object({
  ingredientsJson: z.string(),
});

function parseIngredients(value: string) {
  const parsedJson = JSON.parse(value) as unknown;
  return z.array(ingredientSchema).parse(parsedJson);
}

function getStringValue(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value : "";
}

export default async function IngredientsEditorPage({
  params,
}: {
  params: Promise<{ recipeId: string }>;
}) {
  const { recipeId } = await params;

  const [recipe, recipes] = await Promise.all([getRecipeById(recipeId), getAllRecipes()]);

  if (!recipe) {
    notFound();
  }

  const currentIndex = recipes.findIndex((item) => item.id === recipeId);
  const nextRecipe =
    currentIndex >= 0 && recipes.length > 1
      ? recipes[(currentIndex + 1) % recipes.length]
      : null;

  async function saveIngredientsAction(
    _previousState: SaveRecipeFormState,
    formData: FormData,
  ): Promise<SaveRecipeFormState> {
    "use server";

    const parsedForm = formSchema.safeParse({
      ingredientsJson: getStringValue(formData.get("ingredientsJson")),
    });

    if (!parsedForm.success) {
      return {
        status: "error",
        message: "Please check ingredient values and try again.",
      };
    }

    try {
      const ingredients = parseIngredients(parsedForm.data.ingredientsJson);
      await updateRecipeIngredients(recipeId, ingredients);

      revalidatePath("/ingredients");
      revalidatePath(`/ingredients/${recipeId}`);
      revalidatePath("/recipes");
      revalidatePath(`/recipes/${recipeId}`);

      return {
        status: "success",
        message: "Ingredients saved.",
      };
    } catch {
      return {
        status: "error",
        message: "Could not save ingredients.",
      };
    }
  }

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          {recipe.imageUrl ? (
            <img
              src={recipe.imageUrl}
              alt={recipe.title || "Recipe image"}
              className="h-24 w-24 rounded-lg border border-slate-200 object-cover"
            />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-100 text-xs text-slate-500">
              No image
            </div>
          )}

          <div>
            <h1 className="text-2xl font-bold text-slate-900">{recipe.title}</h1>
            <p className="text-sm text-slate-600">Ingredient-only editor</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/ingredients"
            className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Back to Ingredient Review
          </Link>
          <Link
            href={`/recipes/${recipe.id}`}
            className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Full Recipe Editor
          </Link>
          {nextRecipe ? (
            <Link
              href={`/ingredients/${nextRecipe.id}`}
              className="rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-700"
            >
              Next Recipe
            </Link>
          ) : null}
        </div>
      </div>

      <RecipeEditorForm
        recipe={recipe}
        saveRecipeAction={saveIngredientsAction}
        mode="ingredients"
        submitLabel="Save Ingredients"
      />
    </main>
  );
}
