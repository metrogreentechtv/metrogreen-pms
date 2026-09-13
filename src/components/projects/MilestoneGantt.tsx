import type { ProjectMilestone } from "@/lib/types";
import { formatDate } from "@/lib/format";

const DAY_MS = 24 * 60 * 60 * 1000;

const STATUS_COLOR: Record<string, string> = {
  not_started: "bg-neutral-400",
  in_progress: "bg-amber-500",
  done: "bg-green-600",
  blocked: "bg-red-500",
};

export function MilestoneGantt({ milestones }: { milestones: ProjectMilestone[] }) {
  const scheduled = milestones.filter((m) => m.planned_start && m.planned_end);
  if (scheduled.length === 0) return null;

  const starts = scheduled.map((m) => new Date(m.planned_start!).getTime());
  const ends = scheduled.map((m) => new Date(m.planned_end!).getTime());
  const today = Date.now();
  const rangeStart = Math.min(...starts, today) - 2 * DAY_MS;
  const rangeEnd = Math.max(...ends, today) + 2 * DAY_MS;
  const todayPct = ((today - rangeStart) / (rangeEnd - rangeStart)) * 100;

  return (
    <div className="overflow-x-auto">
      <div style={{ minWidth: 640 }} className="space-y-1.5">
        {scheduled.map((m) => {
          const start = new Date(m.planned_start!).getTime();
          const end = new Date(m.planned_end!).getTime();
          const leftPct = ((start - rangeStart) / (rangeEnd - rangeStart)) * 100;
          const widthPct = Math.max(0.6, ((end - start) / (rangeEnd - rangeStart)) * 100);
          const color = STATUS_COLOR[m.status] ?? "bg-neutral-400";
          return (
            <div key={m.id} className="flex items-center gap-2">
              <span
                className="w-[260px] shrink-0 truncate text-xs text-neutral-700"
                title={`${m.sequence_no}. ${m.name} — ${formatDate(m.planned_start)} to ${formatDate(m.planned_end)}`}
              >
                {m.sequence_no}. {m.name}
              </span>
              <div className="relative h-5 flex-1 rounded bg-neutral-100">
                <div className="absolute inset-y-0 w-px bg-red-400" style={{ left: `${Math.min(100, Math.max(0, todayPct))}%` }} />
                <div className={`absolute inset-y-0.5 rounded ${color} bg-opacity-30`} style={{ left: `${leftPct}%`, width: `${widthPct}%` }}>
                  <div className={`h-full rounded ${color}`} style={{ width: `${Math.min(100, m.completion_pct)}%` }} />
                </div>
              </div>
              <span className="w-9 shrink-0 text-right text-[11px] tabular-nums text-neutral-500">{m.completion_pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
