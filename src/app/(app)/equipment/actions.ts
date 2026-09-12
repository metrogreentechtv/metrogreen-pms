"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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
