import { createClient } from "@/lib/supabase/server";
import { GanttTimeline, type GanttProject } from "@/components/projects/GanttTimeline";
import { KanbanBoard, type KanbanProject } from "@/components/projects/KanbanBoard";
import { ProjectManagementTabs } from "@/components/projects/ProjectManagementTabs";
import { computeProjectProgress, groupMilestonesByProject } from "@/lib/project-progress";
import type { Customer, Project, ProjectMilestone } from "@/lib/types";

export default async function ProjectManagementPage() {
  const supabase = await createClient();

  const { data: projectRows, error } = await supabase
    .from("projects")
    .select("*, customers(*)")
    .order("target_start_date", { ascending: true, nullsFirst: false });

  const projects = (projectRows ?? []) as (Project & { customers: Customer | null })[];
  const projectIds = projects.map((p) => p.id);

  const { data: milestoneRows } = projectIds.length
    ? await supabase.from("project_milestones").select("*").in("project_id", projectIds)
    : { data: [] };

  const milestonesByProject = groupMilestonesByProject((milestoneRows ?? []) as ProjectMilestone[]);

  const withProgress = projects.map((p) => ({
    ...p,
    progress: computeProjectProgress(milestonesByProject.get(p.id) ?? []),
  }));

  // Residential is the customer's own stated type; everything else
  // (commercial, industrial, government, subcontractor_client) is treated
  // as C&I / institutional for this split — the timeline view suits
  // multi-month contracted work better than a status board does.
  const ciProjects: GanttProject[] = withProgress.filter(
    (p) => p.customers?.customer_type !== "residential"
  );
  const residentialProjects: KanbanProject[] = withProgress.filter(
    (p) => p.customers?.customer_type === "residential"
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Project Management</h1>
        <p className="text-sm text-neutral-500">
          A portfolio view across every project — C&amp;I projects on a timeline, residential projects
          on a status board. Individual schedules, milestones, and team assignments are still managed
          from each project's own page.
        </p>
      </div>

      {error && (
        <p className="text-sm text-red-700">Could not load projects: {error.message}</p>
      )}

      <ProjectManagementTabs
        ci={<GanttTimeline projects={ciProjects} />}
        residential={<KanbanBoard projects={residentialProjects} />}
      />
    </div>
  );
}
