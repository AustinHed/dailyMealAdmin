import "server-only";

import { FieldValue } from "firebase-admin/firestore";

import { getAdminDb } from "@/lib/firebase-admin";

export type RecipeIngredient = {
  name: string;
  amount: string;
  unit: string;
  notes: string;
};

export type Recipe = {
  id: string;
  title: string;
  cuisine: string;
  servings: number | null;
  prepTimeMinutes: number | null;
  cookTimeMinutes: number | null;
  dietTypes: string[];
  allergens: string[];
  tags: string[];
  instructions: string[];
  ingredients: RecipeIngredient[];
};

export type RecipeListItem = Pick<
  Recipe,
  "id" | "title" | "cuisine" | "servings" | "prepTimeMinutes"
>;

export type RecipeUpdateInput = Omit<Recipe, "id">;

function toString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function toNullableNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function toIngredients(value: unknown): RecipeIngredient[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
    .map((item) => ({
      name: toString(item.name),
      amount: toString(item.amount),
      unit: toString(item.unit),
      notes: toString(item.notes),
    }))
    .filter((ingredient) => ingredient.name.length > 0);
}

function normalizeRecipe(id: string, data: Record<string, unknown>): Recipe {
  return {
    id,
    title: toString(data.title),
    cuisine: toString(data.cuisine),
    servings: toNullableNumber(data.servings),
    prepTimeMinutes: toNullableNumber(data.prepTimeMinutes),
    cookTimeMinutes: toNullableNumber(data.cookTimeMinutes),
    dietTypes: toStringArray(data.dietTypes),
    allergens: toStringArray(data.allergens),
    tags: toStringArray(data.tags),
    instructions: toStringArray(data.instructions),
    ingredients: toIngredients(data.ingredients),
  };
}

export async function getAllRecipes(): Promise<RecipeListItem[]> {
  const snapshot = await getAdminDb().collection("recipes").get();

  return snapshot.docs
    .map((doc) => normalizeRecipe(doc.id, doc.data()))
    .map((recipe) => ({
      id: recipe.id,
      title: recipe.title,
      cuisine: recipe.cuisine,
      servings: recipe.servings,
      prepTimeMinutes: recipe.prepTimeMinutes,
    }))
    .sort((a, b) => a.title.localeCompare(b.title));
}

export async function getRecipeById(recipeId: string): Promise<Recipe | null> {
  const doc = await getAdminDb().collection("recipes").doc(recipeId).get();

  if (!doc.exists) {
    return null;
  }

  return normalizeRecipe(doc.id, doc.data() ?? {});
}

export async function updateRecipe(
  recipeId: string,
  data: RecipeUpdateInput,
): Promise<void> {
  await getAdminDb().collection("recipes").doc(recipeId).set(
    {
      ...data,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}
