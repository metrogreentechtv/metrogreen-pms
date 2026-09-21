import { Card, CardHeader } from "@/components/ui";
import { formatNumber } from "@/lib/format";
import type { RevisionConfiguration, Site, SystemType, VSiteConsumptionSummary } from "@/lib/types";

// Same working defaults as QuickSizingCalculator's own sizing formula —
// kept in one place there and mirrored here (not imported from it, since
// that component's constants are local `useState` defaults meant to be
// edited interactively, not a shared source of truth) so both this
// automatic estimate and that manual what-if calculator size a system the
// same way for the same inputs.
const DEFAULT_PEAK_SUN_HOURS = 3.8;
const DEFAULT_SYSTEM_DERATE = 0.8;

const SYSTEM_TYPE_LABELS: Record<SystemType, string> = {
  on_grid: "On-grid (grid-tied) — no battery required",
  hybrid: "Hybrid — grid-tied with battery backup",
  off_grid: "Off-grid — battery only, no grid connection",
  solar_bess: "Grid-tied with battery storage (BESS)",
};

/**
 * A read-only "recommended system" estimate that sits right below the
 * consumption data entry — computed automatically from whatever's on file
 * (the bulk entry above, the single-month table, or the Quick Sizing
 * Calculator's saved estimate all feed the same `site_consumption` table
 * this reads via `v_site_consumption_summary`), rather than requiring the
 * numbers to be typed in a second time. For hybrid/off-grid/BESS systems
 * it also recommends a battery capacity from the Critical / backup load
 * card further down this tab; a pure on-grid system doesn't get one.
 */
export function RecommendedSystemCard({
  summary,
  site,
  systemType,
  cfg,
}: {
  summary: VSiteConsumptionSummary | null;
  site: Site;
  systemType: SystemType | null;
  cfg: RevisionConfiguration;
}) {
  const annualKwh = summary?.annualised_kwh ?? null;
  const avgDailyKwh = annualKwh ? annualKwh / 365 : null;
  const peakSunHours = site.peak_sun_hours_per_day ?? DEFAULT_PEAK_SUN_HOURS;
  const requiredKwp =
    avgDailyKwh && peakSunHours > 0
      ? avgDailyKwh / (peakSunHours * DEFAULT_SYSTEM_DERATE)
      : null;

  const needsBattery = systemType === "hybrid" || systemType === "off_grid" || systemType === "solar_bess";
  const criticalLoadKw = cfg.critical_load_kw;
  const backupHours = cfg.required_backup_hours;
  const recommendedBatteryKwh =
    needsBattery && criticalLoadKw && backupHours ? criticalLoadKw * backupHours : null;

  const systemLabel = systemType ? SYSTEM_TYPE_LABELS[systemType] : "System type not set on this quotation";

  return (
    <Card>
      <CardHeader
        title="Recommended system"
        subtitle="Estimated from the consumption entered above — confirm or override the actual module/inverter/battery count on System Design"
      />
      <div className="grid grid-cols-2 gap-4 px-5 py-5 sm:grid-cols-4">
        <Stat label="Annual usage" value={annualKwh ? `${formatNumber(annualKwh, 0)} kWh` : "—"} />
        <Stat label="Avg daily usage" value={avgDailyKwh ? `${formatNumber(avgDailyKwh, 0)} kWh` : "—"} />
        <Stat
          label="Recommended system size"
          value={requiredKwp ? `${formatNumber(requiredKwp, 2)} kWp` : "—"}
          emphasize
        />
        {needsBattery && (
          <Stat
            label="Recommended battery"
            value={
              recommendedBatteryKwh
                ? `${formatNumber(recommendedBatteryKwh, 1)} kWh`
                : "Set critical load & backup hours below"
            }
            emphasize={!!recommendedBatteryKwh}
          />
        )}
      </div>
      <p className="border-t border-black/5 px-5 py-3 text-xs text-neutral-400">
        {systemLabel}. Sized to {formatNumber(peakSunHours, 1)} peak sun hours/day and a{" "}
        {DEFAULT_SYSTEM_DERATE * 100}% system derate, covering 100% of average daily usage — the
        same working defaults the Quick Sizing Calculator below uses.
        {needsBattery &&
          " Battery size = critical load (kW) × required backup hours, from the Critical / backup load card near the bottom of this tab."}
      </p>
    </Card>
  );
}

function Stat({ label, value, emphasize }: { label: string; value: string; emphasize?: boolean }) {
  return (
    <div>
      <p className="text-[11px] text-neutral-400">{label}</p>
      <p className={emphasize ? "font-semibold text-neutral-900" : "font-medium text-neutral-800"}>
        {value}
      </p>
    </div>
  );
}
