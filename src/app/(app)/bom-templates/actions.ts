"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import { canEditBom } from "@/lib/roles";
import type { SystemType } from "@/lib/types";

// Same people who edit a quotation's BOM (administrator, engineer) maintain
// the standard templates it's built from — mirrors app.can_edit_bom() and
// the bom_templates_write / bom_template_lines_write RLS policies.
async function requireTemplateEditor() {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!canEditBom(user.roles)) {
    throw new Error("Your role can't manage BOM templates.");
  }
  return { supabase, user };
}

export async function createTemplate(formData: FormData) {
  const { supabase, user } = await requireTemplateEditor();

  const payload = {
    name: String(formData.get("name") ?? "").trim(),
    system_size_kwp: Number(formData.get("system_size_kwp")),
    system_type: (String(formData.get("system_type") ?? "").trim() || null) as SystemType | null,
    description: String(formData.get("description") ?? "").trim() || null,
    created_by: user.id,
  };

  if (!payload.name) throw new Error("Give the template a name.");
  if (!payload.system_size_kwp || payload.system_size_kwp <= 0) {
    throw new Error("System size (kWp) must be greater than zero.");
  }

  const { data, error } = await supabase
    .from("bom_templates")
    .insert(payload)
    .select("id")
    .single();
  if (error) throw new Error(`Could not create template: ${error.message}`);

  revalidatePath("/bom-templates");
  redirect(`/bom-templates/${data.id}`);
}

export async function updateTemplate(templateId: string, formData: FormData) {
  const { supabase } = await requireTemplateEditor();

  const payload = {
    name: String(formData.get("name") ?? "").trim(),
    system_size_kwp: Number(formData.get("system_size_kwp")),
    system_type: (String(formData.get("system_type") ?? "").trim() || null) as SystemType | null,
    description: String(formData.get("description") ?? "").trim() || null,
    is_active: formData.get("is_active") === "on",
  };

  if (!payload.name) throw new Error("Give the template a name.");
  if (!payload.system_size_kwp || payload.system_size_kwp <= 0) {
    throw new Error("System size (kWp) must be greater than zero.");
  }

  const { error } = await supabase.from("bom_templates").update(payload).eq("id", templateId);
  if (error) throw new Error(`Could not update template: ${error.message}`);

  revalidatePath("/bom-templates");
  revalidatePath(`/bom-templates/${templateId}`);
}

export async function deleteTemplate(templateId: string, _formData: FormData) {
  const { supabase } = await requireTemplateEditor();
  const { error } = await supabase.from("bom_templates").delete().eq("id", templateId);
  if (error) throw new Error(`Could not delete template: ${error.message}`);
  revalidatePath("/bom-templates");
  redirect("/bom-templates");
}

export async function addTemplateLine(templateId: string, formData: FormData) {
  const { supabase } = await requireTemplateEditor();

  const description = String(formData.get("description") ?? "").trim();
  if (!description) throw new Error("Describe the line item first.");

  const { count } = await supabase
    .from("bom_template_lines")
    .select("id", { count: "exact", head: true })
    .eq("template_id", templateId);

  const payload = {
    template_id: templateId,
    line_no: (count ?? 0) + 1,
    category_id: String(formData.get("category_id")),
    equipment_id: String(formData.get("equipment_id") ?? "") || null,
    is_major: formData.get("is_major") === "on",
    description,
    manufacturer: String(formData.get("manufacturer") ?? "").trim() || null,
    model: String(formData.get("model") ?? "").trim() || null,
    quantity: Number(formData.get("quantity") ?? 1),
    unit: String(formData.get("unit") ?? "pc").trim() || "pc",
    notes: String(formData.get("notes") ?? "").trim() || null,
  };

  const { error } = await supabase.from("bom_template_lines").insert(payload);
  if (error) throw new Error(`Could not add line: ${error.message}`);

  revalidatePath(`/bom-templates/${templateId}`);
}

export async function deleteTemplateLine(templateId: string, lineId: string) {
  const { supabase } = await requireTemplateEditor();
  const { error } = await supabase.from("bom_template_lines").delete().eq("id", lineId);
  if (error) throw new Error(`Could not remove line: ${error.message}`);
  revalidatePath(`/bom-templates/${templateId}`);
}
