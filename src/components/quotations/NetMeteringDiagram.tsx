/**
 * "How your system works" explainer diagram — hand-built SVG (no
 * dependency, consistent with this app's other charts), shown only on
 * net-metering-eligible sites per Joel's confirmation ("this illustration
 * will only show if the net metering is selected"). Callers gate on
 * site.net_metering_eligible before rendering this.
 */
export function NetMeteringDiagram() {
  const boxes = [
    { key: "sun", label: "Sunlight", x: 10, sub: "" },
    { key: "panels", label: "Solar Panels", x: 150, sub: "Generate DC power" },
    { key: "inverter", label: "Inverter", x: 290, sub: "Converts to AC power" },
    { key: "home", label: "Your Home", x: 430, sub: "Powers your loads first" },
  ];
  const boxWidth = 120;
  const boxHeight = 56;
  const boxY = 20;
  const gridY = 130;

  return (
    <div>
      <svg viewBox="0 0 600 210" className="w-full" role="img" aria-label="Diagram of how a net-metered solar system routes power">
        {boxes.map((b, i) => (
          <g key={b.key}>
            <rect
              x={b.x}
              y={boxY}
              width={boxWidth}
              height={boxHeight}
              rx={8}
              className={b.key === "sun" ? "fill-amber-100 stroke-amber-300" : "fill-brand-50 stroke-brand-300"}
              strokeWidth={1}
            />
            <text x={b.x + boxWidth / 2} y={boxY + 24} textAnchor="middle" className="fill-neutral-800" style={{ fontSize: 12, fontWeight: 600 }}>
              {b.label}
            </text>
            {b.sub && (
              <text x={b.x + boxWidth / 2} y={boxY + 40} textAnchor="middle" className="fill-neutral-500" style={{ fontSize: 9 }}>
                {b.sub}
              </text>
            )}
            {i < boxes.length - 1 && (
              <path
                d={`M ${b.x + boxWidth} ${boxY + boxHeight / 2} L ${boxes[i + 1].x - 4} ${boxY + boxHeight / 2}`}
                className="stroke-neutral-400"
                strokeWidth={2}
                markerEnd="url(#arrow)"
              />
            )}
          </g>
        ))}

        {/* Home -> Grid, bidirectional (import when usage exceeds generation, export when generation exceeds usage) */}
        <rect x={430} y={gridY} width={boxWidth} height={boxHeight} rx={8} className="fill-neutral-100 stroke-neutral-300" strokeWidth={1} />
        <text x={430 + boxWidth / 2} y={gridY + 24} textAnchor="middle" className="fill-neutral-800" style={{ fontSize: 12, fontWeight: 600 }}>
          Utility Grid
        </text>
        <text x={430 + boxWidth / 2} y={gridY + 40} textAnchor="middle" className="fill-neutral-500" style={{ fontSize: 9 }}>
          Net-metered
        </text>
        <path
          d={`M ${430 + boxWidth / 2 - 10} ${boxY + boxHeight} L ${430 + boxWidth / 2 - 10} ${gridY - 4}`}
          className="stroke-emerald-500"
          strokeWidth={2}
          markerEnd="url(#arrow)"
        />
        <path
          d={`M ${430 + boxWidth / 2 + 10} ${gridY - 4} L ${430 + boxWidth / 2 + 10} ${boxY + boxHeight}`}
          className="stroke-neutral-400"
          strokeWidth={2}
          markerEnd="url(#arrow)"
        />
        <text x={430 + boxWidth / 2 - 30} y={gridY - 10} textAnchor="middle" className="fill-emerald-600" style={{ fontSize: 8 }}>
          export
        </text>
        <text x={430 + boxWidth / 2 + 30} y={gridY - 10} textAnchor="middle" className="fill-neutral-500" style={{ fontSize: 8 }}>
          import
        </text>

        <defs>
          <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" className="fill-neutral-400" />
          </marker>
        </defs>
      </svg>
      <p className="mt-2 text-xs text-neutral-600">
        During the day, your solar panels power your home first. Any surplus is exported to the grid and
        credited at the generation rate; whenever your home needs more than the panels are producing (at
        night, for example), it draws power from the grid at the normal retail rate. Under net metering,
        unused export credit rolls over from month to month and does not expire or reset at year-end.
      </p>
    </div>
  );
}
