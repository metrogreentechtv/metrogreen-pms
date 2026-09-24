// The "Long Form Proposal" — a separate, longer customer-facing document
// from the existing Proposal tab/print route. Built 2026-09-24 from a
// reference proposal PDF Joel shared, covering (in order): Recommended
// System stats, Your Solution equipment cards, System Performance,
// Environmental Benefits, "How your system works" (net-metering sites
// only), Electricity Bill Savings (net-metering sites only), Net Financial
// Impact, and a Quotation/payment summary.
//
// Known, deliberate differences from the reference PDF:
// - No satellite/roof image — that reference design pulls a Google Maps
//   static image, and this app has no Maps API key configured yet. Deferred
//   rather than faked; revisit once a key is available (see the handoff
//   doc for this feature).
// - The net-metering bill simulation rolls unused export credit over
//   indefinitely and never resets it annually, per Joel's explicit
//   confirmation — the reference PDF's US-style annual reset/cash-out is
//   NOT used here. See src/lib/net-metering-simulator.ts.
// - The "How your system works" diagram and the Electricity Bill Savings
//   section only render when the attached site is net-metering eligible
//   (site.net_metering_eligible), also per Joel's confirmation.
import type { ReactNode } from "react";
import Image from "next/image";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatNumber, formatPhp } from "@/lib/format";
import { PrintButton } from "@/components/quotations/PrintButton";
import { GenerationVsConsumptionChart } from "@/components/quotations/GenerationVsConsumptionChart";
import { CumulativeSavingsChart, AnnualCashFlowChart } from "@/components/quotations/CashFlowCharts";
import { NetMeteringDiagram } from "@/components/quotations/NetMeteringDiagram";
import { buildSolutionCards } from "@/lib/long-form-proposal";
import { computeEnvironmentalEquivalents } from "@/lib/environmental-equivalents";
import { deriveMonthlyConsumptionKwh, simulateNetMeteringBills } from "@/lib/net-metering-simulator";
import type {
  Customer,
  Quotation,
  QuotationRevision,
  RevisionConfiguration,
  RevisionPricing,
  Site,
  SiteConsumption,
  VRevisionBomRow,
  VSiteConsumptionSummary,
} from "@/lib/types";

