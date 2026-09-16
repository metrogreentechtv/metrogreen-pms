"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import { canEditBom } from "@/lib/roles";

// Same people who edit a quotation's BOM (administrator, engineer) maintain
// the mounting-type catalog it's picked from — mirrors app.can_edit_bom()
// and the mounting_types_write RLS policy.
async function requireMountingTypeEditor() {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!canEditBom(user.roles)) {
    throw new Error("Your role can't manage mounting types.");
  }
  return { supabase, user };
}

export async function createMountingType(formData: FormData) {
  const { supabase, user } = await requireMountingTypeEditor();

  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Give the mounting type a name.");

  const payload = {
    name,
    price_per_kwp_php: Number(formData.get("price_per_kwp_php") ?? 0),
    notes: String(formData.get("notes") ?? "").trim() || null,
    sort_order: Number(formData.get("sort_order") ?? 100),
    created_by: user.id,
  };

  const { error } = await supabase.from("mounting_types").insert(payload);
  if (error) throw new Error(`Could not add mounting type: ${error.message}`);

  revalidatePath("/mounting-types");
}

export async function updateMountingType(mountingTypeId: string, formData: FormData) {
  const { supabase } = await requireMountingTypeEditor();

  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Give the mounting type a name.");

  const payload = {
    name,
    price_per_kwp_php: Number(formData.get("price_per_kwp_php") ?? 0),
    notes: String(formData.get("notes") ?? "").trim() || null,
    sort_order: Number(formData.get("sort_order") ?? 100),
  };

  const { error } = await supabase.from("mounting_types").update(payload).eq("id", mountingTypeId);
  if (error) throw new Error(`Could not save mounting type: ${error.message}`);

  revalidatePath("/mounting-types");
}

// Soft-delete only — a mounting type already picked on a locked/historical
// revision must keep resolving (revision_configurations.mounting_type_id
// still points at it, and the name was already mirrored into the legacy
// mounting_type text column at save time), so it's deactivated, not removed.
export async function setMountingTypeActive(
  mountingTypeId: string,
  isActive: boolean,
  _formData: FormData
) {
  const { supabase } = await requireMountingTypeEditor();
  const { error } = await supabase
    .from("mounting_types")
    .update({ is_active: isActive })
    .eq("id", mountingTypeId);
  if (error) throw new Error(`Could not update mounting type: ${error.message}`);
  revalidatePath("/mounting-types");
}
