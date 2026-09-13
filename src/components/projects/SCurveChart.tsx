import type { SCurvePoint } from "@/lib/scurve";

const WIDTH = 720;
const HEIGHT = 260;
const PAD_L = 34;
const PAD_R = 12;
const PAD_T = 12;
const PAD_B = 24;

function pathFor(points: SCurvePoint[], key: "plannedCum" | "actualCum", yMin: number, yMax: number): string {
  const innerW = WIDTH - PAD_L - PAD_R;
  const innerH = HEIGHT - PAD_T - PAD_B;
  const n = points.length;
  return points
    .map((p, i) => {
      const x = PAD_L + (n <= 1 ? 0 : (i / (n - 1)) * innerW);
      const y = PAD_T + innerH - ((p[key] - yMin) / (yMax - yMin || 1)) * innerH;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

export function SCurveChart({ points }: { points: SCurvePoint[] }) {
  if (points.length === 0) return null;

  const yMin = 0;
  const yMax = 100;
  const innerW = WIDTH - PAD_L - PAD_R;
  const innerH = HEIGHT - PAD_T - PAD_B;
  const ticks = [0, 25, 50, 75, 100];

  const todayIdx = points.findIndex((p) => p.date === new Date().toISOString().slice(0, 10));
  const todayX = todayIdx >= 0 ? PAD_L + (todayIdx / Math.max(1, points.length - 1)) * innerW : null;

  const monthTicks: { x: number; label: string }[] = [];
  let lastMonth = "";
  points.forEach((p, i) => {
    const month = p.date.slice(0, 7);
    if (month !== lastMonth) {
      lastMonth = month;
      const x = PAD_L + (i / Math.max(1, points.length - 1)) * innerW;
      monthTicks.push({
        x,
        label: new Date(p.date + "T00:00:00Z").toLocaleDateString("en-PH", { month: "short", year: "2-digit" }),
      });
    }
  });

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} style={{ minWidth: WIDTH }} className="text-neutral-400">
        {ticks.map((t) => {
          const y = PAD_T + innerH - (t / 100) * innerH;
          return (
            <g key={t}>
              <line x1={PAD_L} x2={WIDTH - PAD_R} y1={y} y2={y} stroke="currentColor" strokeOpacity={0.15} />
              <text x={PAD_L - 6} y={y + 3} textAnchor="end" fontSize={9} fill="currentColor">
                {t}%
              </text>
            </g>
          );
        })}

        {monthTicks.map((m) => (
          <text key={m.label + m.x} x={m.x} y={HEIGHT - 6} textAnchor="middle" fontSize={9} fill="currentColor">
            {m.label}
          </text>
        ))}

        {todayX != null && (
          <line x1={todayX} x2={todayX} y1={PAD_T} y2={HEIGHT - PAD_B} stroke="#ef4444" strokeWidth={1} strokeDasharray="3,2" />
        )}

        <path d={pathFor(points, "plannedCum", yMin, yMax)} fill="none" stroke="#2563eb" strokeWidth={2} />
        <path d={pathFor(points, "actualCum", yMin, yMax)} fill="none" stroke="#16a34a" strokeWidth={2} />
      </svg>

      <div className="mt-2 flex flex-wrap gap-4 text-xs text-neutral-600">
        <Legend color="#2563eb" label="Planned cumulative %" />
        <Legend color="#16a34a" label="Actual cumulative %" />
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0 w-3 border-t border-dashed border-red-400" /> Today
        </span>
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="inline-block h-0.5 w-3" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}
