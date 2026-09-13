import Link from "next/link";
import { Card, CardHeader, EmptyState } from "@/components/ui";
import { humanize } from "@/lib/format";
import type { Customer, Project, ProjectStatus } from "@/lib/types";

const BAR_COLOR: Record<ProjectStatus, string> = {
  awarded: "bg-blue-500",
  mobilization: "bg-amber-500",
  in_progress: "bg-amber-500",
  testing_commissioning: "bg-purple-500",
  turnover: "bg-green-600",
  closed: "bg-neutral-400",
  on_hold: "bg-neutral-400",
  cancelled: "bg-red-400",
};

export type GanttProject = Project & { customers: Customer | null; progress: number | null };

const DAY_MS = 24 * 60 * 60 * 1000;

export function GanttTimeline({ projects }: { projects: GanttProject[] }) {
  const scheduled = projects.filter((p) => p.target_start_date && p.target_completion_date);
  const unscheduled = projects.filter((p) => !(p.target_start_date && p.target_completion_date));

  if (scheduled.length === 0) {
    return (
      <Card>
        <CardHeader title="C&amp;I project timeline" subtitle="Commercial, industrial, government &amp; subcontractor projects" />
        <div className="px-5 py-6">
          <EmptyState
            title="No scheduled C&I projects yet"
            description="Projects need both a target start and target completion date to appear on the timeline — set these from the project's detail page."
          />
        </div>
      </Card>
    );
  }

  const starts = scheduled.map((p) => new Date(p.target_start_date!).getTime());
  const ends = scheduled.map((p) => new Date(p.target_completion_date!).getTime());
  const today = Date.now();
  const rangeStart = Math.min(...starts, today) - 7 * DAY_MS;
  const rangeEnd = Math.max(...ends, today) + 7 * DAY_MS;
  const totalDays = Math.max(1, Math.round((rangeEnd - rangeStart) / DAY_MS));

  const months = monthTicks(rangeStart, rangeEnd);
  const todayPct = ((today - rangeStart) / (rangeEnd - rangeStart)) * 100;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title="C&amp;I project timeline" subtitle="Commercial, industrial, government &amp; subcontractor projects — bar spans target start to target completion; today marked in red" />
        <div className="overflow-x-auto px-5 py-4">
          <div style={{ minWidth: 720 }}>
            <div className="relative ml-[220px] mb-2 h-5 border-b border-black/10 text-[10px] text-neutral-400">
              {months.map((m) => (
                <span
                  key={m.label}
                  className="absolute -translate-x-1/2"
                  style={{ left: `${((m.time - rangeStart) / (rangeEnd - rangeStart)) * 100}%` }}
                >
                  {m.label}
                </span>
              ))}
            </div>
            <div className="space-y-2">
              {scheduled.map((p) => {
                const start = new Date(p.target_start_date!).getTime();
                const end = new Date(p.target_completion_date!).getTime();
                const leftPct = ((start - rangeStart) / (rangeEnd - rangeStart)) * 100;
                const widthPct = Math.max(0.8, ((end - start) / (rangeEnd - rangeStart)) * 100);
                const progress = p.progress ?? 0;
                return (
                  <div key={p.id} className="flex items-center gap-2">
                    <span className="flex w-[220px] shrink-0 items-baseline gap-1.5">
                      <Link
                        href={`/projects/${p.id}`}
                        className="truncate text-xs font-medium text-brand-700 hover:underline"
                        title={`${p.project_no} — ${p.project_name}`}
                      >
                        {p.project_no} · {p.customers?.customer_name ?? p.project_name}
                      </Link>
                      <Link
                        href={`/projects/${p.id}/gantt`}
                        className="shrink-0 text-[10px] text-neutral-400 hover:text-brand-700 hover:underline"
                        title="View Gantt &amp; S-Curve"
                      >
                        S-curve
                      </Link>
                    </span>
                    <div className="relative h-6 flex-1 rounded bg-neutral-100">
                      <div className="absolute inset-y-0 w-px bg-red-400" style={{ left: `${Math.min(100, Math.max(0, todayPct))}%` }} />
                      <div
                        className={`absolute inset-y-0.5 rounded ${BAR_COLOR[p.status]} bg-opacity-40`}
                        style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                      >
                        <div
                          className={`h-full rounded ${BAR_COLOR[p.status]}`}
                          style={{ width: `${Math.min(100, progress)}%` }}
                        />
                      </div>
                    </div>
                    <span className="w-10 shrink-0 text-right text-[11px] tabular-nums text-neutral-500">
                      {p.progress != null ? `${p.progress}%` : "—"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </Card>

      {unscheduled.length > 0 && (
        <Card>
          <CardHeader title="Not yet scheduled" subtitle="Missing a target start and/or completion date" />
          <div className="divide-y divide-black/5">
            {unscheduled.map((p) => (
              <div key={p.id} className="flex items-center justify-between px-5 py-2.5 text-sm">
                <Link href={`/projects/${p.id}`} className="font-medium text-brand-700 hover:underline">
                  {p.project_no} · {p.customers?.customer_name ?? p.project_name}
                </Link>
                <span className="text-xs text-neutral-500">{humanize(p.status)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function monthTicks(rangeStart: number, rangeEnd: number) {
  const ticks: { time: number; label: string }[] = [];
  const d = new Date(rangeStart);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  if (d.getTime() < rangeStart) d.setMonth(d.getMonth() + 1);
  while (d.getTime() <= rangeEnd) {
    ticks.push({
      time: d.getTime(),
      label: d.toLocaleDateString("en-PH", { month: "short", year: "2-digit" }),
    });
    d.setMonth(d.getMonth() + 1);
  }
  return ticks;
}
