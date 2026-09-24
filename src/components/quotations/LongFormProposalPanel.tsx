import { Badge, Card, CardHeader, LinkButton } from "@/components/ui";
import { Stat } from "@/components/quotations/RevisionForms";
import { formatNumber, formatPhp } from "@/lib/format";
import type { RevisionConfiguration, RevisionPricing, Site, VRevisionBomRow } from "@/lib/types";

export function LongFormProposalPanel({
  cfg,
  pricing,
  site,
  bom,
  quotationId,
}: {
  cfg: RevisionConfiguration;
  pricing: RevisionPricing;
  site: Site | null;
  bom: VRevisionBomRow[];
  quotationId: string;
}) {
  const netMeteringEligible = !!site?.net_metering_eligible;
  const solutionCategoryCount = new Set(bom.filter((r) => r.show_on_document).map((r) => r.category_name)).size;

  return (
    <Card>
      <CardHeader
        title="Long Form Proposal"
        subtitle="The full customer-facing proposal — recommended system, equipment, performance, environmental benefits, savings, and financial impact, in one printable document"
        action={
          netMeteringEligible ? (
            <Badge tone="blue">Net-metering illustration included</Badge>
          ) : (
            <Badge tone="neutral">No net-metering illustration (site not marked eligible)</Badge>
          )
        }
      />
      <div className="grid grid-cols-2 gap-4 px-5 py-5 sm:grid-cols-4">
        <Stat label="System size" value={cfg?.dc_capacity_kwp ? `${formatNumber(cfg.dc_capacity_kwp, 1)} kWp` : "—"} />
        <Stat label="Annual bill savings" value={formatPhp(cfg?.annual_savings_year1_php)} />
        <Stat label="Total price (excl. tax)" value={formatPhp(pricing?.selling_price_net_php)} />
        <Stat label="Net system price" value={formatPhp(pricing?.total_contract_price_php)} />
        <Stat label="Equipment categories shown" value={String(solutionCategoryCount)} />
        <Stat label="Simple payback" value={cfg?.simple_payback_years ? `${formatNumber(cfg.simple_payback_years, 1)} yrs` : "—"} />
      </div>
      {!netMeteringEligible && (
        <p className="border-t border-black/5 px-5 py-3 text-xs text-neutral-500">
          The &ldquo;How your system works&rdquo; diagram and the monthly Electricity Bill Savings table/charts
          only appear when the attached site is marked net-metering eligible (Customer → site → edit).
        </p>
      )}
      <div className="flex justify-end border-t border-black/5 px-5 py-4">
        <LinkButton href={`/quotations/${quotationId}/long-form-proposal`} variant="secondary">
          Print long form proposal
        </LinkButton>
      </div>
    </Card>
  );
}
