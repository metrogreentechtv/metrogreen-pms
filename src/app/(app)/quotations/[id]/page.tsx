import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import { canApprove, canEditBom, canSeeCost, canWrite } from "@/lib/roles";
import { Badge, Card, CardHeader, LinkButton } from "@/components/ui";
import { QuotationStatusBadge } from "@/components/quotations/StatusBadge";
import { RevisionTimeline } from "@/components/quotations/RevisionTimeline";
import { StatusActions } from "@/components/quotations/StatusActions";
import { BomTable } from "@/components/quotations/BomTable";
import { BomLineForm } from "@/components/quotations/BomLineForm";
import { AddAncillaryServiceForm } from "@/components/quotations/AddAncillaryServiceForm";
import { ApplyTemplatePanel } from "@/components/quotations/ApplyTemplatePanel";
import { QuotationTabs } from "@/components/quotations/QuotationTabs";
import { LoadSizingPanel } from "@/components/quotations/LoadSizingPanel";
import { fetchSiteBillsWithUrls } from "@/lib/site-bills";
import { RoiPanel } from "@/components/quotations/RoiPanel";
import { ProposalPanel } from "@/components/quotations/ProposalPanel";
import {
  ConfigurationForm,
  CostingForm,
  PricingForm,
  RevisionHeaderForm,
} from "@/components/quotations/RevisionForms";
import { formatNumber, formatPhp } from "@/lib/format";
import type {
  AncillaryService,
  BomTemplate,
  BomTemplateLine,
  Customer,
  Equipment,
  EquipmentCategory,
  EquipmentCurrentPriceView,
  MountingType,
  Quotation,
  QuotationRevision,
  RevisionConfiguration,
  RevisionCosting,
  RevisionMargin,
  RevisionPricing,
  RevisionStatusHistory,
  Site,
  SiteConsumption,
  Supplier,
  VRevisionBomRow,
  VSiteConsumptionSummary,
} from "@/lib/types";
import {
  addAncillaryServiceLine,
  addBomLine,
  addSiteConsumption,
  applyBomTemplate,
  changeStatus,
  createProjectFromRevision,
  createRevision,
  deleteBomLine,
  deleteSiteConsumption,
  overrideMargin,
  recalculateEngineering,
  updateBomLineProposalGroup,
  updateConfiguration,
  updateCosting,
  updatePricing,
  updateRevisionHeader,
  updateSiteSizing,
} from "../actions";

