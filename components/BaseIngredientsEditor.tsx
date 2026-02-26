"use client";

import { useActionState, useMemo, useState } from "react";
import { Save } from "lucide-react";

import type { BaseIngredient } from "@/lib/firestore";
import { readLocalIdList, writeLocalIdList } from "@/lib/local-id-storage";

export type SaveBaseIngredientsState = {
  status: "idle" | "success" | "error";
  message: string;
};

type SaveBaseIngredientsAction = (
  previousState: SaveBaseIngredientsState,
  formData: FormData,
) => Promise<SaveBaseIngredientsState>;

type BaseIngredientsEditorProps = {
  ingredients: BaseIngredient[];
  saveBaseIngredientsAction: SaveBaseIngredientsAction;
};

type EditableIngredientRow = {
  ingredientId: string;
  displayName: string;
  usdaFdcId: string;
  aliasesText: string;
  conversionText: string;
  category: string;
  createdAtMs: number | null;
  nutritionPer100g: BaseIngredient["nutritionPer100g"];
};

type UpdatePayload = {
  ingredientId: string;
  displayName: string;
  usdaFdcId: string;
  aliases: string[];
  conversion: Record<string, unknown>;
};

type ComputeResult = {
  updates: UpdatePayload[];
  errors: Record<string, string>;
};

type IngredientSortMode = "name" | "recent";

const CLEANED_INGREDIENTS_STORAGE_KEY = "dailymeal.cleanedIngredients";

