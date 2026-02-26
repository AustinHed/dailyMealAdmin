"use client";

import { useActionState, useState } from "react";
import { Plus, Save, Trash2 } from "lucide-react";

import { IngredientCard } from "@/components/IngredientCard";
import type { Recipe, RecipeIngredient, RecipeInstruction } from "@/lib/firestore";
import { readLocalIdList, writeLocalIdList } from "@/lib/local-id-storage";

export type SaveRecipeFormState = {
  status: "idle" | "success" | "error";
  message: string;
};

type SaveRecipeAction = (
  previousState: SaveRecipeFormState,
  formData: FormData,
) => Promise<SaveRecipeFormState>;

type RecipeEditorFormProps = {
  recipeId: string;
  recipe: Recipe;
  saveRecipeAction: SaveRecipeAction;
  mode?: "full" | "ingredients";
  submitLabel?: string;
};

const CLEANED_RECIPES_STORAGE_KEY = "dailymeal.cleanedRecipes";

function normalizeStringList(values: string[]): string[] {
  return values.map((value) => value.trim()).filter(Boolean);
}

function normalizeInstructions(values: RecipeInstruction[]): RecipeInstruction[] {
  return values
    .map((instruction) => ({
      text: instruction.text.trim(),
      tip: instruction.tip.trim(),
    }))
    .filter((instruction) => instruction.text.length > 0);
}

function normalizeIngredients(values: RecipeIngredient[]): RecipeIngredient[] {
  return values
    .map((ingredient) => ({
      ...ingredient,
      name: ingredient.name.trim(),
      amount: ingredient.amount.trim(),
      unit: ingredient.unit.trim(),
      notes: ingredient.notes.trim(),
      fdcId: ingredient.fdcId.trim(),
      ingredientId: ingredient.ingredientId.trim(),
      unitType: ingredient.unitType.trim(),
      category: ingredient.category.trim(),
    }))
    .filter((ingredient) => ingredient.name.length > 0);
}