export default async function LongFormProposalPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { rev?: string };
}) {
  const supabase = await createClient();

  const { data: quotation } = await supabase
    .from("quotations")
    .select("*, customers(*), sites(*)")
    .eq("id", params.id)
    .maybeSingle();
  if (!quotation) notFound();
  const q = quotation as Quotation & { customers: Customer | null; sites: Site | null };

  const { data: revisions } = await supabase
    .from("quotation_revisions")
    .select("*")
    .eq("quotation_id", params.id)
    .order("rev_no", { ascending: false });
  const allRevisions = (revisions ?? []) as QuotationRevision[];
  const revision = searchParams?.rev
    ? allRevisions.find((r) => String(r.rev_no) === searchParams.rev)
    : allRevisions.find((r) => r.is_current) ?? allRevisions[0];
  if (!revision) notFound();

  const site = q.sites as Site | null;

  const [{ data: cfg }, { data: pricing }, { data: bomRows }, { data: settingsRows }, { data: consumptionRows }, { data: summaryRow }] =
    await Promise.all([
      supabase.from("revision_configurations").select("*").eq("revision_id", revision.id).single(),
      supabase.from("revision_pricing").select("*").eq("revision_id", revision.id).single(),
      supabase.from("v_revision_bom").select("*").eq("revision_id", revision.id).order("line_no"),
      supabase.from("settings").select("key, value").eq("category", "company"),
      site
        ? supabase.from("site_consumption").select("*").eq("site_id", site.id)
        : Promise.resolve({ data: [] }),
      site
        ? supabase.from("v_site_consumption_summary").select("*").eq("site_id", site.id).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

  const configuration = cfg as RevisionConfiguration;
  const pricingRow = pricing as RevisionPricing;
  const bom = (bomRows ?? []) as VRevisionBomRow[];
  const consumption = (consumptionRows ?? []) as SiteConsumption[];
  const summary = (summaryRow ?? null) as VSiteConsumptionSummary | null;

  const company = new Map<string, unknown>((settingsRows ?? []).map((r) => [r.key, r.value]));
  const s = (key: string) => (company.get(key) as string) || "";

  // Warranty text for "Your Solution" cards, resolved for BOM lines linked
  // to a catalog item — a free-typed line (no equipment_id) shows none.
  const equipmentIds = Array.from(new Set(bom.map((r) => r.equipment_id).filter((id): id is string => !!id)));
  const { data: equipRows } = equipmentIds.length
    ? await supabase.from("equipment").select("id, warranty_terms").in("id", equipmentIds)
    : { data: [] as { id: string; warranty_terms: string | null }[] };
  const warrantyByEquipmentId = new Map((equipRows ?? []).map((e) => [e.id, e.warranty_terms]));
  const solutionCards = buildSolutionCards(bom, warrantyByEquipmentId);

  const monthlyGenerationKwh = configuration?.monthly_kwh ?? Array(12).fill(0);
  const { values: monthlyConsumptionKwh, source: consumptionSource } = deriveMonthlyConsumptionKwh(
    consumption,
    summary?.annualised_kwh ?? null
  );

  const environmental = computeEnvironmentalEquivalents(configuration?.co2_avoided_kg_year1 ?? 0);

  const netMeteringEligible = !!site?.net_metering_eligible;
  const billSim = netMeteringEligible
    ? simulateNetMeteringBills({
        monthlyGenerationKwh,
        consumption,
        annualConsumptionKwhFallback: summary?.annualised_kwh ?? null,
        retailRatePhpPerKwh: site?.blended_retail_rate_php_kwh ?? 0,
        exportRatePhpPerKwh: site?.net_metering_export_rate_php_kwh ?? null,
      })
    : null;

  const yearlyCashFlowsPhp = ((configuration?.calc_outputs as { yearlyCashFlowsPhp?: number[] } | null)
    ?.yearlyCashFlowsPhp ?? []) as number[];

  const annualKwh = configuration?.annual_kwh_year1 ?? 0;
  const selfConsumedPct = annualKwh ? (configuration?.self_consumed_kwh_year1 ?? 0) / annualKwh : 0;
  const exportedPct = annualKwh ? (configuration?.exported_kwh_year1 ?? 0) / annualKwh : 0;

  return (
    <div className="mx-auto max-w-3xl space-y-8 bg-white p-8 text-sm text-neutral-800 shadow-sm print:shadow-none">
      {/* Header */}
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
          <p className="text-xs uppercase tracking-wide text-neutral-400">Long Form Proposal</p>
          <p className="text-base font-semibold">{q.quotation_no}</p>
          <p className="text-xs text-neutral-500">
            Rev {String(revision.rev_no).padStart(2, "0")} · {formatDate(revision.quotation_date)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div>
          <p className="text-xs font-semibold uppercase text-neutral-400">Prepared for</p>
          <p className="font-medium">{q.customers?.customer_name}</p>
          {q.customers?.company_name && <p>{q.customers.company_name}</p>}
          <p className="text-neutral-600">{q.customers?.billing_address}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase text-neutral-400">Project site</p>
          <p className="font-medium">{q.project_name}</p>
          {site && <p className="text-neutral-600">{site.site_name} — {site.address}</p>}
        </div>
      </div>

      {/* 1. Recommended System */}
      <section className="break-inside-avoid">
        <SectionTitle>Your Recommended System</SectionTitle>
        <div className="grid grid-cols-2 gap-4 rounded-lg border border-neutral-200 p-4 text-center sm:grid-cols-4">
          <BigStat label="System size" value={configuration?.dc_capacity_kwp ? `${formatNumber(configuration.dc_capacity_kwp, 1)} kWp` : "—"} />
          <BigStat label="Est. annual bill savings" value={formatPhp(configuration?.annual_savings_year1_php)} />
          <BigStat label="Total system price (excl. tax)" value={formatPhp(pricingRow?.selling_price_net_php)} />
          <BigStat label="Net system price" value={formatPhp(pricingRow?.total_contract_price_php)} />
        </div>
      </section>

      {/* 2. Your Solution */}
      <section className="break-inside-avoid">
        <SectionTitle>Your Solution</SectionTitle>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {solutionCards.map((card) => (
            <div key={card.categoryName} className="rounded-lg border border-neutral-200 p-3">
              <p className="mb-2 text-xs font-semibold uppercase text-brand-700">{card.categoryName}</p>
              <div className="space-y-2">
                {card.items.map((item, i) => (
                  <div key={i} className="text-xs">
                    <p className="font-medium text-neutral-900">
                      {[item.manufacturer, item.model].filter(Boolean).join(" · ") || item.description}
                    </p>
                    {(item.manufacturer || item.model) && (
                      <p className="text-neutral-500">{item.description}</p>
                    )}
                    <p className="text-neutral-500">
                      Qty: {formatNumber(item.quantity)} {item.unit}
                      {item.warrantyTerms ? ` · Warranty: ${item.warrantyTerms}` : ""}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        {solutionCards.length === 0 && (
          <p className="rounded-lg border border-neutral-200 py-6 text-center text-neutral-400">
            No BOM lines marked to show on the document yet.
          </p>
        )}
      </section>

      {/* 3. System Performance */}
      <section className="break-inside-avoid">
        <SectionTitle>System Performance</SectionTitle>
        <div className="rounded-lg border border-neutral-200 p-4">
          <GenerationVsConsumptionChart generationKwh={monthlyGenerationKwh} consumptionKwh={monthlyConsumptionKwh} />
          <div className="mt-3 grid grid-cols-2 gap-4 border-t border-neutral-100 pt-3 text-center sm:grid-cols-3">
            <BigStat label="Self-consumed" value={annualKwh ? `${formatNumber(selfConsumedPct * 100, 0)}%` : "—"} />
            <BigStat label="Exported to grid" value={annualKwh ? `${formatNumber(exportedPct * 100, 0)}%` : "—"} />
            <BigStat label="Est. annual generation" value={annualKwh ? `${formatNumber(annualKwh, 0)} kWh` : "—"} />
          </div>
          {consumptionSource !== "actual" && (
            <p className="mt-2 text-[10px] text-neutral-400">
              {consumptionSource === "annual-split"
                ? "Monthly consumption pattern estimated as an even split of the site's annual usage — a full 12-month bill history isn't on file yet."
                : "No consumption data on file yet for this site — the chart above shows generation only."}
            </p>
          )}
        </div>
      </section>

      {/* 4. Environmental Benefits */}
      <section className="break-inside-avoid">
        <SectionTitle>Environmental Benefits</SectionTitle>
        <div className="grid grid-cols-2 gap-4 rounded-lg border border-neutral-200 p-4 text-center sm:grid-cols-4">
          <BigStat label="CO₂ avoided / yr" value={`${formatNumber(environmental.co2AvoidedTons, 1)} tons`} />
          <BigStat label="Equivalent to driving" value={`${formatNumber(environmental.carKmAvoided, 0)} km`} />
          <BigStat label="Or planting" value={`${formatNumber(environmental.treesPlantedEquivalent, 0)} trees`} />
          <BigStat label="Or avoiding" value={`${formatNumber(environmental.longHaulFlightsAvoided, 1)} long-haul flights`} />
        </div>
        <p className="mt-2 text-[10px] text-neutral-400">
          Illustrative equivalents based on year-1 estimated CO₂ avoided, using standard published conversion
          factors (not Philippines-specific): ~3,993 km driven and ~16.5 tree seedlings (10-yr growth) per
          metric ton CO₂ (US EPA), and ~1.6 tons CO₂ per long-haul return flight (commonly cited estimate).
        </p>
      </section>

      {/* 5. How your system works — net-metering sites only */}
      {netMeteringEligible && (
        <section className="break-inside-avoid">
          <SectionTitle>How Your System Works</SectionTitle>
          <div className="rounded-lg border border-neutral-200 p-4">
            <NetMeteringDiagram />
          </div>
        </section>
      )}

      {/* 6. Electricity Bill Savings — net-metering sites only */}
      {netMeteringEligible && billSim && (
        <section className="break-inside-avoid">
          <SectionTitle>Electricity Bill Savings</SectionTitle>
          <div className="rounded-lg border border-neutral-200 p-4 space-y-4">
            <BillSavingsChart rows={billSim.rows} />
            <CumulativeBillSavingsChart rows={billSim.rows} />
            <table className="w-full border-collapse text-[10px]">
              <thead>
                <tr className="border-b border-neutral-300 text-left text-neutral-500">
                  <th className="py-1 pr-2">Month</th>
                  <th className="py-1 pr-2 text-right">Generated</th>
                  <th className="py-1 pr-2 text-right">Consumed</th>
                  <th className="py-1 pr-2 text-right">Bill before solar</th>
                  <th className="py-1 pr-2 text-right">Bill after solar</th>
                  <th className="py-1 pr-2 text-right">Credit balance</th>
                  <th className="py-1 text-right">Savings</th>
                </tr>
              </thead>
              <tbody>
                {billSim.rows.map((r) => (
                  <tr key={r.monthIndex} className="border-b border-neutral-100">
                    <td className="py-1 pr-2">{r.monthLabel}</td>
                    <td className="py-1 pr-2 text-right">{formatNumber(r.generationKwh, 0)} kWh</td>
                    <td className="py-1 pr-2 text-right">{formatNumber(r.consumptionKwh, 0)} kWh</td>
                    <td className="py-1 pr-2 text-right">{formatPhp(r.billBeforeSolarPhp)}</td>
                    <td className="py-1 pr-2 text-right font-medium">{formatPhp(r.billAfterSolarPhp)}</td>
                    <td className="py-1 pr-2 text-right">{formatPhp(r.cumulativeCreditPhp)}</td>
                    <td className="py-1 text-right text-emerald-700">{formatPhp(r.savingsPhp)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t border-neutral-300 font-semibold">
                <tr>
                  <td className="py-1.5 pr-2">Year 1 total</td>
                  <td className="py-1.5 pr-2" />
                  <td className="py-1.5 pr-2" />
                  <td className="py-1.5 pr-2 text-right">{formatPhp(billSim.totalBillBeforeSolarPhp)}</td>
                  <td className="py-1.5 pr-2 text-right">{formatPhp(billSim.totalBillAfterSolarPhp)}</td>
                  <td className="py-1.5 pr-2 text-right">{formatPhp(billSim.endingCumulativeCreditPhp)}</td>
                  <td className="py-1.5 text-right text-emerald-700">{formatPhp(billSim.totalSavingsPhp)}</td>
                </tr>
              </tfoot>
            </table>
            <p className="text-[10px] text-neutral-400">
              Simulated from year-1 estimated monthly generation against the site&apos;s billed/entered monthly
              consumption (or an even split of its annual usage where a full 12-month history isn&apos;t on
              file). Net export credit rolls over month to month and does not reset at year-end.
              {consumptionSource !== "actual" &&
                (consumptionSource === "annual-split"
                  ? " Monthly consumption pattern estimated — a full 12-month bill history isn't on file yet."
                  : " No consumption data on file yet — bill-before-solar figures are not meaningful until usage is entered.")}
            </p>
          </div>
        </section>
      )}

      {/* 7. Net Financial Impact */}
      <section className="break-inside-avoid">
        <SectionTitle>Net Financial Impact</SectionTitle>
        <div className="rounded-lg border border-neutral-200 p-4 space-y-6">
          <CumulativeSavingsChart yearlyCashFlowsPhp={yearlyCashFlowsPhp} />
          <AnnualCashFlowChart yearlyCashFlowsPhp={yearlyCashFlowsPhp} />
          <div className="grid grid-cols-2 gap-4 border-t border-neutral-100 pt-3 text-center sm:grid-cols-4">
            <BigStat label="Simple payback" value={configuration?.simple_payback_years ? `${formatNumber(configuration.simple_payback_years, 1)} yrs` : "—"} />
            <BigStat label="ROI" value={configuration?.roi_pct != null ? `${formatNumber(configuration.roi_pct * 100, 1)}%` : "—"} />
            <BigStat label="NPV" value={formatPhp(configuration?.npv_php)} />
            <BigStat label="Analysis period" value={configuration?.analysis_years ? `${configuration.analysis_years} yrs` : "—"} />
          </div>
        </div>
      </section>

      {/* 8. Quotation / payment summary */}
      <section className="break-inside-avoid">
        <SectionTitle>Quotation Summary</SectionTitle>
        <div className="rounded-lg border border-neutral-200 p-4">
          <div className="flex justify-end">
            <div className="w-64 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-neutral-500">Total system price (excl. tax)</span>
                <span>{formatPhp(pricingRow?.selling_price_net_php)}</span>
              </div>
              {!!pricingRow?.discount_php && (
                <div className="flex justify-between">
                  <span className="text-neutral-500">Discount</span>
                  <span>-{formatPhp(pricingRow.discount_php)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-neutral-500">VAT ({formatNumber((pricingRow?.vat_rate ?? 0) * 100, 0)}%)</span>
                <span>{formatPhp(pricingRow?.vat_amount_php)}</span>
              </div>
              <div className="flex justify-between border-t border-neutral-300 pt-1 text-base font-semibold">
                <span>Net system price</span>
                <span>{formatPhp(pricingRow?.total_contract_price_php)}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-4 space-y-4">
          {revision.payment_terms && <DocSection title="Payment terms" text={revision.payment_terms} />}
          {revision.delivery_timeline && <DocSection title="Delivery timeline" text={revision.delivery_timeline} />}
          {revision.warranty_terms && <DocSection title="Warranty" text={revision.warranty_terms} />}
          {revision.net_metering_note && <DocSection title="Net metering" text={revision.net_metering_note} />}
          {revision.terms_conditions && <DocSection title="Terms and conditions" text={revision.terms_conditions} />}
        </div>
      </section>

      <div className="grid grid-cols-3 gap-6 border-t border-neutral-200 pt-8 text-center text-xs">
        <Signatory label="Prepared by" />
        <Signatory label="Reviewed by" />
        <Signatory label="Approved by" />
      </div>

      <p className="text-[10px] text-neutral-400">
        Estimates only, based on the configuration and assumptions on file at the time of printing. Actual
        performance, consumption, and savings may vary with irradiance, weather, household usage, and utility
        rates.
      </p>

      <div className="print:hidden">
        <PrintButton />
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-brand-800">{children}</h2>;
}

function BigStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-lg font-semibold">{value}</p>
      <p className="text-[11px] text-neutral-500">{label}</p>
    </div>
  );
}

function DocSection({ title, text }: { title: string; text: string }) {
  return (
    <div>
      <p className="mb-1 text-xs font-semibold uppercase text-neutral-400">{title}</p>
      <p className="whitespace-pre-line text-neutral-700">{text}</p>
    </div>
  );
}

function Signatory({ label }: { label: string }) {
  return (
    <div>
      <div className="mb-8 h-8" />
      <p className="border-t border-neutral-400 pt-1 font-medium">&nbsp;</p>
      <p className="text-neutral-500">{label}</p>
    </div>
  );
}

function BillSavingsChart({ rows }: { rows: { monthLabel: string; savingsPhp: number }[] }) {
  const width = 600;
  const height = 140;
  const gap = 8;
  const barWidth = (width - gap * 11) / 12;
  const max = Math.max(...rows.map((r) => r.savingsPhp), 1);
  const min = Math.min(...rows.map((r) => r.savingsPhp), 0);
  const range = Math.max(max - min, 1);
  const zeroY = height - ((0 - min) / range) * height;

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height + 20}`} className="w-full" role="img" aria-label="First year monthly bill savings">
        <line x1={0} y1={zeroY} x2={width} y2={zeroY} className="stroke-neutral-300" strokeWidth={1} />
        {rows.map((r, i) => {
          const x = i * (barWidth + gap);
          const barHeight = (Math.abs(r.savingsPhp) / range) * height;
          const y = r.savingsPhp >= 0 ? zeroY - barHeight : zeroY;
          return (
            <g key={r.monthLabel}>
              <title>
                {r.monthLabel}: {formatPhp(r.savingsPhp)}
              </title>
              <rect x={x} y={y} width={barWidth} height={Math.max(barHeight, 1)} rx={2} className={r.savingsPhp >= 0 ? "fill-emerald-500" : "fill-red-400"} />
              <text x={x + barWidth / 2} y={height + 14} textAnchor="middle" className="fill-neutral-500" style={{ fontSize: 9 }}>
                {r.monthLabel}
              </text>
            </g>
          );
        })}
      </svg>
      <p className="mt-1 text-center text-xs text-neutral-400">First-year monthly bill savings</p>
    </div>
  );
}

function CumulativeBillSavingsChart({ rows }: { rows: { monthLabel: string; savingsPhp: number }[] }) {
  let running = 0;
  const points = rows.map((r) => {
    running += r.savingsPhp;
    return { monthLabel: r.monthLabel, cumulative: running };
  });
  const width = 600;
  const height = 120;
  const max = Math.max(...points.map((p) => p.cumulative), 1);
  const n = points.length;
  const stepX = width / (n - 1);

  const pathD = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${(i * stepX).toFixed(1)} ${(height - (p.cumulative / max) * height).toFixed(1)}`)
    .join(" ");

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height + 20}`} className="w-full" role="img" aria-label="Cumulative bill savings, first year">
        <path d={pathD} fill="none" className="stroke-emerald-600" strokeWidth={2} />
        {points.map((p, i) => (
          <g key={p.monthLabel}>
            <circle cx={i * stepX} cy={height - (p.cumulative / max) * height} r={2.5} className="fill-emerald-600" />
            <title>
              {p.monthLabel}: {formatPhp(p.cumulative)} cumulative
            </title>
            <text x={i * stepX} y={height + 14} textAnchor="middle" className="fill-neutral-500" style={{ fontSize: 9 }}>
              {p.monthLabel}
            </text>
          </g>
        ))}
      </svg>
      <p className="mt-1 text-center text-xs text-neutral-400">
        Cumulative bill savings, first year: {formatPhp(points[points.length - 1]?.cumulative ?? 0)}
      </p>
    </div>
  );
}
