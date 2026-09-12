"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ProjectStatus } from "@/lib/types";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

export async function updateProjectStatus(projectId: string, formData: FormData) {
  const { supabase } = await requireUser();
  const status = String(formData.get("status")) as ProjectStatus;

  const payload: Record<string, unknown> = { status };
  if (status === "in_progress") payload.actual_start_date = payload.actual_start_date ?? new Date().toISOString().slice(0, 10);
  if (status === "turnover") payload.turnover_date = new Date().toISOString().slice(0, 10);
  if (status === "closed") payload.actual_completion_date = new Date().toISOString().slice(0, 10);

  const { error } = await supabase.from("projects").update(payload).eq("id", projectId);
  if (error) throw new Error(`Could not update project status: ${error.message}`);

  revalidatePath(`/projects/${projectId}`);
}

export async function addMilestone(projectId: string, formData: FormData) {
  const { supabase } = await requireUser();

  const { count } = await supabase
    .from("project_milestones")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId);

  const payload = {
    project_id: projectId,
    sequence_no: (count ?? 0) + 1,
    name: String(formData.get("name") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim() || null,
    weight_pct: formData.get("weight_pct") ? Number(formData.get("weight_pct")) : null,
    planned_start: String(formData.get("planned_start") ?? "") || null,
    planned_end: String(formData.get("planned_end") ?? "") || null,
    status: "not_started",
    completion_pct: 0,
  };

  const { error } = await supabase.from("project_milestones").insert(payload);
  if (error) throw new Error(`Could not add milestone: ${error.message}`);

  revalidatePath(`/projects/${projectId}`);
}

export async function updateMilestone(projectId: string, milestoneId: string, formData: FormData) {
  const { supabase } = await requireUser();

  const completion = Number(formData.get("completion_pct") ?? 0);
  const payload = {
    status: String(formData.get("status") ?? "not_started"),
    completion_pct: completion,
    actual_start: String(formData.get("actual_start") ?? "") || null,
    actual_end: String(formData.get("actual_end") ?? "") || null,
    notes: String(formData.get("notes") ?? "").trim() || null,
  };

  const { error } = await supabase.from("project_milestones").update(payload).eq("id", milestoneId);
  if (error) throw new Error(`Could not update milestone: ${error.message}`);

  revalidatePath(`/projects/${projectId}`);
}

export async function addAssignment(projectId: string, formData: FormData) {
  const { supabase } = await requireUser();

  const payload = {
    project_id: projectId,
    user_id: String(formData.get("user_id")),
    role_on_project: String(formData.get("role_on_project") ?? "").trim(),
    assigned_from: String(formData.get("assigned_from") ?? "") || null,
    notes: String(formData.get("notes") ?? "").trim() || null,
  };

  const { error } = await supabase.from("project_assignments").insert(payload);
  if (error) throw new Error(`Could not add assignment: ${error.message}`);

  revalidatePath(`/projects/${projectId}`);
}
