"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import { canEditBom } from "@/lib/roles";
import type { AncillaryPricingMethod, ProposalGroup } from "@/lib/types";

// Same people who edit a quotation's BOM (administrator, engineer) maintain
// the ancillary-services catalog it's added from — mirrors
// app.can_edit_bom() and the ancillary_services_write RLS policy.
async function requireAncillaryServiceEditor() {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!canEditBom(user.roles)) {
    throw new Error("Your role can't manage ancillary services.");
  }
  return { supabase, user };
}

function readPayload(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Give the service a name.");

  return {
    name,
    pricing_method: String(formData.get("pricing_method") ?? "flat") as AncillaryPricingMethod,
    rate_php: Number(formData.get("rate_php") ?? 0),
    unit_label: String(formData.get("unit_label") ?? "").trim() || null,
    default_category_id: String(formData.get("default_category_id") ?? "") || null,
    default_proposal_group:
      (String(formData.get("default_proposal_group") ?? "").trim() || null) as ProposalGroup | null,
    notes: String(formData.get("notes") ?? "").trim() || null,
    sort_order: Number(formData.get("sort_order") ?? 100),
  };
}

export async function createAncillaryService(formData: FormData) {
  const { supabase, user } = await requireAncillaryServiceEditor();
  const payload = { ...readPayload(formData), created_by: user.id };

  const { error } = await supabase.from("ancillary_services").insert(payload);
  if (error) throw new Error(`Could not add ancillary service: ${error.message}`);

  revalidatePath("/ancillary-services");
}

export async function updateAncillaryService(serviceId: string, formData: FormData) {
  const { supabase } = await requireAncillaryServiceEditor();
  const payload = readPayload(formData);

  const { error } = await supabase.from("ancillary_services").update(payload).eq("id", serviceId);
  if (error) throw new Error(`Could not save ancillary service: ${error.message}`);

  revalidatePath("/ancillary-services");
}

// Soft-delete only — a service already added to a locked/historical
// revision's BOQ becomes a plain BOM line at add-time (it doesn't stay
// linked back to ancillary_services), so deactivating never touches
// existing quotations; it only hides the service from new selections.
export async function setAncillaryServiceActive(
  serviceId: string,
  isActive: boolean,
  _formData: FormData
) {
  const { supabase } = await requireAncillaryServiceEditor();
  const { error } = await supabase
    .from("ancillary_services")
    .update({ is_active: isActive })
    .eq("id", serviceId);
  if (error) throw new Error(`Could not update ancillary service: ${error.message}`);
  revalidatePath("/ancillary-services");
}
