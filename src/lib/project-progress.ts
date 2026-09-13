import type { ProjectMilestone } from "@/lib/types";

/**
 * A single "% complete" figure for a project, derived from its milestones.
 * Weighted by each milestone's weight_pct when set; falls back to a plain
 * average of completion_pct when none of the milestones on file have a
 * weight (most projects won't bother setting weights for every milestone).
 * Returns null when there are no milestones yet, so callers can show
 * "not started" instead of a misleading 0%.
 */
export function computeProjectProgress(milestones: ProjectMilestone[]): number | null {
  if (milestones.length === 0) return null;

  const totalWeight = milestones.reduce((a, m) => a + (m.weight_pct ?? 0), 0);
  if (totalWeight > 0) {
    const weighted = milestones.reduce((a, m) => a + m.completion_pct * (m.weight_pct ?? 0), 0);
    return Math.round(weighted / totalWeight);
  }

  const simple = milestones.reduce((a, m) => a + m.completion_pct, 0) / milestones.length;
  return Math.round(simple);
}

export function groupMilestonesByProject(
  milestones: ProjectMilestone[]
): Map<string, ProjectMilestone[]> {
  const map = new Map<string, ProjectMilestone[]>();
  for (const m of milestones) {
    const list = map.get(m.project_id);
    if (list) list.push(m);
    else map.set(m.project_id, [m]);
  }
  return map;
}
