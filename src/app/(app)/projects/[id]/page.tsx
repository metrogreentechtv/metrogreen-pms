import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import { canSeeCost, canWrite } from "@/lib/roles";
import { Badge, Button, Card, CardHeader, EmptyState, Field, Input, Select, Textarea } from "@/components/ui";
import { ProjectStatusBadge } from "@/components/quotations/StatusBadge";
import { formatDate, formatNumber, formatPhp, humanize } from "@/lib/format";
import type { Customer, Project, ProjectAssignment, ProjectBaselineBom, ProjectMilestone, ProjectStatus, Site } from "@/lib/types";
import { addAssignment, addMilestone, updateMilestone, updateProjectStatus } from "../actions";

const STATUSES: ProjectStatus[] = [
  "awarded",
  "mobilization",
  "in_progress",
  "testing_commissioning",
  "turnover",
  "closed",
  "on_hold",
  "cancelled",
];

export default async function ProjectDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const user = await getCurrentUser();
  const roles = user?.roles ?? [];

  const { data: project } = await supabase
    .from("projects")
    .select("*, customers(*), sites(*)")
    .eq("id", params.id)
    .maybeSingle();

  if (!project) notFound();
  const p = project as Project & { customers: Customer | null; sites: Site | null };

  const [{ data: baseline }, { data: milestones }, { data: assignments }, { data: assignableUsers }] =
    await Promise.all([
      supabase.from("project_baseline_bom").select("*").eq("project_id", p.id).order("line_no"),
      supabase.from("project_milestones").select("*").eq("project_id", p.id).order("sequence_no"),
      supabase.from("project_assignments").select("*, user_profiles(full_name)").eq("project_id", p.id),
      supabase.from("user_profiles").select("id, full_name").eq("is_active", true).order("full_name"),
    ]);

  const baselineBom = (baseline ?? []) as ProjectBaselineBom[];
  const milestoneList = (milestones ?? []) as ProjectMilestone[];
  const assignmentList = (assignments ?? []) as (ProjectAssignment & {
    user_profiles: { full_name: string } | null;
  })[];

  const showCost = canSeeCost(roles);
  const writable = canWrite(roles);
  const totalBudgetCost = baselineBom.reduce((a, b) => a + b.budget_line_cost_php, 0);

  const boundUpdateStatus = updateProjectStatus.bind(null, p.id);
  const boundAddMilestone = addMilestone.bind(null, p.id);
  const boundAddAssignment = addAssignment.bind(null, p.id);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-brand-600">{p.project_no}</p>
          <h1 className="text-xl font-semibold text-neutral-900">{p.project_name}</h1>
          <p className="text-sm text-neutral-500">
            <Link href={`/customers/${p.customer_id}`} className="text-brand-700 hover:underline">
              {p.customers?.customer_name}
            </Link>
            {p.sites && ` · ${p.sites.site_name}`}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <ProjectStatusBadge status={p.status} />
            <Badge tone="neutral">{humanize(p.service_type)}</Badge>
            <Badge tone="neutral">{humanize(p.system_type)}</Badge>
          </div>
        </div>
        {p.quotation_id && (
          <Link
            href={`/quotations/${p.quotation_id}`}
            className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            View source quotation
          </Link>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label="Contracted capacity" value={p.contracted_capacity_kwp ? `${formatNumber(p.contracted_capacity_kwp, 1)} kWp` : "—"} />
        <Kpi label="Contract value" value={formatPhp(p.contract_value_php)} />
        <Kpi label="Target start" value={formatDate(p.target_start_date)} />
        <Kpi label="Target completion" value={formatDate(p.target_completion_date)} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title="Milestones" subtitle="Schedule and progress tracking" />
            <div className="divide-y divide-black/5">
              {milestoneList.map((m) => (
                <div key={m.id} className="px-5 py-3 text-sm">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-neutral-900">
                      {m.sequence_no}. {m.name}
                    </p>
                    <span className="text-xs text-neutral-500">{m.completion_pct}%</span>
                  </div>
                  <p className="text-xs text-neutral-500">
                    {formatDate(m.planned_start)} – {formatDate(m.planned_end)} · {humanize(m.status)}
                  </p>
                  {writable && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-xs text-brand-700">Update</summary>
                      <form action={updateMilestone.bind(null, p.id, m.id)} className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                        <Select name="status" defaultValue={m.status} className="text-xs">
                          <option value="not_started">Not started</option>
                          <option value="in_progress">In progress</option>
                          <option value="done">Done</option>
                          <option value="blocked">Blocked</option>
                        </Select>
                        <Input name="completion_pct" type="number" min={0} max={100} defaultValue={m.completion_pct} className="text-xs" />
                        <Input name="actual_start" type="date" defaultValue={m.actual_start ?? ""} className="text-xs" />
                        <Input name="actual_end" type="date" defaultValue={m.actual_end ?? ""} className="text-xs" />
                        <div className="col-span-2 sm:col-span-4">
                          <Button type="submit" size="sm" variant="secondary">Save</Button>
                        </div>
                      </form>
                    </details>
                  )}
                </div>
              ))}
              {milestoneList.length === 0 && (
                <div className="px-5 py-4 text-sm text-neutral-500">No milestones yet.</div>
              )}
            </div>
            {writable && (
              <details className="border-t border-black/5 px-5 py-4">
                <summary className="cursor-pointer text-sm font-medium text-brand-700">+ Add milestone</summary>
                <form action={boundAddMilestone} className="mt-3 space-y-3">
                  <Field label="Name">
                    <Input name="name" required placeholder="e.g. Permit approval" />
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Planned start">
                      <Input name="planned_start" type="date" />
                    </Field>
                    <Field label="Planned end">
                      <Input name="planned_end" type="date" />
                    </Field>
                  </div>
                  <Field label="Weight (%)">
                    <Input name="weight_pct" type="number" step="0.1" />
                  </Field>
                  <Field label="Description">
                    <Textarea name="description" rows={2} />
                  </Field>
                  <Button type="submit" size="sm">Add milestone</Button>
                </form>
              </details>
            )}
          </Card>

          <Card>
            <CardHeader title="Baseline BOM" subtitle="Frozen from the winning quotation revision — never edited" />
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-neutral-50 text-xs text-neutral-500">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Description</th>
                    <th className="px-4 py-2.5 font-medium">Qty</th>
                    {showCost && <th className="px-4 py-2.5 font-medium">Budget unit cost</th>}
                    {showCost && <th className="px-4 py-2.5 font-medium">Budget line cost</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {baselineBom.map((b) => (
                    <tr key={b.id}>
                      <td className="px-4 py-2">
                        <p className="font-medium text-neutral-900">{b.description}</p>
                        <p className="text-xs text-neutral-500">{[b.manufacturer, b.model].filter(Boolean).join(" · ")}</p>
                      </td>
                      <td className="px-4 py-2 tabular-nums">
                        {formatNumber(b.budget_quantity)} {b.unit}
                      </td>
                      {showCost && <td className="px-4 py-2 tabular-nums">{formatPhp(b.budget_unit_cost_php)}</td>}
                      {showCost && <td className="px-4 py-2 tabular-nums">{formatPhp(b.budget_line_cost_php)}</td>}
                    </tr>
                  ))}
                </tbody>
                {showCost && (
                  <tfoot>
                    <tr className="border-t border-black/10 font-semibold">
                      <td colSpan={3} className="px-4 py-2.5 text-right">
                        Total baseline cost
                      </td>
                      <td className="px-4 py-2.5 tabular-nums">{formatPhp(totalBudgetCost)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
            {baselineBom.length === 0 && (
              <div className="px-5 py-6">
                <EmptyState title="No baseline BOM on file" />
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          {writable && (
            <Card>
              <CardHeader title="Status" />
              <form action={boundUpdateStatus} className="space-y-3 px-5 py-4">
                <Select name="status" defaultValue={p.status}>
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {humanize(s)}
                    </option>
                  ))}
                </Select>
                <Button type="submit" size="sm" className="w-full justify-center">
                  Update status
                </Button>
              </form>
            </Card>
          )}

          <Card>
            <CardHeader title="Team" />
            <div className="divide-y divide-black/5">
              {assignmentList.map((a) => (
                <div key={a.id} className="px-5 py-3 text-sm">
                  <p className="font-medium text-neutral-900">{a.user_profiles?.full_name}</p>
                  <p className="text-xs text-neutral-500">{a.role_on_project}</p>
                </div>
              ))}
              {assignmentList.length === 0 && (
                <div className="px-5 py-4 text-sm text-neutral-500">No one assigned yet.</div>
              )}
            </div>
            {writable && (
              <details className="border-t border-black/5 px-5 py-4">
                <summary className="cursor-pointer text-sm font-medium text-brand-700">+ Assign</summary>
                <form action={boundAddAssignment} className="mt-3 space-y-3">
                  <Field label="Person">
                    <Select name="user_id" required defaultValue="">
                      <option value="" disabled>
                        Select…
                      </option>
                      {(assignableUsers ?? []).map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.full_name}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Role on project">
                    <Input name="role_on_project" required placeholder="e.g. Site engineer" />
                  </Field>
                  <Button type="submit" size="sm">Add</Button>
                </form>
              </details>
            )}
          </Card>

          {p.notes && (
            <Card>
              <CardHeader title="Notes" />
              <p className="px-5 py-4 text-sm text-neutral-600">{p.notes}</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-black/5 bg-white px-4 py-3 shadow-sm">
      <p className="text-[11px] text-neutral-400">{label}</p>
      <p className="mt-0.5 text-lg font-semibold tabular-nums text-neutral-900">{value}</p>
    </div>
  );
}
