import { formatNumber } from "@/lib/format";

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * Hand-built SVG grouped-bar chart (same zero-dependency approach as
 * MonthlyGenerationChart/MonthlyUsageChart) pairing estimated year-1
 * generation against household consumption, month by month, for the Long
 * Form Proposal's "System Performance" section.
 */
export function GenerationVsConsumptionChart({
  generationKwh,
  consumptionKwh,
}: {
  generationKwh: number[];
  consumptionKwh: number[];
}) {
  const max = Math.max(...generationKwh, ...consumptionKwh, 1);
  const width = 600;
  const height = 160;
  const gap = 8;
  const groupWidth = (width - gap * 11) / 12;
  const barWidth = (groupWidth - 3) / 2;

  return (
    <div>
      <svg
        viewBox={`0 0 ${width} ${height + 30}`}
        className="w-full"
        role="img"
        aria-label="Estimated monthly generation vs. household consumption, in kilowatt-hours"
      >
        {generationKwh.map((genKwh, i) => {
          const conKwh = consumptionKwh[i] ?? 0;
          const groupX = i * (groupWidth + gap);
          const genHeight = Math.max((genKwh / max) * height, genKwh > 0 ? 1 : 0);
          const conHeight = Math.max((conKwh / max) * height, conKwh > 0 ? 1 : 0);
          return (
            <g key={MONTH_LABELS[i]}>
              <title>
                {MONTH_LABELS[i]}: {formatNumber(genKwh, 0)} kWh generated, {formatNumber(conKwh, 0)} kWh consumed
              </title>
              <rect
                x={groupX}
                y={height - genHeight}
                width={barWidth}
                height={genHeight}
                rx={2}
                className="fill-brand-500"
              />
              <rect
                x={groupX + barWidth + 3}
                y={height - conHeight}
                width={barWidth}
                height={conHeight}
                rx={2}
                className="fill-amber-400"
              />
              <text
                x={groupX + groupWidth / 2}
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
      <div className="mt-1 flex items-center justify-center gap-4 text-[10px] text-neutral-500">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-sm bg-brand-500" /> Estimated generation
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-sm bg-amber-400" /> Household consumption
        </span>
      </div>
    </div>
  );
}
