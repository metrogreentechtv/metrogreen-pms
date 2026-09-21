import { formatNumber } from "@/lib/format";
import type { SiteConsumption } from "@/lib/types";

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * Hand-built SVG bar chart (same zero-dependency approach as
 * MonthlyGenerationChart on the ROI tab) for the site's actual billed/entered
 * consumption, bucketed by calendar month — the visual Joel referenced from
 * another app's "Electricity Usage" panel.
 *
 * `site_consumption` rows are unique per (site, year, month) but a site can
 * have entries spanning more than one year, so a single Jan–Dec chart needs
 * a rule for which year "wins" per month: this uses the most recent year on
 * file for each calendar month. That makes the chart a snapshot of "typical"
 * monthly usage for sizing/reference — not a true multi-year time series —
 * which is called out under the chart whenever fewer than 12 months are on
 * file at all, or the site's history spans multiple years.
 */
export function MonthlyUsageChart({ consumption }: { consumption: SiteConsumption[] }) {
  const byMonth = new Map<number, SiteConsumption>();
  const yearsSeen = new Set<number>();
  for (const c of consumption) {
    yearsSeen.add(c.period_year);
    const existing = byMonth.get(c.period_month);
    if (!existing || c.period_year > existing.period_year) {
      byMonth.set(c.period_month, c);
    }
  }

  const values = Array.from({ length: 12 }, (_, i) => byMonth.get(i + 1)?.kwh ?? 0);
  const monthsWithData = values.filter((v) => v > 0).length;

  if (monthsWithData === 0) {
    return (
      <p className="px-5 py-8 text-center text-sm text-neutral-500">
        No consumption entered yet — add a month below, or use the Quick sizing calculator above.
      </p>
    );
  }

  const total = values.reduce((a, b) => a + b, 0);
  const max = Math.max(...values, 1);
  const width = 600;
  const height = 160;
  const gap = 8;
  const barWidth = (width - gap * 11) / 12;

  return (
    <div className="px-5 py-5">
      <p className="mb-3 text-center text-sm font-medium text-neutral-700">
        Annual usage (by calendar month): {formatNumber(total, 0)} kWh
      </p>
      <svg
        viewBox={`0 0 ${width} ${height + 22}`}
        className="w-full"
        role="img"
        aria-label="Monthly electricity usage in kilowatt-hours, by calendar month"
      >
        {values.map((kwh, i) => {
          const barHeight = kwh > 0 ? Math.max((kwh / max) * height, 2) : 0;
          const x = i * (barWidth + gap);
          const y = height - barHeight;
          return (
            <g key={MONTH_LABELS[i]}>
              {kwh > 0 && (
                <>
                  <title>
                    {MONTH_LABELS[i]}: {formatNumber(kwh, 0)} kWh
                  </title>
                  <text
                    x={x + barWidth / 2}
                    y={Math.max(y - 4, 9)}
                    textAnchor="middle"
                    className="fill-neutral-500"
                    style={{ fontSize: 9 }}
                  >
                    {formatNumber(kwh, 0)}
                  </text>
                </>
              )}
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                rx={3}
                className={kwh > 0 ? "fill-amber-400" : "fill-neutral-100"}
              />
              <text
                x={x + barWidth / 2}
                y={height + 15}
                textAnchor="middle"
                className="fill-neutral-500"
                style={{ fontSize: 9 }}
              >
                {MONTH_LABELS[i]}
              </text>
            </g>
          );
        })}
      </svg>
      <p className="mt-1 text-center text-xs text-neutral-400">
        {monthsWithData < 12 ? `${monthsWithData} of 12 months on file` : "All 12 months on file"}
        {yearsSeen.size > 1 ? " · most recent year used per month" : ""}
      </p>
    </div>
  );
}