function normalizeAliasesInput(value: string): string[] {
  return Array.from(
    new Set(
      value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
}

function prettyJson(value: Record<string, unknown>): string {
  return JSON.stringify(value, null, 2);
}

function safeParseObjectJson(text: string): {
  value: Record<string, unknown>;
  error: string | null;
} {
  const trimmed = text.trim();

  if (!trimmed) {
    return { value: {}, error: null };
  }

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
      return { value: parsed as Record<string, unknown>, error: null };
    }

    return { value: {}, error: "Conversion JSON must be an object." };
  } catch {
    return { value: {}, error: "Invalid conversion JSON." };
  }
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

function formatMacro(value: number | null): string {
  if (value === null) {
    return "-";
  }

  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export function BaseIngredientsEditor({
  ingredients,
  saveBaseIngredientsAction,
}: BaseIngredientsEditorProps) {
  const initialState: SaveBaseIngredientsState = {
    status: "idle",
    message: "",
  };

  const [formState, formAction, isPending] = useActionState<
    SaveBaseIngredientsState,
    FormData
  >(saveBaseIngredientsAction, initialState);
  const [clientError, setClientError] = useState("");
  const [sortMode, setSortMode] = useState<IngredientSortMode>("recent");

  const [rows, setRows] = useState<EditableIngredientRow[]>(() =>
    ingredients.map((ingredient) => ({
      ingredientId: ingredient.ingredientId,
      displayName: ingredient.displayName,
      usdaFdcId: ingredient.usdaFdcId,
      aliasesText: ingredient.aliases.join(", "),
      conversionText: prettyJson(ingredient.conversion),
      category: ingredient.category,
      createdAtMs: ingredient.createdAtMs,
      nutritionPer100g: ingredient.nutritionPer100g,
    })),
  );
  const [showFilters, setShowFilters] = useState(false);
  const [fdcIdStatusFilter, setFdcIdStatusFilter] = useState<
    "all" | "hasFdcId" | "missingFdcId"
  >("all");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [cleanedIngredientIds, setCleanedIngredientIds] = useState<string[]>(() =>
    readLocalIdList(CLEANED_INGREDIENTS_STORAGE_KEY),
  );

  const initialLookup = useMemo(() => {
    const lookup = new Map<
      string,
      {
        displayName: string;
        usdaFdcId: string;
        aliases: string[];
        conversionSerialized: string;
      }
    >();

    for (const ingredient of ingredients) {
      lookup.set(ingredient.ingredientId, {
        displayName: ingredient.displayName,
        usdaFdcId: ingredient.usdaFdcId,
        aliases: ingredient.aliases,
        conversionSerialized: JSON.stringify(ingredient.conversion),
      });
    }

    return lookup;
  }, [ingredients]);

  const computed = useMemo<ComputeResult>(() => {
    const updates: UpdatePayload[] = [];
    const errors: Record<string, string> = {};

    for (const row of rows) {
      const initial = initialLookup.get(row.ingredientId);
      if (!initial) {
        continue;
      }

      const parsedConversion = safeParseObjectJson(row.conversionText);
      if (parsedConversion.error) {
        errors[row.ingredientId] = parsedConversion.error;
        continue;
      }

      const displayName = row.displayName.trim();
      const usdaFdcId = row.usdaFdcId.trim();
      const aliases = normalizeAliasesInput(row.aliasesText);
      const conversionSerialized = JSON.stringify(parsedConversion.value);

      const hasChanges =
        displayName !== initial.displayName ||
        usdaFdcId !== initial.usdaFdcId ||
        aliases.join("|") !== initial.aliases.join("|") ||
        conversionSerialized !== initial.conversionSerialized;

      if (hasChanges) {
        updates.push({
          ingredientId: row.ingredientId,
          displayName,
          usdaFdcId,
          aliases,
          conversion: parsedConversion.value,
        });
      }
    }

    return { updates, errors };
  }, [initialLookup, rows]);

  const allCategories = useMemo(() => {
    return Array.from(
      new Set(
        rows
          .map((row) => row.category.trim())
          .filter(Boolean),
      ),
    ).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const hasFdcId = row.usdaFdcId.trim().length > 0;
      const normalizedCategory = row.category.trim();

      if (fdcIdStatusFilter === "hasFdcId" && !hasFdcId) {
        return false;
      }

      if (fdcIdStatusFilter === "missingFdcId" && hasFdcId) {
        return false;
      }

      if (selectedCategories.length > 0 && !selectedCategories.includes(normalizedCategory)) {
        return false;
      }

      return true;
    });
  }, [fdcIdStatusFilter, rows, selectedCategories]);

  const visibleRows = useMemo(() => {
    const nextRows = [...filteredRows];

    if (sortMode === "recent") {
      nextRows.sort((a, b) => {
        const aCreatedAt = a.createdAtMs ?? Number.NEGATIVE_INFINITY;
        const bCreatedAt = b.createdAtMs ?? Number.NEGATIVE_INFINITY;

        if (aCreatedAt !== bCreatedAt) {
          return bCreatedAt - aCreatedAt;
        }

        return a.displayName.localeCompare(b.displayName);
      });

      return nextRows;
    }

    nextRows.sort((a, b) => a.displayName.localeCompare(b.displayName));
    return nextRows;
  }, [filteredRows, sortMode]);

  const cleanedSet = useMemo(() => new Set(cleanedIngredientIds), [cleanedIngredientIds]);

  const toggleCleanedIngredient = (ingredientId: string) => {
    setCleanedIngredientIds((current) => {
      const next = current.includes(ingredientId)
        ? current.filter((id) => id !== ingredientId)
        : [...current, ingredientId];
      writeLocalIdList(CLEANED_INGREDIENTS_STORAGE_KEY, next);
      return next;
    });
  };

  return (
    <form
      action={formAction}
      className="space-y-4"
      onSubmit={(event) => {
        if (Object.keys(computed.errors).length > 0) {
          event.preventDefault();
          setClientError("Fix invalid conversion JSON before saving.");
          return;
        }

        const submittedIngredientIds = computed.updates.map((update) => update.ingredientId);
        if (submittedIngredientIds.length > 0) {
          setCleanedIngredientIds((current) => {
            const next = Array.from(new Set([...current, ...submittedIngredientIds]));
            writeLocalIdList(CLEANED_INGREDIENTS_STORAGE_KEY, next);
            return next;
          });
        }

        setClientError("");
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-sm text-slate-700">
          Showing: <span className="font-semibold">{visibleRows.length}</span> of{" "}
          <span className="font-semibold">{rows.length}</span> | Pending changes:{" "}
          <span className="font-semibold">{computed.updates.length}</span> | Cleaned:{" "}
          <span className="font-semibold">
            {rows.filter((row) => cleanedSet.has(row.ingredientId)).length}
          </span>
        </p>

        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            Sort by
            <select
              value={sortMode}
              onChange={(event) => setSortMode(event.target.value as IngredientSortMode)}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-slate-200 focus:ring"
            >
              <option value="recent">Recently added</option>
              <option value="name">Name (A-Z)</option>
            </select>
          </label>
          <button
            type="button"
            onClick={() => setShowFilters((current) => !current)}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            {showFilters ? "Hide Filters" : "Show Filters"}
          </button>
          <button
            type="submit"
            disabled={isPending || computed.updates.length === 0}
            className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {isPending ? "Saving..." : "Save Ingredient Changes"}
          </button>
        </div>
      </div>

      {showFilters ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-1 text-xs font-medium text-slate-700">
              FDCID status
              <select
                value={fdcIdStatusFilter}
                onChange={(event) =>
                  setFdcIdStatusFilter(
                    event.target.value as "all" | "hasFdcId" | "missingFdcId",
                  )
                }
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-slate-200 focus:ring"
              >
                <option value="all">All ingredients</option>
                <option value="hasFdcId">Has FDCID</option>
                <option value="missingFdcId">Missing FDCID</option>
              </select>
            </label>

            <div className="flex flex-col gap-2 text-xs font-medium text-slate-700">
              <span>Ingredient category</span>
              <div className="flex flex-wrap gap-2">
                {allCategories.length === 0 ? (
                  <p className="text-xs text-slate-500">No categories found.</p>
                ) : (
                  allCategories.map((category) => {
                    const active = selectedCategories.includes(category);
                    return (
                      <button
                        key={category}
                        type="button"
                        onClick={() => {
                          setSelectedCategories((current) =>
                            current.includes(category)
                              ? current.filter((item) => item !== category)
                              : [...current, category],
                          );
                        }}
                        className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                          active
                            ? "border-slate-900 bg-slate-900 text-white"
                            : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        {category}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          <div className="mt-3">
            <button
              type="button"
              onClick={() => {
                setFdcIdStatusFilter("all");
                setSelectedCategories([]);
              }}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Clear filters
            </button>
          </div>
        </div>
      ) : null}

      <div className="space-y-3">
        {visibleRows.map((row) => {
          const index = rows.findIndex((item) => item.ingredientId === row.ingredientId);
          if (index < 0) {
            return null;
          }

          return (
          <div key={row.ingredientId} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="space-y-1 text-xs text-slate-600">
                <p>
                Category:{" "}
                <span className="font-medium text-slate-800">{row.category || "Uncategorized"}</span>{" "}
                | Added: <span className="font-medium text-slate-800">{formatDate(row.createdAtMs)}</span>
                </p>
                <p>
                  Nutrition per {row.nutritionPer100g.per || "100g"}:{" "}
                  <span className="font-medium text-slate-800">
                    Cal {formatMacro(row.nutritionPer100g.calories)}
                  </span>{" "}
                  |{" "}
                  <span className="font-medium text-slate-800">
                    Protein {formatMacro(row.nutritionPer100g.protein)}g
                  </span>{" "}
                  |{" "}
                  <span className="font-medium text-slate-800">
                    Fat {formatMacro(row.nutritionPer100g.fat)}g
                  </span>{" "}
                  |{" "}
                  <span className="font-medium text-slate-800">
                    Carbs {formatMacro(row.nutritionPer100g.carbs)}g
                  </span>
                </p>
              </div>
              <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={cleanedSet.has(row.ingredientId)}
                  onChange={() => toggleCleanedIngredient(row.ingredientId)}
                  className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300"
                />
                Cleaned
              </label>
            </div>

            <div className="mb-3 grid gap-3 lg:grid-cols-4">
              <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                Ingredient ID
                <input
                  type="text"
                  value={row.ingredientId}
                  readOnly
                  className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-700"
                />
              </label>

              <label className="flex flex-col gap-1 text-xs font-medium text-slate-700 lg:col-span-2">
                Base Name
                <input
                  type="text"
                  value={row.displayName}
                  onChange={(event) => {
                    const nextRows = [...rows];
                    nextRows[index] = {
                      ...nextRows[index],
                      displayName: event.target.value,
                    };
                    setRows(nextRows);
                  }}
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-slate-200 placeholder:text-slate-400 focus:ring"
                />
              </label>

              <label className="flex flex-col gap-1 text-xs font-medium text-slate-700">
                FDCID
                <input
                  type="text"
                  value={row.usdaFdcId}
                  onChange={(event) => {
                    const nextRows = [...rows];
                    nextRows[index] = {
                      ...nextRows[index],
                      usdaFdcId: event.target.value,
                    };
                    setRows(nextRows);
                  }}
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-slate-200 placeholder:text-slate-400 focus:ring"
                  placeholder="USDA FoodData Central ID"
                />
              </label>
            </div>

            <label className="mb-3 flex flex-col gap-1 text-xs font-medium text-slate-700">
              Aliases (comma-separated)
              <input
                type="text"
                value={row.aliasesText}
                onChange={(event) => {
                  const nextRows = [...rows];
                  nextRows[index] = {
                    ...nextRows[index],
                    aliasesText: event.target.value,
                  };
                  setRows(nextRows);
                }}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-slate-200 placeholder:text-slate-400 focus:ring"
                placeholder="alias one, alias two"
              />
            </label>

            <details className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
              <summary className="cursor-pointer text-xs font-semibold text-slate-700">
                Edit conversions (JSON)
              </summary>
              <div className="mt-2">
                <textarea
                  value={row.conversionText}
                  onChange={(event) => {
                    const nextRows = [...rows];
                    nextRows[index] = {
                      ...nextRows[index],
                      conversionText: event.target.value,
                    };
                    setRows(nextRows);
                  }}
                  rows={10}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 font-mono text-xs text-slate-900 outline-none ring-slate-200 placeholder:text-slate-400 focus:ring"
                />
              </div>
            </details>

            {computed.errors[row.ingredientId] ? (
              <p className="mt-2 text-xs font-medium text-red-600">{computed.errors[row.ingredientId]}</p>
            ) : null}
          </div>
          );
        })}

        {visibleRows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-600">
            No ingredients match the selected filters.
          </div>
        ) : null}
      </div>

      <input type="hidden" name="updatesJson" value={JSON.stringify(computed.updates)} />

      {clientError ? <p className="text-sm text-red-600">{clientError}</p> : null}
      {formState.message ? (
        <p className={`text-sm ${formState.status === "error" ? "text-red-600" : "text-emerald-600"}`}>
          {formState.message}
        </p>
      ) : null}
    </form>
  );
}
