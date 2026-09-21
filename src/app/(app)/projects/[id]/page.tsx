import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import { canSeeProjectFinancials, canWrite } from "@/lib/roles";
import { Badge, Button, Card, CardHeader, EmptyState, Field, Input, Select, Textarea } from "@/components/ui";
import { ProjectStatusBadge } from "@/components/quotations/StatusBadge";
import { formatDate, formatNumber, formatPct, formatPhp, humanize } from "@/lib/format";
import type {
  Contact,
  Customer,
  Project,
  ProjectAssignment,
  ProjectBaselineBom,
  ProjectMilestone,
  ProjectStatus,
  RevisionConfiguration,
  Site,
} from "@/lib/types";
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

  const [{ data: baseline }, { data: milestones }, { data: assignments }, { data: assignableUsers }, { data: contacts }, { data: configRow }] =
    await Promise.all([
      supabase.from("project_baseline_bom").select("*").eq("project_id", p.id).order("line_no"),
      supabase.from("project_milestones").select("*").eq("project_id", p.id).order("sequence_no"),
      supabase.from("project_assignments").select("*, user_profiles(full_name)").eq("project_id", p.id),
      supabase.from("user_profiles").select("id, full_name").eq("is_active", true).order("full_name"),
      supabase.from("contacts").select("*").eq("customer_id", p.customer_id).order("is_primary", { ascending: false }),
      p.source_revision_id
        ? supabase.from("revision_configurations").select("*").eq("revision_id", p.source_revision_id).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

  const baselineBom = (baseline ?? []) as ProjectBaselineBom[];
  const milestoneList = (milestones ?? []) as ProjectMilestone[];
  const assignmentList = (assignments ?? []) as (ProjectAssignment & {
    user_profiles: { full_name: string } | null;
  })[];
  const contactList = (contacts ?? []) as Contact[];
  const config = configRow as RevisionConfiguration | null;

  const showFinancials = canSeeProjectFinancials(roles);
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
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/projects/${p.id}/gantt`}
            className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            Gantt &amp; S-Curve
          </Link>
          {p.quotation_id && (
            <Link
              href={`/quotations/${p.quotation_id}`}
              className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
            >
              View source quotation
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label="Contracted capacity" value={p.contracted_capacity_kwp ? `${formatNumber(p.contracted_capacity_kwp, 1)} kWp` : "—"} />
        <Kpi label="Annual savings (Yr 1)" value={formatPhp(config?.annual_savings_year1_php)} />
        <Kpi label="Simple payback" value={config?.simple_payback_years ? `${formatNumber(config.simple_payback_years, 1)} yrs` : "—"} />
        {showFinancials ? (
          <Kpi label="Contract value" value={formatPhp(p.contract_value_php)} />
        ) : (
          <Kpi label="Target completion" value={formatDate(p.target_completion_date)} />
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <Card>
              <CardHeader title="Client information" />
              <div className="space-y-3 px-5 py-4 text-sm">
                <div>
                  <p className="font-medium text-neutral-900">{p.customers?.customer_name}</p>
                  {p.customers?.company_name && (
                    <p className="text-xs text-neutral-500">{p.customers.company_name}</p>
                  )}
                </div>
                {p.customers?.billing_address && (
                  <p className="text-xs text-neutral-600">
                    {[p.customers.billing_address, p.customers.city, p.customers.province]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                )}
                {contactList.length > 0 && (
                  <div className="space-y-2 border-t border-black/5 pt-3">
                    {contactList.map((c) => (
                      <div key={c.id}>
                        <p className="text-xs font-medium text-neutral-900">
                          {c.full_name}
                          {c.is_primary && <Badge tone="brand" className="ml-1.5">Primary</Badge>}
                        </p>
                        <p className="text-xs text-neutral-500">
                          {[c.role_title, c.mobile, c.email].filter(Boolean).join(" · ") || "—"}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>

            <Card>
              <CardHeader title="Site information" />
              <div className="space-y-2 px-5 py-4 text-xs text-neutral-600">
                {p.sites ? (
                  <>
                    <p className="text-sm font-medium text-neutral-900">{p.sites.site_name}</p>
                    <p>{[p.sites.address, p.sites.city, p.sites.province].filter(Boolean).join(", ") || "—"}</p>
                    {p.sites.google_maps_url && (
                      <a
                        href={p.sites.google_maps_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-block text-xs text-brand-700 hover:underline"
                      >
                        View on Google Maps ↗
                      </a>
                    )}
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1 border-t border-black/5 pt-2">
                      <span>Roof type: {p.sites.roof_type ?? "—"}</span>
                      <span>Roof material: {p.sites.roof_material ?? "—"}</span>
                      <span>Orientation: {p.sites.roof_orientation_deg ? `${p.sites.roof_orientation_deg}°` : "—"}</span>
                      <span>Tilt: {p.sites.roof_tilt_deg ? `${p.sites.roof_tilt_deg}°` : "—"}</span>
                      <span>Available area: {p.sites.available_area_sqm ? `${formatNumber(p.sites.available_area_sqm, 0)} sqm` : "—"}</span>
                      <span>Utility: {p.sites.distribution_utility ?? "—"}</span>
                      <span>Service entrance: {p.sites.service_entrance ? humanize(p.sites.service_entrance) : "—"}</span>
                      <span>Main breaker: {p.sites.main_breaker_amps ? `${p.sites.main_breaker_amps} A` : "—"}</span>
                    </div>
                    {p.sites.shading_notes && (
                      <p className="border-t border-black/5 pt-2">
                        <span className="font-medium text-neutral-700">Shading notes: </span>
                        {p.sites.shading_notes}
                      </p>
                    )}
                    {p.sites.structural_notes && (
                      <p>
                        <span className="font-medium text-neutral-700">Structural notes: </span>
                        {p.sites.structural_notes}
                      </p>
                    )}
                  </>
                ) : (
                  <p>No site on file for this project.</p>
                )}
              </div>
            </Card>
          </div>

          <Card>
            <CardHeader
              title="Savings &amp; ROI"
              subtitle="From the winning quotation's engineering calculation"
            />
            {config ? (
              <div className="grid grid-cols-2 gap-4 px-5 py-4 text-sm sm:grid-cols-4">
                <MiniStat label="Annual generation" value={config.annual_kwh_year1 ? `${formatNumber(config.annual_kwh_year1, 0)} kWh` : "—"} />
                <MiniStat label="Annual savings (Yr 1)" value={formatPhp(config.annual_savings_year1_php)} />
                <MiniStat label="Simple payback" value={config.simple_payback_years ? `${formatNumber(config.simple_payback_years, 1)} yrs` : "—"} />
                <MiniStat label="ROI" value={formatPct(config.roi_pct)} />
                <MiniStat label="NPV" value={formatPhp(config.npv_php)} />
                <MiniStat label="IRR" value={formatPct(config.irr_pct)} />
                <MiniStat label="CO₂ avoided (Yr 1)" value={config.co2_avoided_kg_year1 ? `${formatNumber(config.co2_avoided_kg_year1 / 1000, 1)} t` : "—"} />
                <MiniStat label="Analysis horizon" value={config.analysis_years ? `${config.analysis_years} yrs` : "—"} />
              </div>
            ) : (
              <div className="px-5 py-6">
                <EmptyState title="No engineering calculation on file for this project" />
              </div>
            )}
          </Card>

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
            <CardHeader
              title="Bill of materials"
              subtitle="Frozen from the winning quotation revision — what to prepare on site"
            />
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-neutral-50 text-xs text-neutral-500">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Description</th>
                    <th className="px-4 py-2.5 font-medium">Qty</th>
                    {showFinancials && <th className="px-4 py-2.5 font-medium">Budget unit cost</th>}
                    {showFinancials && <th className="px-4 py-2.5 font-medium">Budget line cost</th>}
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
                      {showFinancials && <td className="px-4 py-2 tabular-nums">{formatPhp(b.budget_unit_cost_php)}</td>}
                      {showFinancials && <td className="px-4 py-2 tabular-nums">{formatPhp(b.budget_line_cost_php)}</td>}
                    </tr>
                  ))}
                </tbody>
                {showFinancials && (
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

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] text-neutral-400">{label}</p>
      <p className="mt-0.5 font-semibold tabular-nums text-neutral-900">{value}</p>
    </div>
  );
}
