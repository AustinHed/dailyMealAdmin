import "server-only";

import { FieldValue } from "firebase-admin/firestore";

import { getAdminDb } from "@/lib/firebase-admin";

export type RecipeInstruction = {
  text: string;
  tip: string;
};

export type MacroNutrition = {
  calories: number | null;
  protein: number | null;
  fat: number | null;
  carbs: number | null;
  per: string;
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
> & {
  createdAtMs: number | null;
  nutrition: MacroNutrition;
};

export type BaseIngredient = {
  ingredientId: string;
  displayName: string;
  usdaFdcId: string;
  aliases: string[];
  conversion: Record<string, unknown>;
  category: string;
  createdAtMs: number | null;
  nutritionPer100g: MacroNutrition;
};

export type BaseIngredientUpdateInput = {
  ingredientId: string;
  displayName: string;
  usdaFdcId: string;
  aliases: string[];
  conversion: Record<string, unknown>;
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

function toRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function toFdcIdString(value: unknown): string {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  if (typeof value === "string") {
    return value.trim();
  }

  return "";
}

function toTimestampMillis(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    if (value > 1_000_000_000_000) {
      return Math.trunc(value);
    }

    if (value > 1_000_000_000) {
      return Math.trunc(value * 1000);
    }
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  if (typeof value === "object" && value !== null) {
    const timestampLike = value as {
      toMillis?: () => number;
      seconds?: unknown;
      _seconds?: unknown;
    };

    if (typeof timestampLike.toMillis === "function") {
      const millis = timestampLike.toMillis();
      return Number.isFinite(millis) ? Math.trunc(millis) : null;
    }

    if (typeof timestampLike.seconds === "number" && Number.isFinite(timestampLike.seconds)) {
      return Math.trunc(timestampLike.seconds * 1000);
    }

    if (typeof timestampLike._seconds === "number" && Number.isFinite(timestampLike._seconds)) {
      return Math.trunc(timestampLike._seconds * 1000);
    }
  }

  return null;
}

function firstPresentNumber(...values: unknown[]): number | null {
  for (const value of values) {
    const parsed = toNullableNumber(value);
    if (parsed !== null) {
      return parsed;
    }
  }

  return null;
}

function normalizeMacroNutrition(
  value: unknown,
  perFallback: string,
): MacroNutrition {
  const nutrition = toRecord(value);

  return {
    calories: firstPresentNumber(
      nutrition.calories,
      nutrition.kcal,
      nutrition.calorie,
      nutrition.energyKcal,
    ),
    protein: firstPresentNumber(
      nutrition.protein,
      nutrition.proteinGrams,
      nutrition.protein_g,
      nutrition.proteinG,
    ),
    fat: firstPresentNumber(nutrition.fat, nutrition.fatGrams, nutrition.fat_g, nutrition.fatG),
    carbs: firstPresentNumber(
      nutrition.carbs,
      nutrition.carbsGrams,
      nutrition.carbohydrates,
      nutrition.totalCarbohydrate,
      nutrition.carbs_g,
      nutrition.carbsG,
    ),
    per: toString(nutrition.per) || perFallback,
  };
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

function normalizeBaseIngredient(id: string, data: Record<string, unknown>): BaseIngredient {
  const ingredientId = toString(data.ingredientId) || id;
  const nutritionPer100g = normalizeMacroNutrition(
    data.nutrition || data.nutritionPer100g || data.macrosPer100g,
    "100g",
  );

  return {
    ingredientId,
    displayName: toString(data.displayName) || toString(data.name) || ingredientId,
    usdaFdcId:
      toFdcIdString(data.usdaFdcId) ||
      toFdcIdString(data.fdcId) ||
      toFdcIdString(data.fdcid) ||
      toFdcIdString(data.fdcID) ||
      toFdcIdString(data.fdc_id),
    aliases: toStringArray(data.aliases),
    conversion: toRecord(data.conversion),
    category: toString(data.category),
    createdAtMs:
      toTimestampMillis(data.createdAt) ||
      toTimestampMillis(data.created_at) ||
      toTimestampMillis(data.addedAt) ||
      toTimestampMillis(data.added_at),
    nutritionPer100g,
  };
}

async function getBaseIngredientLookupByIds(
  ingredientIds: string[],
): Promise<Map<string, BaseIngredient>> {
  const uniqueIds = Array.from(new Set(ingredientIds.map((id) => id.trim()).filter(Boolean)));
  const lookup = new Map<string, BaseIngredient>();

  if (uniqueIds.length === 0) {
    return lookup;
  }

  const refs = uniqueIds.map((id) => getAdminDb().collection("ingredients").doc(id));
  const docs = await getAdminDb().getAll(...refs);

  for (const doc of docs) {
    if (!doc.exists) {
      continue;
    }

    const normalized = normalizeBaseIngredient(doc.id, doc.data() ?? {});
    lookup.set(normalized.ingredientId, normalized);
  }

  return lookup;
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

function parseFdcIdForWrite(value: string): string | number | null {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const numeric = Number(trimmed);
  if (Number.isFinite(numeric)) {
    return numeric;
  }

  return trimmed;
}

export async function getAllRecipes(): Promise<RecipeListItem[]> {
  const snapshot = await getAdminDb().collection("recipes").get();

  return snapshot.docs
    .map((doc) => {
      const data = doc.data();
      const recipe = normalizeRecipe(doc.id, data);

      return {
        id: recipe.id,
        title: recipe.title,
        cuisine: recipe.cuisine,
        servings: recipe.servings,
        prepTimeMinutes: recipe.prepTimeMinutes,
        createdAtMs:
          toTimestampMillis(data.createdAt) ||
          toTimestampMillis(data.created_at) ||
          toTimestampMillis(data.addedAt) ||
          toTimestampMillis(data.added_at) ||
          toTimestampMillis(doc.createTime) ||
          toTimestampMillis(doc.updateTime),
        nutrition: normalizeMacroNutrition(
          data.nutrition || data.nutritionPerServing || data.macros,
          "serving",
        ),
      };
    })
    .sort((a, b) => a.title.localeCompare(b.title));
}

export async function getAllBaseIngredients(): Promise<BaseIngredient[]> {
  const snapshot = await getAdminDb().collection("ingredients").get();

  return snapshot.docs
    .map((doc) => {
      const ingredient = normalizeBaseIngredient(doc.id, doc.data());
      return {
        ...ingredient,
        createdAtMs:
          ingredient.createdAtMs ||
          toTimestampMillis(doc.createTime) ||
          toTimestampMillis(doc.updateTime),
      };
    })
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
}

export async function getRecipeById(recipeId: string): Promise<Recipe | null> {
  const doc = await getAdminDb().collection("recipes").doc(recipeId).get();

  if (!doc.exists) {
    return null;
  }

  const recipe = normalizeRecipe(doc.id, doc.data() ?? {});
  const ingredientLookup = await getBaseIngredientLookupByIds(
    recipe.ingredients.map((ingredient) => ingredient.ingredientId),
  );

  recipe.ingredients = recipe.ingredients.map((ingredient) => {
    const baseIngredient = ingredientLookup.get(ingredient.ingredientId);

    if (!baseIngredient) {
      return ingredient;
    }

    return {
      ...ingredient,
      name: ingredient.name || baseIngredient.displayName,
      fdcId: baseIngredient.usdaFdcId || ingredient.fdcId,
    };
  });

  return recipe;
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

export async function updateBaseIngredients(
  updates: BaseIngredientUpdateInput[],
): Promise<void> {
  if (updates.length === 0) {
    return;
  }

  const db = getAdminDb();
  const chunkSize = 400;

  for (let index = 0; index < updates.length; index += chunkSize) {
    const batch = db.batch();
    const chunk = updates.slice(index, index + chunkSize);

    for (const update of chunk) {
      const ingredientId = update.ingredientId.trim();
      if (!ingredientId) {
        continue;
      }

      const aliases = Array.from(
        new Set(update.aliases.map((alias) => alias.trim()).filter(Boolean)),
      );

      batch.set(
        db.collection("ingredients").doc(ingredientId),
        {
          ingredientId,
          displayName: update.displayName.trim() || ingredientId,
          usdaFdcId: parseFdcIdForWrite(update.usdaFdcId),
          aliases,
          conversion: toRecord(update.conversion),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    }

    await batch.commit();
  }
}
