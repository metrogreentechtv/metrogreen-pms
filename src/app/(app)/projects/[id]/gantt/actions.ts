"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { parseGanttWorkbook } from "@/lib/gantt-import";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

export async function importGanttSchedule(projectId: string, formData: FormData) {
  const { supabase } = await requireUser();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Choose a Gantt chart .xlsx file to upload.");
  }

  const { count: existingCount } = await supabase
    .from("project_milestones")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId);

  if ((existingCount ?? 0) > 0 && formData.get("replace") !== "on") {
    throw new Error(
      "This project already has a schedule. Check \"Replace the existing schedule\" to re-import."
    );
  }

  const buffer = await file.arrayBuffer();
  let parsed;
  try {
    parsed = parseGanttWorkbook(buffer);
  } catch (err) {
    throw new Error(err instanceof Error ? err.message : "Could not read that workbook.");
  }

  if (existingCount) {
    const { error: deleteError } = await supabase
      .from("project_milestones")
      .delete()
      .eq("project_id", projectId);
    if (deleteError) throw new Error(`Could not clear the existing schedule: ${deleteError.message}`);
  }

  const payload = parsed.tasks.map((t) => ({
    project_id: projectId,
    sequence_no: t.sequence_no,
    name: t.name,
    weight_pct: t.weight_pct,
    planned_start: t.planned_start,
    planned_end: t.planned_end,
    status: "not_started",
    completion_pct: 0,
  }));

  const { error: insertError } = await supabase.from("project_milestones").insert(payload);
  if (insertError) throw new Error(`Could not import the schedule: ${insertError.message}`);

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/gantt`);
  revalidatePath(`/projects/management`);
}
