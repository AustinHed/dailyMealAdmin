import "server-only";

import { FieldValue } from "firebase-admin/firestore";

import { getAdminDb } from "@/lib/firebase-admin";

export type RecipeInstruction = {
  text: string;
  tip: string;
};

export type RecipeIngredient = {
  name: string;
  amount: string;
  unit: string;
  notes: string;
  fdcId: string;
  ingredientId: string;
  unitType: string;
  category: string;
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
  instructions: RecipeInstruction[];
  ingredients: RecipeIngredient[];
  imageUrl: string;
};

export type RecipeListItem = Pick<
  Recipe,
  "id" | "title" | "cuisine" | "servings" | "prepTimeMinutes"
>;

export type IngredientListItem = {
  recipeId: string;
  recipeTitle: string;
  ingredientIndex: number;
  ingredient: RecipeIngredient;
};

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

function toInstructions(value: unknown): RecipeInstruction[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (typeof item === "string") {
        return { text: item.trim(), tip: "" };
      }

      if (typeof item === "object" && item !== null) {
        const instruction = item as Record<string, unknown>;
        return {
          text: toString(instruction.text),
          tip: toString(instruction.tip),
        };
      }

      return { text: "", tip: "" };
    })
    .filter((instruction) => instruction.text.length > 0);
}

function toIngredients(value: unknown): RecipeIngredient[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
    .map((item) => ({
      name: toString(item.name) || toString(item.ingredient),
      amount:
        toString(item.amount) ||
        (typeof item.quantity === "number" && Number.isFinite(item.quantity)
          ? String(item.quantity)
          : toString(item.quantity)) ||
        toString(item.quantityRaw),
      unit: toString(item.unit),
      notes:
        toString(item.notes) ||
        toString(item.preparation) ||
        toString(item.preparationFormat) ||
        toString(item.raw),
      fdcId:
        toString(item.fdcId) ||
        toString(item.fdcid) ||
        toString(item.fdcID) ||
        toString(item.fdc_id),
      ingredientId: toString(item.ingredientId),
      unitType: toString(item.unitType),
      category: toString(item.category),
    }))
    .filter((ingredient) => ingredient.name.length > 0);
}

function toNullableWriteNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
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
    instructions: toInstructions(data.instructions),
    ingredients: toIngredients(data.ingredients),
    imageUrl: toString(data.imageUrl),
  };
}

function normalizeInstructionsForWrite(instructions: RecipeInstruction[]) {
  return instructions
    .map((instruction) => ({
      text: instruction.text.trim(),
      tip: instruction.tip.trim(),
    }))
    .filter((instruction) => instruction.text.length > 0)
    .map((instruction, index) => ({
      step: index + 1,
      text: instruction.text,
      tip: instruction.tip || null,
    }));
}

function normalizeIngredientsForWrite(ingredients: RecipeIngredient[]) {
  return ingredients
    .map((ingredient) => ({
      name: ingredient.name.trim(),
      amount: ingredient.amount.trim(),
      unit: ingredient.unit.trim(),
      notes: ingredient.notes.trim(),
      fdcId: ingredient.fdcId.trim(),
      ingredientId: ingredient.ingredientId.trim(),
      unitType: ingredient.unitType.trim(),
      category: ingredient.category.trim(),
    }))
    .filter((ingredient) => ingredient.name.length > 0)
    .map((ingredient) => {
      const quantity = toNullableWriteNumber(ingredient.amount);

      return {
        ingredient: ingredient.name,
        name: ingredient.name,
        quantity,
        quantityRaw: ingredient.amount || null,
        amount: ingredient.amount || null,
        unit: ingredient.unit || null,
        preparation: ingredient.notes || null,
        notes: ingredient.notes || null,
        fdcId: ingredient.fdcId || null,
        ingredientId: ingredient.ingredientId || null,
        unitType: ingredient.unitType || null,
        category: ingredient.category || null,
      };
    });
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

export async function getAllIngredients(): Promise<IngredientListItem[]> {
  const snapshot = await getAdminDb().collection("recipes").get();

  return snapshot.docs
    .map((doc) => normalizeRecipe(doc.id, doc.data()))
    .flatMap((recipe) =>
      recipe.ingredients.map((ingredient, ingredientIndex) => ({
        recipeId: recipe.id,
        recipeTitle: recipe.title,
        ingredientIndex,
        ingredient,
      })),
    )
    .sort((a, b) => {
      const recipeSort = a.recipeTitle.localeCompare(b.recipeTitle);
      if (recipeSort !== 0) {
        return recipeSort;
      }

      return a.ingredient.name.localeCompare(b.ingredient.name);
    });
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
      title: data.title.trim(),
      cuisine: data.cuisine.trim(),
      servings: data.servings,
      prepTimeMinutes: data.prepTimeMinutes,
      cookTimeMinutes: data.cookTimeMinutes,
      dietTypes: data.dietTypes.map((item) => item.trim()).filter(Boolean),
      allergens: data.allergens.map((item) => item.trim()).filter(Boolean),
      tags: data.tags.map((item) => item.trim()).filter(Boolean),
      instructions: normalizeInstructionsForWrite(data.instructions),
      ingredients: normalizeIngredientsForWrite(data.ingredients),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}

export async function updateRecipeIngredients(
  recipeId: string,
  ingredients: RecipeIngredient[],
): Promise<void> {
  await getAdminDb().collection("recipes").doc(recipeId).set(
    {
      ingredients: normalizeIngredientsForWrite(ingredients),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}
