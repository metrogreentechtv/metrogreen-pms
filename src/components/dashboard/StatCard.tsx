import { Card } from "@/components/ui";
import { cx } from "@/components/ui";

export function StatCard({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "neutral" | "brand" | "amber" | "red";
}) {
  const toneClass = {
    neutral: "text-neutral-900",
    brand: "text-brand-700",
    amber: "text-amber-700",
    red: "text-red-700",
  }[tone];

  return (
    <Card className="px-5 py-4">
      <p className="text-xs font-medium text-neutral-500">{label}</p>
      <p className={cx("mt-1.5 text-2xl font-semibold tabular-nums", toneClass)}>
        {value}
      </p>
      {hint && <p className="mt-1 text-[11px] text-neutral-400">{hint}</p>}
    </Card>
  );
}
