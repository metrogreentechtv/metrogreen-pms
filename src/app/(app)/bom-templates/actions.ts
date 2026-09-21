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

// The next free line_no for a template. Reads MAX(line_no) rather than
// COUNT(*) of rows — deleteTemplateLine never renumbers the lines left
// behind after a delete, so as soon as any line other than the very last
// one is removed, COUNT(*) undercounts and the next insert collides with
// a line_no a surviving row already has, violating
// bom_template_lines_template_line_no_key. Same bug/fix shape as
// nextBomLineNo() in quotations/actions.ts (see the handoff doc's
// "BOM line-numbering bug fix" section) — found here while wiring up
// the templates list's edit/delete row actions, fixed proactively before
// Joel hit it the same way on a template.
async function nextTemplateLineNo(
  supabase: Awaited<ReturnType<typeof createClient>>,
  templateId: string
) {
  const { data } = await supabase
    .from("bom_template_lines")
    .select("line_no")
    .eq("template_id", templateId)
    .order("line_no", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data?.line_no ?? 0) + 1;
}

export async function addTemplateLine(templateId: string, formData: FormData) {
  const { supabase } = await requireTemplateEditor();

  const description = String(formData.get("description") ?? "").trim();
  if (!description) throw new Error("Describe the line item first.");

  const lineNo = await nextTemplateLineNo(supabase, templateId);

  const payload = {
    template_id: templateId,
    line_no: lineNo,
    category_id: String(formData.get("category_id")),
    equipment_id: String(formData.get("equipment_id") ?? "") || null,
    is_major: formData.get("is_major") === "on",
    description,
    manufacturer: String(formData.get("manufacturer") ?? "").trim() || null,
    model: String(formData.get("model") ?? "").trim() || null,
    quantity: Number(formData.get("quantity") ?? 1),
    unit: String(formData.get("unit") ?? "pc").trim() || "pc",
    unit_price_php: Number(formData.get("unit_price_php") ?? 0),
    notes: String(formData.get("notes") ?? "").trim() || null,
    default_proposal_group: String(formData.get("default_proposal_group") ?? "").trim() || null,
  };

  const { error } = await supabase.from("bom_template_lines").insert(payload);
  if (error) throw new Error(`Could not add line: ${error.message}`);

  revalidatePath(`/bom-templates/${templateId}`);
}

// Quick inline correction for a line's quantity/unit price (the two
// figures that actually change often) without a delete-and-re-add round
// trip — everything else about a line (category, description, major-slot
// flag) is edited by removing it and adding it again.
export async function updateTemplateLine(templateId: string, lineId: string, formData: FormData) {
  const { supabase } = await requireTemplateEditor();

  const payload = {
    quantity: Number(formData.get("quantity") ?? 1),
    unit_price_php: Number(formData.get("unit_price_php") ?? 0),
  };

  const { error } = await supabase.from("bom_template_lines").update(payload).eq("id", lineId);
  if (error) throw new Error(`Could not update line: ${error.message}`);

  revalidatePath(`/bom-templates/${templateId}`);
}

export async function deleteTemplateLine(templateId: string, lineId: string) {
  const { supabase } = await requireTemplateEditor();
  const { error } = await supabase.from("bom_template_lines").delete().eq("id", lineId);
  if (error) throw new Error(`Could not remove line: ${error.message}`);
  revalidatePath(`/bom-templates/${templateId}`);
}
