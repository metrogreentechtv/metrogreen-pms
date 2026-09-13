import Image from "next/image";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatNumber, formatPhp } from "@/lib/format";
import { PrintButton } from "@/components/quotations/PrintButton";
import { buildProposalLines } from "@/lib/proposal-bom";
import type {
  Customer,
  Quotation,
  QuotationRevision,
  RevisionConfiguration,
  RevisionPricing,
  Site,
  VRevisionBomRow,
} from "@/lib/types";

export default async function QuotationProposalPage({
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

  const [{ data: cfg }, { data: pricing }, { data: bomRows }, { data: settingsRows }] = await Promise.all([
    supabase.from("revision_configurations").select("*").eq("revision_id", revision.id).single(),
    supabase.from("revision_pricing").select("*").eq("revision_id", revision.id).single(),
    supabase.from("v_revision_bom").select("*").eq("revision_id", revision.id).order("line_no"),
    supabase.from("settings").select("key, value").eq("category", "company"),
  ]);

  const configuration = cfg as RevisionConfiguration;
  const pricingRow = pricing as RevisionPricing;
  const bom = (bomRows ?? []) as VRevisionBomRow[];
  const lines = buildProposalLines(bom);
  const lineTotal = lines.reduce((a, l) => a + l.selling_line_total_php, 0);

  const company = new Map<string, unknown>((settingsRows ?? []).map((r) => [r.key, r.value]));
  const s = (key: string) => (company.get(key) as string) || "";
  const hasBankDetails = !!(s("company.bank_name") || s("company.bank_account_name") || s("company.bank_account_number"));

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
          <p className="text-xs uppercase tracking-wide text-neutral-400">Proposal</p>
          <p className="text-base font-semibold">{q.quotation_no}</p>
          <p className="text-xs text-neutral-500">
            Rev {String(revision.rev_no).padStart(2, "0")} · {formatDate(revision.quotation_date)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div>
          <p className="text-xs font-semibold uppercase text-neutral-400">Customer</p>
          <p className="font-medium">{q.customers?.customer_name}</p>
          {q.customers?.company_name && <p>{q.customers.company_name}</p>}
          <p className="text-neutral-600">{q.customers?.billing_address}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase text-neutral-400">Project</p>
          <p className="font-medium">{q.project_name}</p>
          {q.sites && <p className="text-neutral-600">{q.sites.site_name} — {q.sites.address}</p>}
          <p className="text-neutral-600">
            {q.service_type.replace(/_/g, " ")} · {q.system_type.replace(/_/g, " ")}
          </p>
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase text-neutral-400">System summary</p>
        <div className="grid grid-cols-4 gap-4 rounded-lg border border-neutral-200 p-4 text-center">
          <div>
            <p className="text-lg font-semibold">{formatNumber(configuration?.dc_capacity_kwp, 1)}</p>
            <p className="text-[11px] text-neutral-500">kWp DC capacity</p>
          </div>
          <div>
            <p className="text-lg font-semibold">{formatNumber(configuration?.annual_kwh_year1, 0)}</p>
            <p className="text-[11px] text-neutral-500">kWh / year (est.)</p>
          </div>
          <div>
            <p className="text-lg font-semibold">{formatPhp(configuration?.annual_savings_year1_php)}</p>
            <p className="text-[11px] text-neutral-500">Year-1 savings (est.)</p>
          </div>
          <div>
            <p className="text-lg font-semibold">
              {configuration?.simple_payback_years ? `${formatNumber(configuration.simple_payback_years, 1)} yrs` : "—"}
            </p>
            <p className="text-[11px] text-neutral-500">Simple payback (est.)</p>
          </div>
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase text-neutral-400">Bill of materials</p>
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="border-b border-neutral-300 text-left text-neutral-500">
              <th className="py-1.5 pr-2">Item</th>
              <th className="py-1.5 pr-2">Description</th>
              <th className="py-1.5 pr-2">Qty</th>
              <th className="py-1.5 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l, i) => (
              <tr key={i} className="border-b border-neutral-100">
                <td className="py-1.5 pr-2 text-neutral-500">{l.groupLabel}</td>
                <td className="py-1.5 pr-2">
                  <p className="font-medium">{l.description}</p>
                  {l.mode === "itemized" && (l.manufacturer || l.model) && (
                    <p className="text-neutral-500">{[l.manufacturer, l.model].filter(Boolean).join(" · ")}</p>
                  )}
                </td>
                <td className="py-1.5 pr-2">
                  {formatNumber(l.quantity)} {l.unit}
                </td>
                <td className="py-1.5 text-right font-medium">{formatPhp(l.selling_line_total_php)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {lines.length === 0 && (
          <p className="py-4 text-center text-neutral-400">No lines tagged for the Proposal.</p>
        )}

        <div className="mt-3 flex justify-end">
          <div className="w-56 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-neutral-500">Proposal BOM total</span>
              <span>{formatPhp(lineTotal)}</span>
            </div>
            <div className="flex justify-between border-t border-neutral-300 pt-1 text-base font-semibold">
              <span>Total contract price</span>
              <span>{formatPhp(pricingRow?.total_contract_price_php)}</span>
            </div>
          </div>
        </div>
      </div>

      {revision.scope_of_work && <DocSection title="Scope of work" text={revision.scope_of_work} />}
      {revision.inclusions && <DocSection title="Inclusions" text={revision.inclusions} />}
      {revision.exclusions && <DocSection title="Exclusions" text={revision.exclusions} />}
      {revision.payment_terms && <DocSection title="Payment terms" text={revision.payment_terms} />}
      {revision.delivery_timeline && <DocSection title="Delivery timeline" text={revision.delivery_timeline} />}
      {revision.warranty_terms && <DocSection title="Warranty" text={revision.warranty_terms} />}
      {revision.net_metering_note && <DocSection title="Net metering" text={revision.net_metering_note} />}
      {revision.terms_conditions && <DocSection title="Terms and conditions" text={revision.terms_conditions} />}

      {hasBankDetails && (
        <div>
          <p className="mb-1 text-xs font-semibold uppercase text-neutral-400">Bank details</p>
          <p className="text-neutral-700">
            {[
              s("company.bank_name"),
              s("company.bank_account_name") && `Account name: ${s("company.bank_account_name")}`,
              s("company.bank_account_number") && `Account #: ${s("company.bank_account_number")}`,
              s("company.bank_branch") && `Branch: ${s("company.bank_branch")}`,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
      )}

      <div className="grid grid-cols-3 gap-6 border-t border-neutral-200 pt-8 text-center text-xs">
        <Signatory label="Prepared by" />
        <Signatory label="Reviewed by" />
        <Signatory label="Approved by" />
      </div>

      <div className="print:hidden">
        <PrintButton />
      </div>
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
