import { formatPhp } from "@/lib/format";

/**
 * Two hand-built SVG charts (same zero-dependency approach used throughout
 * this app's quotation charts) reading calc-engine.ts's yearlyCashFlowsPhp
 * series for the Long Form Proposal's "Net Financial Impact" section.
 * Index 0 of that series is year 0 — the negative upfront investment — and
 * index N is year N's net cash flow (savings minus O&M minus any inverter
 * replacement that year).
 */

export function CumulativeSavingsChart({ yearlyCashFlowsPhp }: { yearlyCashFlowsPhp: number[] }) {
  if (!yearlyCashFlowsPhp || yearlyCashFlowsPhp.length < 2) {
    return <p className="py-8 text-center text-sm text-neutral-500">Not enough data to chart yet.</p>;
  }

  let running = 0;
  const cumulative = yearlyCashFlowsPhp.map((cf) => {
    running += cf;
    return running;
  });

  const paybackYear = cumulative.findIndex((v, i) => i > 0 && v >= 0);

  const width = 600;
  const height = 180;
  const min = Math.min(...cumulative, 0);
  const max = Math.max(...cumulative, 0);
  const range = Math.max(max - min, 1);
  const n = cumulative.length;
  const stepX = width / (n - 1);
  const zeroY = height - ((0 - min) / range) * height;

  const points = cumulative.map((v, i) => {
    const x = i * stepX;
    const y = height - ((v - min) / range) * height;
    return { x, y, v };
  });

  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height + 24}`} className="w-full" role="img" aria-label="Cumulative net cash position by year">
        <line x1={0} y1={zeroY} x2={width} y2={zeroY} className="stroke-neutral-300" strokeWidth={1} strokeDasharray="3,3" />
        <path d={pathD} fill="none" className="stroke-brand-600" strokeWidth={2} />
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={2.5} className={i === paybackYear ? "fill-emerald-600" : "fill-brand-600"} />
            <title>
              Year {i}: {formatPhp(p.v)}
            </title>
            {i % Math.ceil(n / 12 || 1) === 0 && (
              <text x={p.x} y={height + 16} textAnchor="middle" className="fill-neutral-500" style={{ fontSize: 9 }}>
                {i}
              </text>
            )}
          </g>
        ))}
        {paybackYear > 0 && (
          <line
            x1={points[paybackYear].x}
            y1={0}
            x2={points[paybackYear].x}
            y2={height}
            className="stroke-emerald-500"
            strokeWidth={1}
            strokeDasharray="2,2"
          />
        )}
      </svg>
      <p className="mt-1 text-center text-xs text-neutral-400">
        Cumulative net cash position by year (upfront investment recovered in year 0)
        {paybackYear > 0 ? ` · payback in year ${paybackYear}` : ""}
      </p>
    </div>
  );
}

export function AnnualCashFlowChart({ yearlyCashFlowsPhp }: { yearlyCashFlowsPhp: number[] }) {
  if (!yearlyCashFlowsPhp || yearlyCashFlowsPhp.length < 2) {
    return <p className="py-8 text-center text-sm text-neutral-500">Not enough data to chart yet.</p>;
  }

  const width = 600;
  const height = 180;
  const n = yearlyCashFlowsPhp.length;
  const gap = 3;
  const barWidth = width / n - gap;
  const min = Math.min(...yearlyCashFlowsPhp, 0);
  const max = Math.max(...yearlyCashFlowsPhp, 0);
  const range = Math.max(max - min, 1);
  const zeroY = height - ((0 - min) / range) * height;

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height + 24}`} className="w-full" role="img" aria-label="Net cash flow by year, investment marked in year 0">
        <line x1={0} y1={zeroY} x2={width} y2={zeroY} className="stroke-neutral-300" strokeWidth={1} />
        {yearlyCashFlowsPhp.map((cf, i) => {
          const x = i * (barWidth + gap);
          const barHeight = (Math.abs(cf) / range) * height;
          const y = cf >= 0 ? zeroY - barHeight : zeroY;
          return (
            <g key={i}>
              <title>
                Year {i}: {formatPhp(cf)}
              </title>
              <rect x={x} y={y} width={barWidth} height={Math.max(barHeight, 1)} rx={2} className={i === 0 ? "fill-neutral-400" : cf >= 0 ? "fill-brand-500" : "fill-red-400"} />
              {i % Math.ceil(n / 12 || 1) === 0 && (
                <text x={x + barWidth / 2} y={height + 16} textAnchor="middle" className="fill-neutral-500" style={{ fontSize: 9 }}>
                  {i}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <p className="mt-1 text-center text-xs text-neutral-400">
        Annual net cash flow by year · year 0 is the initial investment, {formatPhp(yearlyCashFlowsPhp[0])}
      </p>
    </div>
  );
}
