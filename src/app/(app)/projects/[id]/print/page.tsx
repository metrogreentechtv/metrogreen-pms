import Image from "next/image";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatNumber, formatPhp, humanize } from "@/lib/format";
import { PrintButton } from "@/components/quotations/PrintButton";
import type {
  Contact,
  Customer,
  Project,
  ProjectAssignment,
  ProjectBaselineBom,
  ProjectMilestone,
  RevisionConfiguration,
  Site,
} from "@/lib/types";

// A field-packet printout for whoever's executing the job on site — deliberately
// narrower than the in-app project page. Per Joel's spec: no contract value, no
// full Savings & ROI breakdown (NPV/IRR/LCOE/CO2/analysis horizon — see the
// in-app "Savings & ROI" card for those), and the BOM shows MetroGreen's own
// budget cost (what the job costs to build), never a customer-facing selling
// price or margin. Annual savings (Yr 1) and Simple payback are the two
// exceptions explicitly kept — system-performance figures an engineer may
// reference on site, not profit figures. Shown to every role that can open a
// project (no canSeeProjectFinancials gate), since nothing here reveals what
// MetroGreen charges or earns.
export default async function ProjectPrintPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();

  const { data: project } = await supabase
    .from("projects")
    .select("*, customers(*), sites(*)")
    .eq("id", params.id)
    .maybeSingle();
  if (!project) notFound();
  const p = project as Project & { customers: Customer | null; sites: Site | null };

  const [{ data: baseline }, { data: milestones }, { data: assignments }, { data: contacts }, { data: configRow }, { data: settingsRows }] =
    await Promise.all([
      supabase.from("project_baseline_bom").select("*").eq("project_id", p.id).order("line_no"),
      supabase.from("project_milestones").select("*").eq("project_id", p.id).order("sequence_no"),
      supabase.from("project_assignments").select("*, user_profiles(full_name)").eq("project_id", p.id),
      supabase.from("contacts").select("*").eq("customer_id", p.customer_id).order("is_primary", { ascending: false }),
      p.source_revision_id
        ? supabase.from("revision_configurations").select("*").eq("revision_id", p.source_revision_id).maybeSingle()
        : Promise.resolve({ data: null }),
      supabase.from("settings").select("key, value").eq("category", "company"),
    ]);

  const baselineBom = (baseline ?? []) as ProjectBaselineBom[];
  const milestoneList = (milestones ?? []) as ProjectMilestone[];
  const assignmentList = (assignments ?? []) as (ProjectAssignment & {
    user_profiles: { full_name: string } | null;
  })[];
  const contactList = (contacts ?? []) as Contact[];
  const config = configRow as RevisionConfiguration | null;
  const primaryContact = contactList.find((c) => c.is_primary) ?? contactList[0] ?? null;

  // "Assigned engineer" per Joel's field list — anyone whose role on the
  // project mentions "engineer"; falls back to the full team if nobody's
  // role happens to say so, rather than printing a blank line.
  const engineerAssignments = assignmentList.filter((a) =>
    (a.role_on_project ?? "").toLowerCase().includes("engineer")
  );
  const engineersToShow = engineerAssignments.length > 0 ? engineerAssignments : assignmentList;

  const company = new Map<string, unknown>((settingsRows ?? []).map((r) => [r.key, r.value]));
  const s = (key: string) => (company.get(key) as string) || "";

  return (
    <div className="mx-auto max-w-3xl space-y-6 bg-white p-8 text-sm text-neutral-800 shadow-sm print:shadow-none">
      <div className="flex items-start justify-between border-b-2 border-brand-700 pb-6">
        <div className="flex items-start gap-3">
          <div className="relative h-14 w-14 shrink-0">
            <Image src="/logo.png" alt="MetroGreen" fill sizes="56px" className="object-contain" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-brand-800">
              {s("company.legal_name") || "MetroGreen Technologies Corporation"}
            </h1>
            <p className="text-xs text-neutral-500">{s("company.address")}</p>
            <p className="text-xs text-neutral-500">
              {[s("company.mobile") && `Tel: ${s("company.mobile")}`, s("company.email"), s("company.website")]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-wide text-neutral-400">Project Work Order</p>
          <p className="text-base font-semibold">{p.project_no}</p>
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase text-neutral-400">Project</p>
        <p className="text-lg font-semibold text-neutral-900">{p.project_name}</p>
        <p className="text-neutral-600">
          {humanize(p.service_type)} · {humanize(p.system_type)} · {humanize(p.status)}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4 border-y border-neutral-200 py-4">
        <PrintStat
          label="Contracted capacity"
          value={p.contracted_capacity_kwp ? `${formatNumber(p.contracted_capacity_kwp, 1)} kWp` : "—"}
        />
        <PrintStat label="Annual savings (Yr 1)" value={formatPhp(config?.annual_savings_year1_php)} />
        <PrintStat
          label="Simple payback"
          value={config?.simple_payback_years ? `${formatNumber(config.simple_payback_years, 1)} yrs` : "—"}
        />
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase text-neutral-400">Client information</p>
          <p className="font-medium text-neutral-900">{p.customers?.customer_name}</p>
          {p.customers?.company_name && <p className="text-xs text-neutral-500">{p.customers.company_name}</p>}
          {p.customers?.billing_address && (
            <p className="mt-1 text-xs text-neutral-600">
              {[p.customers.billing_address, p.customers.city, p.customers.province].filter(Boolean).join(", ")}
            </p>
          )}
          <p className="mt-2 text-xs font-semibold uppercase text-neutral-400">Contact person</p>
          {primaryContact ? (
            <>
              <p className="text-neutral-900">{primaryContact.full_name}</p>
              <p className="text-xs text-neutral-500">
                {[primaryContact.role_title, primaryContact.mobile, primaryContact.email].filter(Boolean).join(" · ") || "—"}
              </p>
            </>
          ) : (
            <p className="text-xs text-neutral-500">No contact on file.</p>
          )}
        </div>

        <div>
          <p className="mb-1 text-xs font-semibold uppercase text-neutral-400">Site information</p>
          {p.sites ? (
            <>
              <p className="font-medium text-neutral-900">{p.sites.site_name}</p>
              <p className="text-xs text-neutral-600">
                {[p.sites.address, p.sites.city, p.sites.province].filter(Boolean).join(", ") || "—"}
              </p>
              {p.sites.google_maps_url && (
                <p className="text-xs text-brand-700">{p.sites.google_maps_url}</p>
              )}
              <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs text-neutral-600">
                <span>Roof type: {p.sites.roof_type ?? "—"}</span>
                <span>Roof material: {p.sites.roof_material ?? "—"}</span>
                <span>Orientation: {p.sites.roof_orientation_deg ? `${p.sites.roof_orientation_deg}°` : "—"}</span>
                <span>Tilt: {p.sites.roof_tilt_deg ? `${p.sites.roof_tilt_deg}°` : "—"}</span>
                <span>Available area: {p.sites.available_area_sqm ? `${formatNumber(p.sites.available_area_sqm, 0)} sqm` : "—"}</span>
                <span>Utility: {p.sites.distribution_utility ?? "—"}</span>
                <span>Service entrance: {p.sites.service_entrance ? humanize(p.sites.service_entrance) : "—"}</span>
                <span>Main breaker: {p.sites.main_breaker_amps ? `${p.sites.main_breaker_amps} A` : "—"}</span>
              </div>
            </>
          ) : (
            <p className="text-xs text-neutral-500">No site on file.</p>
          )}
        </div>
      </div>

      <div>
        <p className="mb-1 text-xs font-semibold uppercase text-neutral-400">Assigned engineer</p>
        {engineersToShow.length > 0 ? (
          <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-sm">
            {engineersToShow.map((a) => (
              <span key={a.id}>
                {a.user_profiles?.full_name}
                <span className="text-xs text-neutral-500"> ({a.role_on_project})</span>
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs text-neutral-500">Nobody assigned yet.</p>
        )}
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase text-neutral-400">Milestones</p>
        {milestoneList.length > 0 ? (
          <table className="w-full text-left text-xs">
            <thead className="text-neutral-400">
              <tr>
                <th className="py-1 font-medium">#</th>
                <th className="py-1 font-medium">Milestone</th>
                <th className="py-1 font-medium">Planned start</th>
                <th className="py-1 font-medium">Planned end</th>
                <th className="py-1 font-medium">Status</th>
                <th className="py-1 font-medium">Complete</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {milestoneList.map((m) => (
                <tr key={m.id}>
                  <td className="py-1.5">{m.sequence_no}</td>
                  <td className="py-1.5">{m.name}</td>
                  <td className="py-1.5">{formatDate(m.planned_start)}</td>
                  <td className="py-1.5">{formatDate(m.planned_end)}</td>
                  <td className="py-1.5">{humanize(m.status)}</td>
                  <td className="py-1.5 tabular-nums">{m.completion_pct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-xs text-neutral-500">No milestones on file.</p>
        )}
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase text-neutral-400">Bill of materials</p>
        {baselineBom.length > 0 ? (
          <table className="w-full text-left text-xs">
            <thead className="text-neutral-400">
              <tr>
                <th className="py-1 font-medium">Description</th>
                <th className="py-1 font-medium">Qty</th>
                <th className="py-1 font-medium">Budget unit cost</th>
                <th className="py-1 font-medium">Budget line cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {baselineBom.map((b) => (
                <tr key={b.id}>
                  <td className="py-1.5">
                    <p className="font-medium text-neutral-900">{b.description}</p>
                    {(b.manufacturer || b.model) && (
                      <p className="text-neutral-500">{[b.manufacturer, b.model].filter(Boolean).join(" · ")}</p>
                    )}
                  </td>
                  <td className="py-1.5 tabular-nums">
                    {formatNumber(b.budget_quantity)} {b.unit}
                  </td>
                  <td className="py-1.5 tabular-nums">{formatPhp(b.budget_unit_cost_php)}</td>
                  <td className="py-1.5 tabular-nums">{formatPhp(b.budget_line_cost_php)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-xs text-neutral-500">No baseline BOM on file.</p>
        )}
      </div>

      <p className="text-[11px] text-neutral-400">
        For site execution use. Contract value and full financial/ROI figures are intentionally omitted from
        this printout.
      </p>

      <div className="print:hidden">
        <PrintButton />
      </div>
    </div>
  );
}

function PrintStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-lg font-semibold">{value}</p>
      <p className="text-[11px] text-neutral-500">{label}</p>
    </div>
  );
}
