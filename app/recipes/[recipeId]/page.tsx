import Link from "next/link";
import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { z } from "zod";

import { RecipeEditorForm, type SaveRecipeFormState } from "@/components/RecipeEditorForm";
import { getRecipeById, updateRecipe } from "@/lib/firestore";

export const dynamic = "force-dynamic";

const optionalNumberSchema = z.preprocess(
  (value) => {
    if (typeof value !== "string") {
      return null;
    }

    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }

    const numericValue = Number(trimmed);
    return Number.isFinite(numericValue) ? numericValue : Number.NaN;
  },
  z.number().int().min(0).nullable(),
);

const ingredientSchema = z.object({
  name: z.string().trim().min(1),
  amount: z.string().trim().default(""),
  unit: z.string().trim().default(""),
  notes: z.string().trim().default(""),
});

const formSchema = z.object({
  title: z.string().trim().min(1, "Title is required."),
  cuisine: z.string().trim(),
  servings: optionalNumberSchema,
  prepTimeMinutes: optionalNumberSchema,
  cookTimeMinutes: optionalNumberSchema,
  dietTypesJson: z.string(),
  allergensJson: z.string(),
  tagsJson: z.string(),
  instructionsJson: z.string(),
  ingredientsJson: z.string(),
});

const stringArraySchema = z.array(z.string().trim().min(1));

function parseStringArray(value: string) {
  const parsedJson = JSON.parse(value) as unknown;
  return stringArraySchema.parse(parsedJson);
}

function parseIngredients(value: string) {
  const parsedJson = JSON.parse(value) as unknown;
  return z.array(ingredientSchema).parse(parsedJson);
}

function getStringValue(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value : "";
}

export default async function RecipeDetailPage({
  params,
}: {
  params: Promise<{ recipeId: string }>;
}) {
  const { recipeId } = await params;
  const recipe = await getRecipeById(recipeId);

  if (!recipe) {
    notFound();
  }

  async function saveRecipeAction(
    _previousState: SaveRecipeFormState,
    formData: FormData,
  ): Promise<SaveRecipeFormState> {
    "use server";

    const parsedForm = formSchema.safeParse({
      title: getStringValue(formData.get("title")),
      cuisine: getStringValue(formData.get("cuisine")),
      servings: getStringValue(formData.get("servings")),
      prepTimeMinutes: getStringValue(formData.get("prepTimeMinutes")),
      cookTimeMinutes: getStringValue(formData.get("cookTimeMinutes")),
      dietTypesJson: getStringValue(formData.get("dietTypesJson")),
      allergensJson: getStringValue(formData.get("allergensJson")),
      tagsJson: getStringValue(formData.get("tagsJson")),
      instructionsJson: getStringValue(formData.get("instructionsJson")),
      ingredientsJson: getStringValue(formData.get("ingredientsJson")),
    });

    if (!parsedForm.success) {
      return {
        status: "error",
        message: "Please check the form values and try again.",
      };
    }

    try {
      const dietTypes = parseStringArray(parsedForm.data.dietTypesJson);
      const allergens = parseStringArray(parsedForm.data.allergensJson);
      const tags = parseStringArray(parsedForm.data.tagsJson);
      const instructions = parseStringArray(parsedForm.data.instructionsJson);
      const ingredients = parseIngredients(parsedForm.data.ingredientsJson);

      await updateRecipe(recipeId, {
        title: parsedForm.data.title,
        cuisine: parsedForm.data.cuisine,
        servings: parsedForm.data.servings,
        prepTimeMinutes: parsedForm.data.prepTimeMinutes,
        cookTimeMinutes: parsedForm.data.cookTimeMinutes,
        dietTypes,
        allergens,
        tags,
        instructions,
        ingredients,
      });

      revalidatePath("/recipes");
      revalidatePath(`/recipes/${recipeId}`);

      return {
        status: "success",
        message: "Recipe saved.",
      };
    } catch {
      return {
        status: "error",
        message: "Could not save recipe. Check array fields and try again.",
      };
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Edit Recipe</h1>
          <p className="text-sm text-slate-600">ID: {recipe.id}</p>
        </div>

        <Link
          href="/recipes"
          className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Back to Recipes
        </Link>
      </div>

      <RecipeEditorForm recipe={recipe} saveRecipeAction={saveRecipeAction} />
    </main>
  );
}