function StringListEditor({
  label,
  values,
  onChange,
  placeholder,
}: {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">{label}</h3>
        <button
          type="button"
          onClick={() => onChange([...values, ""])}
          className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
        >
          <Plus className="h-3.5 w-3.5" />
          Add
        </button>
      </div>

      <div className="space-y-2">
        {values.length === 0 ? (
          <p className="text-xs text-slate-500">No items yet.</p>
        ) : (
          values.map((value, index) => (
            <div key={`${label}-${index}`} className="flex items-center gap-2">
              <input
                type="text"
                value={value}
                onChange={(event) => {
                  const nextValues = [...values];
                  nextValues[index] = event.target.value;
                  onChange(nextValues);
                }}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-slate-200 placeholder:text-slate-400 focus:ring"
                placeholder={placeholder}
              />
              <button
                type="button"
                onClick={() => {
                  const nextValues = values.filter((_, currentIndex) => currentIndex !== index);
                  onChange(nextValues);
                }}
                className="inline-flex items-center justify-center rounded-md border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function RecipeEditorForm({
  recipeId,
  recipe,
  saveRecipeAction,
  mode = "full",
  submitLabel = "Save",
}: RecipeEditorFormProps) {
  const initialState: SaveRecipeFormState = {
    status: "idle",
    message: "",
  };
  const [formState, formAction, isPending] = useActionState<
    SaveRecipeFormState,
    FormData
  >(saveRecipeAction, initialState);

  const [dietTypes, setDietTypes] = useState<string[]>(recipe.dietTypes);
  const [allergens, setAllergens] = useState<string[]>(recipe.allergens);
  const [tags, setTags] = useState<string[]>(recipe.tags);
  const [isCleaned, setIsCleaned] = useState(() =>
    readLocalIdList(CLEANED_RECIPES_STORAGE_KEY).includes(recipeId),
  );
  const [instructions, setInstructions] = useState<RecipeInstruction[]>(
    recipe.instructions.length > 0 ? recipe.instructions : [{ text: "", tip: "" }],
  );
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>(recipe.ingredients);

  const markAsCleaned = () => {
    const cleanedIds = readLocalIdList(CLEANED_RECIPES_STORAGE_KEY);
    if (cleanedIds.includes(recipeId)) {
      setIsCleaned(true);
      return;
    }

    const nextIds = [...cleanedIds, recipeId];
    writeLocalIdList(CLEANED_RECIPES_STORAGE_KEY, nextIds);
    setIsCleaned(true);
  };

  const toggleCleaned = () => {
    const cleanedIds = readLocalIdList(CLEANED_RECIPES_STORAGE_KEY);
    const nextIds = cleanedIds.includes(recipeId)
      ? cleanedIds.filter((id) => id !== recipeId)
      : [...cleanedIds, recipeId];
    writeLocalIdList(CLEANED_RECIPES_STORAGE_KEY, nextIds);
    setIsCleaned(nextIds.includes(recipeId));
  };

  const ingredientsSection = (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900">Ingredients</h2>
        <button
          type="button"
          onClick={() =>
            setIngredients([
              ...ingredients,
              {
                name: "",
                amount: "",
                unit: "",
                notes: "",
                fdcId: "",
                ingredientId: "",
                unitType: "",
                category: "",
              },
            ])
          }
          className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Ingredient
        </button>
      </div>

      <div className="grid gap-3">
        {ingredients.length === 0 ? (
          <p className="text-sm text-slate-500">No ingredients yet.</p>
        ) : (
          ingredients.map((ingredient, index) => (
            <IngredientCard
              key={`ingredient-${index}`}
              ingredient={ingredient}
              index={index}
              onChange={(currentIndex, nextIngredient) => {
                const nextIngredients = [...ingredients];
                nextIngredients[currentIndex] = nextIngredient;
                setIngredients(nextIngredients);
              }}
              onRemove={(currentIndex) =>
                setIngredients(
                  ingredients.filter((_, ingredientIndex) => ingredientIndex !== currentIndex),
                )
              }
            />
          ))
        )}
      </div>
    </section>
  );

  return (
    <form
      action={formAction}
      className="space-y-6"
      onSubmit={() => {
        markAsCleaned();
      }}
    >
      {mode === "full" ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(360px,1fr)]">
          <div className="space-y-6">
            <div className="grid gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-2">
              <label className="flex flex-col gap-1 text-sm font-medium text-slate-700 md:col-span-2">
                Title
                <input
                  name="title"
                  type="text"
                  defaultValue={recipe.title}
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-slate-200 placeholder:text-slate-400 focus:ring"
                  required
                />
              </label>

              <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                Servings
                <input
                  name="servings"
                  type="number"
                  defaultValue={recipe.servings ?? ""}
                  min={0}
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-slate-200 placeholder:text-slate-400 focus:ring"
                />
              </label>

              <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                Cuisine
                <input
                  name="cuisine"
                  type="text"
                  defaultValue={recipe.cuisine}
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-slate-200 placeholder:text-slate-400 focus:ring"
                />
              </label>

              <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                Prep Time (minutes)
                <input
                  name="prepTimeMinutes"
                  type="number"
                  defaultValue={recipe.prepTimeMinutes ?? ""}
                  min={0}
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-slate-200 placeholder:text-slate-400 focus:ring"
                />
              </label>

              <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                Cook Time (minutes)
                <input
                  name="cookTimeMinutes"
                  type="number"
                  defaultValue={recipe.cookTimeMinutes ?? ""}
                  min={0}
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-slate-200 placeholder:text-slate-400 focus:ring"
                />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <StringListEditor
                label="Diet Types"
                values={dietTypes}
                onChange={setDietTypes}
                placeholder="High protein"
              />
              <StringListEditor
                label="Allergens"
                values={allergens}
                onChange={setAllergens}
                placeholder="Tree nuts"
              />
              <StringListEditor
                label="Tags"
                values={tags}
                onChange={setTags}
                placeholder="Quick dinner"
              />
            </div>

            <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-900">Instructions</h2>
                <button
                  type="button"
                  onClick={() => setInstructions([...instructions, { text: "", tip: "" }])}
                  className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Step
                </button>
              </div>

              <ol className="space-y-3">
                {instructions.length === 0 ? (
                  <li className="text-sm text-slate-500">No instructions yet.</li>
                ) : (
                  instructions.map((instruction, index) => (
                    <li
                      key={`instruction-${index}`}
                      className="rounded-md border border-slate-200 p-3"
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500">Step {index + 1}</span>
                        <button
                          type="button"
                          onClick={() =>
                            setInstructions(
                              instructions.filter((_, currentIndex) => currentIndex !== index),
                            )
                          }
                          className="inline-flex items-center justify-center rounded-md border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="grid gap-2">
                        <label className="flex flex-col gap-1 text-xs font-medium text-slate-700">
                          Instruction
                          <input
                            type="text"
                            value={instruction.text}
                            onChange={(event) => {
                              const nextInstructions = [...instructions];
                              nextInstructions[index] = {
                                ...nextInstructions[index],
                                text: event.target.value,
                              };
                              setInstructions(nextInstructions);
                            }}
                            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-slate-200 placeholder:text-slate-400 focus:ring"
                            placeholder="Describe this step"
                          />
                        </label>

                        <label className="flex flex-col gap-1 text-xs font-medium text-slate-700">
                          Tip
                          <input
                            type="text"
                            value={instruction.tip}
                            onChange={(event) => {
                              const nextInstructions = [...instructions];
                              nextInstructions[index] = {
                                ...nextInstructions[index],
                                tip: event.target.value,
                              };
                              setInstructions(nextInstructions);
                            }}
                            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-slate-200 placeholder:text-slate-400 focus:ring"
                            placeholder="Optional tip for this step"
                          />
                        </label>
                      </div>
                    </li>
                  ))
                )}
              </ol>
            </section>
          </div>

          <div>{ingredientsSection}</div>
        </div>
      ) : (
        <div>{ingredientsSection}</div>
      )}

      {mode === "full" ? (
        <>
          <input
            type="hidden"
            name="dietTypesJson"
            value={JSON.stringify(normalizeStringList(dietTypes))}
          />
          <input
            type="hidden"
            name="allergensJson"
            value={JSON.stringify(normalizeStringList(allergens))}
          />
          <input type="hidden" name="tagsJson" value={JSON.stringify(normalizeStringList(tags))} />
          <input
            type="hidden"
            name="instructionsJson"
            value={JSON.stringify(normalizeInstructions(instructions))}
          />
        </>
      ) : null}

      <input
        type="hidden"
        name="ingredientsJson"
        value={JSON.stringify(normalizeIngredients(ingredients))}
      />

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Save className="h-4 w-4" />
          {isPending ? "Saving..." : submitLabel}
        </button>

        <button
          type="button"
          onClick={toggleCleaned}
          className={`rounded-md border px-3 py-2 text-sm font-medium transition ${
            isCleaned
              ? "border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
              : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
          }`}
        >
          {isCleaned ? "Cleaned" : "Mark Cleaned"}
        </button>

        {formState.message ? (
          <p
            className={`text-sm ${
              formState.status === "error" ? "text-red-600" : "text-emerald-600"
            }`}
          >
            {formState.message}
          </p>
        ) : null}
      </div>
    </form>
  );
}
