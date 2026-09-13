import Link from "next/link";
import { Badge } from "@/components/ui";
import { formatDate, humanize } from "@/lib/format";
import type { Customer, Project, ProjectStatus } from "@/lib/types";

const COLUMNS: ProjectStatus[] = [
  "awarded",
  "mobilization",
  "in_progress",
  "testing_commissioning",
  "turnover",
  "on_hold",
  "closed",
  "cancelled",
];

const COLUMN_TONE: Record<ProjectStatus, "blue" | "amber" | "purple" | "green" | "neutral" | "red"> = {
  awarded: "blue",
  mobilization: "amber",
  in_progress: "amber",
  testing_commissioning: "purple",
  turnover: "green",
  closed: "green",
  on_hold: "neutral",
  cancelled: "red",
};

export type KanbanProject = Project & { customers: Customer | null; progress: number | null };

export function KanbanBoard({ projects }: { projects: KanbanProject[] }) {
  const byStatus = new Map<ProjectStatus, KanbanProject[]>();
  for (const p of projects) {
    const list = byStatus.get(p.status);
    if (list) list.push(p);
    else byStatus.set(p.status, [p]);
  }

  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex gap-3" style={{ minWidth: 1100 }}>
        {COLUMNS.map((status) => {
          const items = byStatus.get(status) ?? [];
          return (
            <div key={status} className="w-[220px] shrink-0 rounded-xl border border-black/5 bg-neutral-50">
              <div className="flex items-center justify-between border-b border-black/5 px-3 py-2.5">
                <Badge tone={COLUMN_TONE[status]}>{humanize(status)}</Badge>
                <span className="text-xs text-neutral-400">{items.length}</span>
              </div>
              <div className="space-y-2 p-2">
                {items.map((p) => (
                  <Link
                    key={p.id}
                    href={`/projects/${p.id}`}
                    className="block rounded-lg border border-black/5 bg-white p-2.5 text-xs shadow-sm hover:border-brand-300"
                  >
                    <p className="font-medium text-neutral-900">{p.project_no}</p>
                    <p className="mt-0.5 truncate text-neutral-600">{p.customers?.customer_name ?? p.project_name}</p>
                    <p className="mt-1 text-neutral-400">Target: {formatDate(p.target_completion_date)}</p>
                    {p.progress != null && (
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-neutral-100">
                        <div className="h-full rounded-full bg-brand-500" style={{ width: `${p.progress}%` }} />
                      </div>
                    )}
                  </Link>
                ))}
                {items.length === 0 && <p className="px-1 py-2 text-center text-[11px] text-neutral-400">—</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
