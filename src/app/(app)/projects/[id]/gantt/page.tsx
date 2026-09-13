import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import { canWrite } from "@/lib/roles";
import { Badge, Button, Card, CardHeader, EmptyState, Field, Input } from "@/components/ui";
import { PrintButton } from "@/components/quotations/PrintButton";
import { MilestoneGantt } from "@/components/projects/MilestoneGantt";
import { SCurveChart } from "@/components/projects/SCurveChart";
import { computeSCurve, computeSCurveKpis } from "@/lib/scurve";
import { formatDate } from "@/lib/format";
import type { Customer, Project, ProjectMilestone } from "@/lib/types";
import { importGanttSchedule } from "./actions";

export default async function ProjectGanttPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const user = await getCurrentUser();
  const roles = user?.roles ?? [];
  const writable = canWrite(roles);

  const { data: project } = await supabase
    .from("projects")
    .select("*, customers(*)")
    .eq("id", params.id)
    .maybeSingle();
  if (!project) notFound();
  const p = project as Project & { customers: Customer | null };

  const { data: milestoneRows } = await supabase
    .from("project_milestones")
    .select("*")
    .eq("project_id", p.id)
    .order("sequence_no");
  const milestones = (milestoneRows ?? []) as ProjectMilestone[];

  const boundImport = importGanttSchedule.bind(null, p.id);

  const points = computeSCurve(milestones);
  const kpis = computeSCurveKpis(points);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3 print:hidden">
        <div>
          <p className="text-xs font-medium text-brand-600">{p.project_no}</p>
          <h1 className="text-xl font-semibold text-neutral-900">Gantt &amp; S-Curve — {p.project_name}</h1>
          <p className="text-sm text-neutral-500">
            {p.customers?.customer_name}
            {" · "}
            <Link href={`/projects/${p.id}`} className="text-brand-700 hover:underline">
              Back to project
            </Link>
          </p>
        </div>
        {milestones.length > 0 && <PrintButton />}
      </div>

      {milestones.length === 0 ? (
        <Card>
          <CardHeader
            title="No schedule yet"
            subtitle="Import a Gantt chart workbook to build this project's timeline and progress report"
          />
          <div className="space-y-4 px-5 py-5">
            <EmptyState
              title="Import a Gantt chart to get started"
              description={
                'Upload an .xlsx file shaped like the Gantt chart template — a "TIMELINE" sheet with a Start Date, ' +
                "and an ITEM / DESCRIPTION / Relative Weight / Duration / Day to Start table. Each row becomes a " +
                "milestone here, and the Gantt bars, KPIs and S-curve below are generated from it automatically."
              }
            />
            {writable ? (
              <form action={boundImport} className="max-w-sm space-y-3">
                <Field label="Gantt chart workbook (.xlsx)">
                  <Input name="file" type="file" accept=".xlsx" required />
                </Field>
                <Button type="submit" size="sm">Import schedule</Button>
              </form>
            ) : (
              <p className="text-sm text-neutral-500">Ask a project manager or admin to import the schedule.</p>
            )}
            <p className="text-xs text-neutral-400">
              Individual milestones can also be added by hand from this project&apos;s{" "}
              <Link href={`/projects/${p.id}`} className="text-brand-700 hover:underline">
                detail page
              </Link>
              .
            </p>
          </div>
        </Card>
      ) : (
        <>
          {kpis && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 print:grid-cols-5">
              <Kpi label="Planned today" value={`${kpis.todayPlannedPct}%`} />
              <Kpi label="Actual today" value={`${kpis.todayActualPct}%`} />
              <Kpi
                label="Variance"
                value={`${kpis.variancePct > 0 ? "+" : ""}${kpis.variancePct}%`}
                tone={kpis.variancePct < -0.5 ? "red" : kpis.variancePct > 0.5 ? "green" : "neutral"}
              />
              <Kpi label="Days elapsed" value={`${Math.max(0, kpis.daysElapsed)} / ${kpis.totalDays}`} />
              <Kpi label="Planned at completion" value={`${kpis.plannedAtCompletionPct}%`} />
            </div>
          )}

          <Card>
            <CardHeader title="Task timeline" subtitle="Planned span with progress fill; today marked in red" />
            <div className="px-5 py-4">
              <MilestoneGantt milestones={milestones} />
            </div>
          </Card>

          <Card>
            <CardHeader
              title="S-Curve"
              subtitle="Cumulative weighted progress — planned vs. actual, from the weight and duration of each task"
            />
            <div className="px-5 py-4">
              <SCurveChart points={points} />
              <p className="mt-3 text-xs text-neutral-400">
                Actual progress is approximated from each milestone&apos;s actual start/end dates and its current
                completion % — not a day-by-day log — so it&apos;s a reasonable shape rather than an exact history.
              </p>
            </div>
          </Card>

          <Card>
            <CardHeader title="Milestones" subtitle={`${milestones.length} imported from the Gantt chart`} />
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-neutral-50 text-xs text-neutral-500">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">#</th>
                    <th className="px-4 py-2.5 font-medium">Task</th>
                    <th className="px-4 py-2.5 font-medium">Weight</th>
                    <th className="px-4 py-2.5 font-medium">Planned start</th>
                    <th className="px-4 py-2.5 font-medium">Planned end</th>
                    <th className="px-4 py-2.5 font-medium">Status</th>
                    <th className="px-4 py-2.5 font-medium">Complete</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {milestones.map((m) => (
                    <tr key={m.id}>
                      <td className="px-4 py-2 tabular-nums text-neutral-500">{m.sequence_no}</td>
                      <td className="px-4 py-2 font-medium text-neutral-900">{m.name}</td>
                      <td className="px-4 py-2 tabular-nums">{m.weight_pct}%</td>
                      <td className="px-4 py-2 tabular-nums">{formatDate(m.planned_start)}</td>
                      <td className="px-4 py-2 tabular-nums">{formatDate(m.planned_end)}</td>
                      <td className="px-4 py-2">
                        <Badge tone={m.status === "done" ? "green" : m.status === "blocked" ? "red" : m.status === "in_progress" ? "amber" : "neutral"}>
                          {m.status.replace("_", " ")}
                        </Badge>
                      </td>
                      <td className="px-4 py-2 tabular-nums">{m.completion_pct}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="border-t border-black/5 px-5 py-3 text-xs text-neutral-400">
              Update each task&apos;s status, dates and completion % from this project&apos;s{" "}
              <Link href={`/projects/${p.id}`} className="text-brand-700 hover:underline">
                detail page
              </Link>
              .
            </p>
          </Card>

          {writable && (
            <Card className="print:hidden">
              <details className="px-5 py-4">
                <summary className="cursor-pointer text-sm font-medium text-brand-700">Re-import schedule</summary>
                <form action={boundImport} className="mt-3 max-w-sm space-y-3">
                  <p className="text-xs text-neutral-500">
                    This replaces every current milestone on this project with a fresh import — status, actual dates
                    and completion % entered so far will be lost.
                  </p>
                  <Field label="Gantt chart workbook (.xlsx)">
                    <Input name="file" type="file" accept=".xlsx" required />
                  </Field>
                  <label className="flex items-center gap-2 text-xs text-neutral-600">
                    <input type="checkbox" name="replace" required />
                    Replace the existing schedule
                  </label>
                  <Button type="submit" size="sm" variant="danger">Replace schedule</Button>
                </form>
              </details>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function Kpi({ label, value, tone = "neutral" }: { label: string; value: string; tone?: "neutral" | "green" | "red" }) {
  const toneClass = tone === "green" ? "text-green-700" : tone === "red" ? "text-red-700" : "text-neutral-900";
  return (
    <div className="rounded-xl border border-black/5 bg-white px-4 py-3 shadow-sm">
      <p className="text-[11px] text-neutral-400">{label}</p>
      <p className={`mt-0.5 text-lg font-semibold tabular-nums ${toneClass}`}>{value}</p>
    </div>
  );
}
