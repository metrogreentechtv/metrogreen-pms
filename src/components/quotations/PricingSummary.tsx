import { Badge, Card, CardHeader } from "@/components/ui";
import { formatPhp, formatPct } from "@/lib/format";
import type { RevisionCosting, RevisionMargin, RevisionPricing } from "@/lib/types";

export function PricingSummary({
  costing,
  margin,
  pricing,
  showCost,
  showProfit,
}: {
  costing: RevisionCosting | null;
  margin: RevisionMargin | null;
  pricing: RevisionPricing | null;
  showCost: boolean;
  showProfit: boolean;
}) {
  return (
    <Card>
      <CardHeader title="Pricing &amp; margin" subtitle="Calculated automatically from the BOM" />
      <div className="grid grid-cols-2 gap-x-6 gap-y-4 px-5 py-5 sm:grid-cols-3">
        {showCost && costing && (
          <>
            <Line label="Direct material cost" value={formatPhp(costing.direct_material_cost_php)} />
            <Line label="Labor" value={formatPhp(costing.labor_cost_php)} />
            <Line label="Logistics" value={formatPhp(costing.logistics_cost_php)} />
            <Line label="Engineering" value={formatPhp(costing.engineering_cost_php)} />
            <Line label="Permits" value={formatPhp(costing.permits_cost_php)} />
            <Line label="Civil works" value={formatPhp(costing.civil_works_cost_php)} />
            <Line label="Other costs" value={formatPhp(costing.other_cost_php)} />
            <Line
              label={`Contingency (${formatPct(costing.contingency_rate)})`}
              value={formatPhp(costing.contingency_amount_php)}
            />
            <Line
              label="Total project cost"
              value={formatPhp(costing.total_project_cost_php)}
              strong
            />
          </>
        )}

        {pricing && (
          <>
            <Line label="Selling price (net)" value={formatPhp(pricing.selling_price_net_php)} strong />
            <Line
              label={`VAT (${pricing.vat_treatment.replace(/_/g, " ")}, ${formatPct(pricing.vat_rate)})`}
              value={formatPhp(pricing.vat_amount_php)}
            />
            {pricing.discount_php > 0 && (
              <Line label="Discount" value={`-${formatPhp(pricing.discount_php)}`} />
            )}
            <Line
              label="Total contract price"
              value={formatPhp(pricing.total_contract_price_php)}
              strong
            />
          </>
        )}

        {showProfit && margin && (
          <>
            <Line label="Gross profit" value={formatPhp(margin.gross_profit_php)} strong />
            <div>
              <p className="text-xs text-neutral-400">Gross margin</p>
              <p className="mt-0.5 flex items-center gap-2 text-sm font-semibold text-neutral-900">
                {formatPct(margin.gross_margin_pct)}
                {margin.margin_compliant ? (
                  <Badge tone="green">Meets minimum</Badge>
                ) : margin.margin_override_at ? (
                  <Badge tone="amber">Below minimum — overridden</Badge>
                ) : (
                  <Badge tone="red">Below minimum</Badge>
                )}
              </p>
            </div>
            <Line label="Minimum required" value={formatPct(margin.min_margin_required)} />
          </>
        )}
      </div>
      {margin?.margin_override_reason && (
        <p className="border-t border-black/5 px-5 py-3 text-xs text-neutral-500">
          Margin override reason: {margin.margin_override_reason}
        </p>
      )}
    </Card>
  );
}

function Line({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div>
      <p className="text-xs text-neutral-400">{label}</p>
      <p className={strong ? "mt-0.5 text-base font-semibold text-neutral-900" : "mt-0.5 text-sm text-neutral-700"}>
        {value}
      </p>
    </div>
  );
}
