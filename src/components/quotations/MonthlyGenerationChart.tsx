import { formatNumber } from "@/lib/format";

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * Hand-built SVG bar chart (no charting library, consistent with this
 * project's zero-dependency approach elsewhere — GanttTimeline, SCurveChart)
 * for the year-1 monthly generation estimate already computed and stored by
 * the calc engine (revision_configurations.monthly_kwh) — surfaces data
 * that existed but had no chart until now.
 */
export function MonthlyGenerationChart({ monthlyKwh }: { monthlyKwh: number[] | null }) {
  if (!monthlyKwh || monthlyKwh.length !== 12 || monthlyKwh.every((v) => !v)) {
    return (
      <p className="px-5 py-8 text-center text-sm text-neutral-500">
        No generation estimate yet — set a system size on System Design, then Recalculate ROI.
      </p>
    );
  }

  const max = Math.max(...monthlyKwh, 1);
  const width = 600;
  const height = 160;
  const gap = 8;
  const barWidth = (width - gap * 11) / 12;

  return (
    <div className="px-5 py-5">
      <svg
        viewBox={`0 0 ${width} ${height + 22}`}
        className="w-full"
        role="img"
        aria-label="Estimated monthly generation in kilowatt-hours, by month"
      >
        {monthlyKwh.map((kwh, i) => {
          const barHeight = Math.max((kwh / max) * height, 1);
          const x = i * (barWidth + gap);
          const y = height - barHeight;
          return (
            <g key={MONTH_LABELS[i]}>
              <title>
                {MONTH_LABELS[i]}: {formatNumber(kwh, 0)} kWh
              </title>
              <rect x={x} y={y} width={barWidth} height={barHeight} rx={3} className="fill-brand-500" />
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
        Estimated year-1 generation by month · peak {formatNumber(max, 0)} kWh
      </p>
    </div>
  );
}
