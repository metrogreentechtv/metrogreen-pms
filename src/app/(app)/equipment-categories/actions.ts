"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import { canEditBom } from "@/lib/roles";

// Same people who edit a quotation's BOM (administrator, engineer) maintain
// the category list it's built from — mirrors app.can_edit_bom() and the
// live equipment_categories_write RLS policy (administrator, engineer).
async function requireCategoryEditor() {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!canEditBom(user.roles)) {
    throw new Error("Your role can't manage equipment categories.");
  }
  return { supabase, user };
}

// A category's `code` is a stable identifier several other parts of the app
// pattern-match on directly (e.g. equipment/page.tsx's MAIN_MATERIAL_CODES
// picks the Main Materials tab by exact code, not by name), so it's derived
// once at creation from the name and never editable afterward — renaming a
// category's display label later should never silently move it between
// tabs or break a hardcoded code check elsewhere.
function slugifyCode(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export async function createCategory(formData: FormData) {
  const { supabase } = await requireCategoryEditor();

  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Give the category a name.");

  const codeOverride = String(formData.get("code") ?? "").trim();
  const code = codeOverride ? slugifyCode(codeOverride) : slugifyCode(name);
  if (!code) throw new Error("Could not derive a code from that name — try adding a code manually.");

  const payload = {
    code,
    name,
    sort_order: Number(formData.get("sort_order") ?? 100),
    is_material: formData.get("is_material") === "on",
    is_cost_only: formData.get("is_cost_only") === "on",
  };

  const { error } = await supabase.from("equipment_categories").insert(payload);
  if (error) {
    if (error.code === "23505") {
      throw new Error(`A category with code "${code}" already exists — pick a different name or code.`);
    }
    throw new Error(`Could not add category: ${error.message}`);
  }

  revalidatePath("/equipment-categories");
  revalidatePath("/equipment");
}

// Name, sort order, and the material/cost-only flags are editable; `code` is
// deliberately not — see the comment on slugifyCode() above.
export async function updateCategory(categoryId: string, formData: FormData) {
  const { supabase } = await requireCategoryEditor();

  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Give the category a name.");

  const payload = {
    name,
    sort_order: Number(formData.get("sort_order") ?? 100),
    is_material: formData.get("is_material") === "on",
    is_cost_only: formData.get("is_cost_only") === "on",
  };

  const { error } = await supabase.from("equipment_categories").update(payload).eq("id", categoryId);
  if (error) throw new Error(`Could not save category: ${error.message}`);

  revalidatePath("/equipment-categories");
  revalidatePath("/equipment");
}

// Soft-delete only, same reasoning as mounting types / ancillary services /
// equipment / customers: a category is referenced (ON DELETE RESTRICT, in
// most cases) from equipment, revision_bom_lines, project_baseline_bom,
// bom_template_lines, and ancillary_services — once a single row anywhere
// points at it, a hard DELETE fails outright, and even where it wouldn't,
// removing a category out from under historical BOM lines/proposals would
// change what an already-issued document shows. Deactivating hides it from
// every "add a line"/category picker in the app while leaving anything that
// already used it fully intact and still correctly labeled.
export async function setCategoryActive(categoryId: string, isActive: boolean, _formData: FormData) {
  const { supabase } = await requireCategoryEditor();
  const { error } = await supabase
    .from("equipment_categories")
    .update({ is_active: isActive })
    .eq("id", categoryId);
  if (error) throw new Error(`Could not update category: ${error.message}`);
  revalidatePath("/equipment-categories");
  revalidatePath("/equipment");
}
