import Image from "next/image";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatNumber, formatPhp, formatPct } from "@/lib/format";
import { PrintButton } from "@/components/quotations/PrintButton";
import { MonthlyGenerationChart } from "@/components/quotations/MonthlyGenerationChart";
import type { Customer, Quotation, QuotationRevision, RevisionConfiguration } from "@/lib/types";

export default async function QuotationRoiPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { rev?: string };
}) {
  const supabase = await createClient();

  const { data: quotation } = await supabase
    .from("quotations")
    .select("*, customers(*)")
    .eq("id", params.id)
    .maybeSingle();
  if (!quotation) notFound();
  const q = quotation as Quotation & { customers: Customer | null };

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

  const [{ data: cfg }, { data: settingsRows }] = await Promise.all([
    supabase.from("revision_configurations").select("*").eq("revision_id", revision.id).single(),
    supabase.from("settings").select("key, value").eq("category", "company"),
  ]);

  const configuration = cfg as RevisionConfiguration;
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
          <p className="text-xs uppercase tracking-wide text-neutral-400">ROI Report</p>
          <p className="text-base font-semibold">{q.quotation_no}</p>
          <p className="text-xs text-neutral-500">
            Rev {String(revision.rev_no).padStart(2, "0")} · {formatDate(revision.quotation_date)}
          </p>
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase text-neutral-400">Customer / Project</p>
        <p className="font-medium">{q.customers?.customer_name}</p>
        <p className="text-neutral-600">{q.project_name}</p>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase text-neutral-400">System</p>
        <div className="grid grid-cols-3 gap-4 rounded-lg border border-neutral-200 p-4 text-center">
          <RoiStat label="DC capacity" value={configuration?.dc_capacity_kwp ? `${formatNumber(configuration.dc_capacity_kwp, 1)} kWp` : "—"} />
          <RoiStat label="Annual generation" value={configuration?.annual_kwh_year1 ? `${formatNumber(configuration.annual_kwh_year1, 0)} kWh` : "—"} />
          <RoiStat label="Analysis period" value={configuration?.analysis_years ? `${configuration.analysis_years} yrs` : "—"} />
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase text-neutral-400">Financial return</p>
        <div className="grid grid-cols-3 gap-4 rounded-lg border border-neutral-200 p-4 text-center">
          <RoiStat label="Year-1 savings" value={formatPhp(configuration?.annual_savings_year1_php)} />
          <RoiStat label="Simple payback" value={configuration?.simple_payback_years ? `${formatNumber(configuration.simple_payback_years, 1)} yrs` : "—"} />
          <RoiStat label="ROI" value={configuration?.roi_pct != null ? formatPct(configuration.roi_pct) : "—"} />
          <RoiStat label="NPV" value={formatPhp(configuration?.npv_php)} />
          <RoiStat label="IRR" value={configuration?.irr_pct != null ? formatPct(configuration.irr_pct) : "—"} />
          <RoiStat label="LCOE" value={configuration?.lcoe_php_per_kwh ? `₱${formatNumber(configuration.lcoe_php_per_kwh, 3)}/kWh` : "—"} />
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase text-neutral-400">Energy &amp; environment</p>
        <div className="grid grid-cols-3 gap-4 rounded-lg border border-neutral-200 p-4 text-center">
          <RoiStat label="Self-consumed / yr" value={configuration?.self_consumed_kwh_year1 ? `${formatNumber(configuration.self_consumed_kwh_year1, 0)} kWh` : "—"} />
          <RoiStat label="Exported / yr" value={configuration?.exported_kwh_year1 ? `${formatNumber(configuration.exported_kwh_year1, 0)} kWh` : "—"} />
          <RoiStat label="CO₂ avoided / yr" value={configuration?.co2_avoided_kg_year1 ? `${formatNumber(configuration.co2_avoided_kg_year1, 0)} kg` : "—"} />
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase text-neutral-400">Estimated generation by month</p>
        <div className="rounded-lg border border-neutral-200">
          <MonthlyGenerationChart monthlyKwh={configuration?.monthly_kwh ?? null} />
        </div>
      </div>

      <p className="text-[11px] text-neutral-400">
        Estimates only, based on the configuration and assumptions on file at the time of printing. Actual
        performance and savings may vary with irradiance, consumption, and utility rates.
      </p>

      <div className="print:hidden">
        <PrintButton />
      </div>
    </div>
  );
}

function RoiStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-lg font-semibold">{value}</p>
      <p className="text-[11px] text-neutral-500">{label}</p>
    </div>
  );
}
