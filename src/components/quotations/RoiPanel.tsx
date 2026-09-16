import { Button, Card, CardHeader, LinkButton } from "@/components/ui";
import { Stat } from "@/components/quotations/RevisionForms";
import { MonthlyGenerationChart } from "@/components/quotations/MonthlyGenerationChart";
import { formatNumber, formatPhp, formatPct } from "@/lib/format";
import type { RevisionConfiguration } from "@/lib/types";

export function RoiPanel({
  cfg,
  quotationId,
  editable,
  recalcAction,
}: {
  cfg: RevisionConfiguration;
  quotationId: string;
  editable: boolean;
  recalcAction: () => Promise<void>;
}) {
  return (
    <Card>
      <CardHeader
        title="Return on investment"
        subtitle="Computed from the System Design configuration, the current BOM cost, and the site's consumption/rate on the Load & Sizing tab"
      />
      <div className="grid grid-cols-2 gap-4 px-5 py-5 sm:grid-cols-4">
        <Stat label="Year-1 savings" value={formatPhp(cfg.annual_savings_year1_php)} />
        <Stat label="Simple payback" value={cfg.simple_payback_years ? `${formatNumber(cfg.simple_payback_years, 1)} yrs` : "—"} />
        <Stat label="ROI" value={cfg.roi_pct != null ? formatPct(cfg.roi_pct) : "—"} />
        <Stat label="LCOE" value={cfg.lcoe_php_per_kwh ? `₱${formatNumber(cfg.lcoe_php_per_kwh, 3)}/kWh` : "—"} />
        <Stat label="NPV" value={formatPhp(cfg.npv_php)} />
        <Stat label="IRR" value={cfg.irr_pct != null ? formatPct(cfg.irr_pct) : "—"} />
        <Stat label="CO₂ avoided / yr" value={cfg.co2_avoided_kg_year1 ? `${formatNumber(cfg.co2_avoided_kg_year1, 0)} kg` : "—"} />
        <Stat label="Analysis period" value={cfg.analysis_years ? `${cfg.analysis_years} yrs` : "—"} />
        <Stat label="Self-consumed / yr" value={cfg.self_consumed_kwh_year1 ? `${formatNumber(cfg.self_consumed_kwh_year1, 0)} kWh` : "—"} />
        <Stat label="Exported / yr" value={cfg.exported_kwh_year1 ? `${formatNumber(cfg.exported_kwh_year1, 0)} kWh` : "—"} />
        <Stat label="Lifetime generation" value={cfg.lifetime_kwh ? `${formatNumber(cfg.lifetime_kwh, 0)} kWh` : "—"} />
        <Stat label="Annual generation" value={cfg.annual_kwh_year1 ? `${formatNumber(cfg.annual_kwh_year1, 0)} kWh` : "—"} />
      </div>
      <div className="border-t border-black/5">
        <MonthlyGenerationChart monthlyKwh={cfg.monthly_kwh} />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-black/5 px-5 py-4">
        {editable ? (
          <form action={recalcAction}>
            <Button type="submit" size="sm" variant="secondary">
              Recalculate ROI
            </Button>
          </form>
        ) : (
          <span />
        )}
        <LinkButton href={`/quotations/${quotationId}/roi`} variant="secondary" size="sm">
          Print ROI report
        </LinkButton>
      </div>
    </Card>
  );
}
