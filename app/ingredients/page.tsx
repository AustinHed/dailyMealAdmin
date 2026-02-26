import Link from "next/link";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  BaseIngredientsEditor,
  type SaveBaseIngredientsState,
} from "@/components/BaseIngredientsEditor";
import { getAllBaseIngredients, updateBaseIngredients } from "@/lib/firestore";

export const dynamic = "force-dynamic";

const formSchema = z.object({
  updatesJson: z.string(),
});

const updateSchema = z.object({
  ingredientId: z.string().trim().min(1),
  displayName: z.string().trim().min(1),
  usdaFdcId: z.string().trim().default(""),
  aliases: z.array(z.string().trim().min(1)).default([]),
  conversion: z.record(z.string(), z.unknown()),
});

function parseUpdates(value: string) {
  const parsed = JSON.parse(value) as unknown;
  return z.array(updateSchema).parse(parsed);
}

function getStringValue(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value : "";
}

export default async function IngredientsPage() {
  const ingredients = await getAllBaseIngredients();

  async function saveBaseIngredientsAction(
    _previousState: SaveBaseIngredientsState,
    formData: FormData,
  ): Promise<SaveBaseIngredientsState> {
    "use server";

    const parsedForm = formSchema.safeParse({
      updatesJson: getStringValue(formData.get("updatesJson")),
    });

    if (!parsedForm.success) {
      return {
        status: "error",
        message: "Invalid request payload.",
      };
    }

    try {
      const updates = parseUpdates(parsedForm.data.updatesJson);

      if (updates.length === 0) {
        return {
          status: "success",
          message: "No ingredient changes detected.",
        };
      }

      await updateBaseIngredients(updates);

      revalidatePath("/ingredients");
      revalidatePath("/recipes");

      return {
        status: "success",
        message: `Saved ${updates.length} ingredient update${updates.length === 1 ? "" : "s"}.`,
      };
    } catch {
      return {
        status: "error",
        message: "Could not save base ingredients. Check conversion JSON and try again.",
      };
    }
  }

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Base Ingredients</h1>
          <p className="text-sm text-slate-600">
            Edit canonical ingredient names, FDCIDs, aliases, and conversion data.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/recipes"
            className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Back to Recipes
          </Link>
        </div>
      </div>

      <BaseIngredientsEditor
        ingredients={ingredients}
        saveBaseIngredientsAction={saveBaseIngredientsAction}
      />
    </main>
  );
}
