"use client";

import { Trash2 } from "lucide-react";

import type { RecipeIngredient } from "@/lib/firestore";

type IngredientCardProps = {
  ingredient: RecipeIngredient;
  index: number;
  onChange: (index: number, ingredient: RecipeIngredient) => void;
  onRemove: (index: number) => void;
};

export function IngredientCard({
  ingredient,
  index,
  onChange,
  onRemove,
}: IngredientCardProps) {
  const updateField = (field: keyof RecipeIngredient, value: string) => {
    onChange(index, {
      ...ingredient,
      [field]: value,
    });
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">Ingredient {index + 1}</h3>
        <button
          type="button"
          onClick={() => onRemove(index)}
          className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Remove
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-700 sm:col-span-2">
          Name
          <input
            type="text"
            value={ingredient.name}
            onChange={(event) => updateField("name", event.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-slate-200 placeholder:text-slate-400 focus:ring"
            placeholder="Chicken breast"
          />
        </label>

        <label className="flex flex-col gap-1 text-xs font-medium text-slate-700">
          Amount
          <input
            type="text"
            value={ingredient.amount}
            onChange={(event) => updateField("amount", event.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-slate-200 placeholder:text-slate-400 focus:ring"
            placeholder="2"
          />
        </label>

        <label className="flex flex-col gap-1 text-xs font-medium text-slate-700">
          Unit
          <input
            type="text"
            value={ingredient.unit}
            onChange={(event) => updateField("unit", event.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-slate-200 placeholder:text-slate-400 focus:ring"
            placeholder="cups"
          />
        </label>

        <label className="flex flex-col gap-1 text-xs font-medium text-slate-700 sm:col-span-2">
          FDCID
          <input
            type="text"
            value={ingredient.fdcId}
            onChange={(event) => updateField("fdcId", event.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-slate-200 placeholder:text-slate-400 focus:ring"
            placeholder="USDA FoodData Central ID"
          />
        </label>

        <label className="flex flex-col gap-1 text-xs font-medium text-slate-700 sm:col-span-2">
          Notes
          <input
            type="text"
            value={ingredient.notes}
            onChange={(event) => updateField("notes", event.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-slate-200 placeholder:text-slate-400 focus:ring"
            placeholder="finely chopped"
          />
        </label>
      </div>
    </div>
  );
}
