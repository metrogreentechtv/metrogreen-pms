"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import { canManageEquipment } from "@/lib/roles";

export async function addEquipmentPrice(equipmentId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.rpc("set_equipment_price", {
    p_equipment_id: equipmentId,
    p_cost_price: Number(formData.get("cost_price_php")),
    p_markup_rate: Number(formData.get("default_markup_rate")) / 100,
    p_supplier_id: String(formData.get("supplier_id") ?? "") || null,
    p_effective_from: String(formData.get("effective_from")),
    p_source_note: String(formData.get("source_note") ?? "").trim() || null,
    p_is_estimate: formData.get("is_estimate") === "on",
  });

  if (error) {
    throw new Error(`Could not update price: ${error.message}`);
  }

  revalidatePath(`/equipment/${equipmentId}`);
  revalidatePath("/equipment");
}

export async function updateEquipment(equipmentId: string, formData: FormData) {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!canManageEquipment(user.roles)) {
    throw new Error("Your role can't edit the equipment catalog.");
  }

  const qtyRaw = String(formData.get("quantity_on_hand") ?? "").trim();
  const reorderRaw = String(formData.get("reorder_point") ?? "").trim();

  const payload = {
    sku: String(formData.get("sku") ?? "").trim(),
    category_id: String(formData.get("category_id") ?? ""),
    description: String(formData.get("description") ?? "").trim(),
    manufacturer: String(formData.get("manufacturer") ?? "").trim() || null,
    model: String(formData.get("model") ?? "").trim() || null,
    unit: String(formData.get("unit") ?? "").trim() || "pc",
    warranty_terms: String(formData.get("warranty_terms") ?? "").trim() || null,
    quantity_on_hand: qtyRaw === "" ? null : Number(qtyRaw),
    reorder_point: reorderRaw === "" ? null : Number(reorderRaw),
  };

  if (!payload.sku || !payload.description || !payload.category_id) {
    throw new Error("SKU, description, and category are required.");
  }

  const { error } = await supabase.from("equipment").update(payload).eq("id", equipmentId);
  if (error) {
    throw new Error(`Could not update equipment: ${error.message}`);
  }

  revalidatePath("/equipment");
  revalidatePath(`/equipment/${equipmentId}`);
  redirect(`/equipment/${equipmentId}`);
}

// Soft delete, same rationale and mechanism as the customer list's delete
// action: an equipment row can be referenced by historical BOM lines
// (revision_bom_lines on locked/submitted revisions, project_baseline_bom on
// a frozen project baseline), by bom_template_lines, and by its own
// equipment_prices history — a hard DELETE would either fail on a foreign
// key or silently break those records. is_active=false removes it from the
// catalog list and from new BOM lines/templates going forward, while
// everything that already references it keeps working.
export async function deleteEquipment(equipmentId: string, _formData: FormData) {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!canManageEquipment(user.roles)) {
    throw new Error("Your role can't delete equipment.");
  }

  const { error } = await supabase
    .from("equipment")
    .update({ is_active: false, deleted_at: new Date().toISOString() })
    .eq("id", equipmentId);
  if (error) {
    throw new Error(`Could not delete equipment: ${error.message}`);
  }

  revalidatePath("/equipment");
}