export default async function QuotationDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { rev?: string };
}) {
  const supabase = await createClient();
  const user = await getCurrentUser();
  const roles = user?.roles ?? [];

  const [{ data: quotation }, { data: revisions }] = await Promise.all([
    supabase.from("quotations").select("*, customers(*)").eq("id", params.id).maybeSingle(),
    supabase
      .from("quotation_revisions")
      .select("*")
      .eq("quotation_id", params.id)
      .order("rev_no", { ascending: false }),
  ]);

  if (!quotation) notFound();

  const q = quotation as Quotation & { customers: Customer | null };
  const allRevisions = (revisions ?? []) as QuotationRevision[];

  const selectedRevision = searchParams?.rev
    ? allRevisions.find((r) => String(r.rev_no) === searchParams.rev)
    : allRevisions.find((r) => r.is_current) ?? allRevisions[0];

  if (!selectedRevision) notFound();

  const [
    { data: cfg },
    { data: costing },
    { data: margin },
    { data: pricing },
    { data: bomRows },
    { data: statusHistory },
    { data: categories },
    { data: equipment },
    { data: suppliers },
    { data: projectRow },
    { data: salesName },
    { data: engineerName },
    { data: site },
    { data: bankRows },
    { data: templateRows },
    { data: mountingTypeRows },
    { data: ancillaryServiceRows },
  ] = await Promise.all([
    supabase.from("revision_configurations").select("*").eq("revision_id", selectedRevision.id).single(),
    supabase.from("revision_costing").select("*").eq("revision_id", selectedRevision.id).single(),
    supabase.from("revision_margin").select("*").eq("revision_id", selectedRevision.id).maybeSingle(),
    supabase.from("revision_pricing").select("*").eq("revision_id", selectedRevision.id).single(),
    supabase
      .from("v_revision_bom")
      .select("*")
      .eq("revision_id", selectedRevision.id)
      .order("line_no"),
    supabase
      .from("revision_status_history")
      .select("*")
      .eq("revision_id", selectedRevision.id)
      .order("changed_at", { ascending: false }),
    supabase.from("equipment_categories").select("*").eq("is_active", true).order("sort_order"),
    supabase.from("v_equipment_current_price").select("*").eq("is_active", true).order("description"),
    supabase.from("suppliers").select("*").eq("is_active", true).order("name"),
    supabase.from("projects").select("id").eq("source_revision_id", selectedRevision.id).maybeSingle(),
    q.assigned_sales_id
      ? supabase.from("user_profiles").select("full_name").eq("id", q.assigned_sales_id).maybeSingle()
      : Promise.resolve({ data: null }),
    q.assigned_engineer_id
      ? supabase.from("user_profiles").select("full_name").eq("id", q.assigned_engineer_id).maybeSingle()
      : Promise.resolve({ data: null }),
    q.site_id
      ? supabase.from("sites").select("*").eq("id", q.site_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("settings")
      .select("key, value")
      .in("key", [
        "company.bank_name",
        "company.bank_account_name",
        "company.bank_account_number",
        "company.bank_branch",
      ]),
    supabase
      .from("bom_templates")
      .select("*, bom_template_lines(*)")
      .eq("is_active", true)
      .order("system_size_kwp"),
    supabase.from("mounting_types").select("*").eq("is_active", true).order("sort_order"),
    supabase.from("ancillary_services").select("*").eq("is_active", true).order("sort_order"),
  ]);

  const configuration = cfg as RevisionConfiguration;
  const costingRow = costing as RevisionCosting;
  const marginRow = (margin ?? null) as RevisionMargin | null;
  const pricingRow = pricing as RevisionPricing;
  const bom = (bomRows ?? []) as VRevisionBomRow[];
  const history = (statusHistory ?? []) as RevisionStatusHistory[];
  const equipmentList = (equipment ?? []) as EquipmentCurrentPriceView[];
  const categoryList = (categories ?? []) as EquipmentCategory[];
  const supplierList = (suppliers ?? []) as Supplier[];
  const siteRow = (site ?? null) as Site | null;
  const templateList = (templateRows ?? []) as (BomTemplate & { bom_template_lines: BomTemplateLine[] })[];
  const mountingTypes = (mountingTypeRows ?? []) as MountingType[];
  const ancillaryServices = (ancillaryServiceRows ?? []) as AncillaryService[];

  const bankMap = new Map<string, unknown>((bankRows ?? []).map((r) => [r.key, r.value]));
  const bankValue = (key: string) => (bankMap.get(key) as string) || "";

  const [{ data: consumptionRows }, { data: summaryRow }] = siteRow
    ? await Promise.all([
        supabase
          .from("site_consumption")
          .select("*")
          .eq("site_id", siteRow.id)
          .order("period_year", { ascending: false })
          .order("period_month", { ascending: false }),
        supabase.from("v_site_consumption_summary").select("*").eq("site_id", siteRow.id).maybeSingle(),
      ])
    : [{ data: [] }, { data: null }];

  const consumption = (consumptionRows ?? []) as SiteConsumption[];
  const summary = (summaryRow ?? null) as VSiteConsumptionSummary | null;
  const siteBills = siteRow ? await fetchSiteBillsWithUrls(supabase, siteRow.id) : [];

  const showCost = canSeeCost(roles);
  const isCurrentRevision = selectedRevision.is_current;
  const isDraft = selectedRevision.status === "draft";
  const bomEditable = isCurrentRevision && isDraft && canEditBom(roles);
  const costingEditable = isCurrentRevision && isDraft && showCost;

  const boundChangeStatus = changeStatus.bind(null, q.id, selectedRevision.id);
  const boundOverrideMargin = overrideMargin.bind(null, q.id, selectedRevision.id);
  const boundCreateRevision = createRevision.bind(null, q.id);
  const boundCreateProject = createProjectFromRevision.bind(null, q.id, selectedRevision.id);
  const boundUpdateConfig = updateConfiguration.bind(null, q.id, selectedRevision.id);
  const boundRecalc = recalculateEngineering.bind(null, q.id, selectedRevision.id);
  const boundUpdateCosting = updateCosting.bind(null, q.id, selectedRevision.id);
  const boundUpdatePricing = updatePricing.bind(null, q.id, selectedRevision.id);
  const boundUpdateHeader = updateRevisionHeader.bind(null, q.id, selectedRevision.id);
  const boundAddBomLine = addBomLine.bind(null, q.id, selectedRevision.id);
  const boundAddAncillaryService = addAncillaryServiceLine.bind(null, q.id, selectedRevision.id);
  const boundApplyTemplate = applyBomTemplate.bind(null, q.id, selectedRevision.id);
  const boundDeleteBomLine = deleteBomLine.bind(null, q.id);
  const boundUpdateGroup = updateBomLineProposalGroup.bind(null, q.id);
  const boundSiteSizing = siteRow ? updateSiteSizing.bind(null, q.id, siteRow.id) : async () => {};
  const boundAddConsumption = siteRow ? addSiteConsumption.bind(null, q.id, siteRow.id) : async () => {};
  const boundDeleteConsumption = deleteSiteConsumption.bind(null, q.id);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-brand-600">
            {q.quotation_no} · Rev {String(selectedRevision.rev_no).padStart(2, "0")}
          </p>
          <h1 className="text-xl font-semibold text-neutral-900">{q.project_name}</h1>
          <p className="text-sm text-neutral-500">
            <Link href={`/customers/${q.customers?.id}`} className="text-brand-700 hover:underline">
              {q.customers?.customer_name}
            </Link>
            {" · "}
            {q.service_type.replace(/_/g, " ")} · {q.system_type.replace(/_/g, " ")}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <QuotationStatusBadge status={selectedRevision.status} />
            {salesName?.full_name && <Badge tone="neutral">Sales: {salesName.full_name}</Badge>}
            {engineerName?.full_name && <Badge tone="neutral">Engineer: {engineerName.full_name}</Badge>}
          </div>
        </div>
        <LinkButton href={`/quotations/${q.id}/document`} variant="secondary">
          View document
        </LinkButton>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label="System size" value={configuration?.dc_capacity_kwp ? `${formatNumber(configuration.dc_capacity_kwp, 1)} kWp` : "—"} />
        <Kpi label="Annual generation" value={configuration?.annual_kwh_year1 ? `${formatNumber(configuration.annual_kwh_year1, 0)} kWh` : "—"} />
        <Kpi label="Simple payback" value={configuration?.simple_payback_years ? `${formatNumber(configuration.simple_payback_years, 1)} yrs` : "—"} />
        <Kpi label="Contract price" value={formatPhp(pricingRow?.total_contract_price_php)} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <QuotationTabs
            load={
              <LoadSizingPanel
                site={siteRow}
                siteBills={siteBills}
                customerId={q.customers?.id ?? null}
                consumption={consumption}
                summary={summary}
                cfg={configuration}
                editable={bomEditable}
                siteSizingAction={boundSiteSizing}
                criticalLoadAction={boundUpdateConfig}
                addConsumptionAction={boundAddConsumption}
                deleteConsumptionAction={boundDeleteConsumption}
              />
            }
            design={
              <ConfigurationForm
                cfg={configuration}
                mountingTypes={mountingTypes}
                editable={bomEditable}
                action={boundUpdateConfig}
                recalcAction={boundRecalc}
              />
            }
            boq={
              <Card>
                <CardHeader title="Bill of materials" subtitle={`${bom.length} line(s)`} />
                <BomTable
                  rows={bom}
                  showCost={showCost}
                  deleteAction={bomEditable ? boundDeleteBomLine : undefined}
                  updateGroupAction={bomEditable ? boundUpdateGroup : undefined}
                />
                {bomEditable && (
                  <details className="border-t border-black/5 px-5 py-4">
                    <summary className="cursor-pointer text-sm font-medium text-brand-700">
                      + Apply standard BOM template
                    </summary>
                    <div className="mt-4">
                      <ApplyTemplatePanel
                        templates={templateList}
                        equipment={equipmentList}
                        action={boundApplyTemplate}
                      />
                    </div>
                  </details>
                )}
                {bomEditable && (
                  <details className="border-t border-black/5 px-5 py-4">
                    <summary className="cursor-pointer text-sm font-medium text-brand-700">+ Add BOM line</summary>
                    <div className="mt-4">
                      <BomLineForm
                        categories={categoryList}
                        equipment={equipmentList}
                        suppliers={supplierList}
                        action={boundAddBomLine}
                      />
                    </div>
                  </details>
                )}
                {bomEditable && (
                  <details className="border-t border-black/5 px-5 py-4">
                    <summary className="cursor-pointer text-sm font-medium text-brand-700">
                      + Add ancillary service
                    </summary>
                    <div className="mt-4">
                      <AddAncillaryServiceForm
                        services={ancillaryServices}
                        action={boundAddAncillaryService}
                      />
                    </div>
                  </details>
                )}
              </Card>
            }
            pricing={
              <div className="space-y-6">
                <CostingForm costing={costingRow} editable={costingEditable} action={boundUpdateCosting} />
                <PricingForm pricing={pricingRow} editable={costingEditable} action={boundUpdatePricing} />
                <RevisionHeaderForm revision={selectedRevision} action={boundUpdateHeader} />
              </div>
            }
            roi={
              <RoiPanel cfg={configuration} quotationId={q.id} editable={bomEditable} recalcAction={boundRecalc} />
            }
            proposal={
              <ProposalPanel
                bom={bom}
                quotationId={q.id}
                bankName={bankValue("company.bank_name")}
                bankAccountName={bankValue("company.bank_account_name")}
                bankAccountNumber={bankValue("company.bank_account_number")}
                bankBranch={bankValue("company.bank_branch")}
              />
            }
          />
        </div>

        <div className="space-y-6">
          <StatusActions
            status={selectedRevision.status}
            isCurrentRevision={isCurrentRevision}
            canApprove={canApprove(roles)}
            canWrite={canWrite(roles)}
            marginCompliant={marginRow?.margin_compliant ?? null}
            marginOverridden={!!marginRow?.margin_override_at}
            changeStatusAction={boundChangeStatus}
            overrideMarginAction={boundOverrideMargin}
            createRevisionAction={boundCreateRevision}
            createProjectAction={boundCreateProject}
            projectExists={!!projectRow}
          />
          {projectRow && (
            <Card className="px-5 py-4">
              <LinkButton href={`/projects/${projectRow.id}`} variant="secondary" className="w-full justify-center">
                View project
              </LinkButton>
            </Card>
          )}
          <RevisionTimeline
            quotationId={q.id}
            revisions={allRevisions}
            currentRevisionId={q.current_revision_id}
            selectedRevNo={selectedRevision.rev_no}
            statusHistory={history}
          />
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
