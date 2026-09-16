"use client";

import { useState } from "react";
import { Button, Card, CardHeader, Field, Input } from "@/components/ui";
import { formatNumber } from "@/lib/format";

/**
 * A quick, client-side "what-if" sizing tool — bill or known usage in,
 * a target system size out — matching the quick-sizing calculator Joel
 * referenced from another app's Load & Sizing tab. Deliberately doesn't
 * include that reference's "Recommended package"/"Est. base price"
 * section: pricing and margin belong on the Pricing tab, not here, and a
 * package recommendation would need to guess at cost data this tab's
 * viewers may not be allowed to see.
 *
 * Everything above the save button is pure client-side arithmetic (no
 * server round trip, so it updates as you type). The save button is the
 * one point of contact with the database: it upserts the figure as the
 * current month's row in the same site_consumption table the manual bill
 * history below feeds, via the same addSiteConsumption action — so
 * "Recalculate ROI" on the ROI tab immediately has real consumption data
 * to work from, and the new monthly generation chart there reflects it
 * once System Design's system size is confirmed.
 */
export function QuickSizingCalculator({
  defaultRatePhpPerKwh,
  defaultPeakSunHours,
  editable,
  saveConsumptionAction,
}: {
  defaultRatePhpPerKwh: number | null;
  defaultPeakSunHours: number | null;
  editable: boolean;
  saveConsumptionAction: (formData: FormData) => Promise<void>;
}) {
  const [billPhp, setBillPhp] = useState("15000");
  const [kwhOverride, setKwhOverride] = useState("0");
  const [rate, setRate] = useState(String(defaultRatePhpPerKwh ?? 15.5));
  const [peakSunHours, setPeakSunHours] = useState(String(defaultPeakSunHours ?? 3.8));
  const [systemDerate, setSystemDerate] = useState("0.8");
  const [offsetPct, setOffsetPct] = useState("100");

  const bill = Number(billPhp) || 0;
  const kwhOverrideNum = Number(kwhOverride) || 0;
  const rateNum = Number(rate) || 0;
  const peakSunHoursNum = Number(peakSunHours) || 0;
  const derateNum = Number(systemDerate) || 0;
  const offsetNum = Number(offsetPct) || 0;

  // Effective monthly kWh: an explicit consumption figure wins if given;
  // otherwise derive it from the bill and rate. Matches the reference
  // screenshot's own worked example (₱15,000 bill @ ₱15.5/kWh → 968 kWh).
  const effectiveMonthlyKwh = kwhOverrideNum > 0 ? kwhOverrideNum : rateNum > 0 ? bill / rateNum : 0;
  const avgDailyKwh = effectiveMonthlyKwh / 30;
  const requiredKwp =
    peakSunHoursNum > 0 && derateNum > 0
      ? (avgDailyKwh * (offsetNum / 100)) / (peakSunHoursNum * derateNum)
      : 0;

  const now = new Date();
  const monthLabel = now.toLocaleDateString("en-PH", { month: "long", year: "numeric" });

  return (
    <Card>
      <CardHeader
        title="Quick sizing calculator"
        subtitle="Rough-size a system from a bill or known usage — a starting point to confirm on System Design, not a replacement for the full bill history below"
      />
      <div className="grid grid-cols-1 gap-6 px-5 py-5 lg:grid-cols-2">
        <div className="space-y-4">
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">Electricity usage</p>
          <Field label="Average monthly bill (₱)">
            <Input type="number" step="0.01" value={billPhp} onChange={(e) => setBillPhp(e.target.value)} />
          </Field>
          <Field label="OR monthly consumption (kWh) — leave 0 to use bill">
            <Input type="number" step="0.01" value={kwhOverride} onChange={(e) => setKwhOverride(e.target.value)} />
          </Field>
          <Field label="Electricity rate (₱/kWh)">
            <Input type="number" step="0.0001" value={rate} onChange={(e) => setRate(e.target.value)} />
          </Field>

          <p className="pt-2 text-xs font-medium uppercase tracking-wide text-neutral-500">Sizing assumptions</p>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Peak sun hours/day">
              <Input type="number" step="0.01" value={peakSunHours} onChange={(e) => setPeakSunHours(e.target.value)} />
            </Field>
            <Field label="System derate">
              <Input type="number" step="0.01" value={systemDerate} onChange={(e) => setSystemDerate(e.target.value)} />
            </Field>
          </div>
          <Field label="Desired solar offset of bill (%)">
            <Input type="number" step="1" value={offsetPct} onChange={(e) => setOffsetPct(e.target.value)} />
          </Field>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border border-black/5 bg-neutral-50 px-4 py-4">
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">Sizing result</p>
            <dl className="mt-3 space-y-2 text-sm">
              <Row label="Effective monthly consumption" value={`${formatNumber(effectiveMonthlyKwh, 0)} kWh`} />
              <Row label="Average daily consumption" value={`${formatNumber(avgDailyKwh, 0)} kWh`} />
              <Row label="Required system size" value={`${formatNumber(requiredKwp, 2)} kWp`} emphasize />
            </dl>
          </div>
          <p className="text-xs text-neutral-400">
            Required kWp = (daily kWh × desired offset) ÷ (peak sun hours × system derate).
            Confirm or override the module count on System Design to hit this target.
          </p>

          {editable ? (
            <form action={saveConsumptionAction} className="border-t border-black/5 pt-4">
              <input type="hidden" name="period_year" value={now.getFullYear()} />
              <input type="hidden" name="period_month" value={now.getMonth() + 1} />
              <input type="hidden" name="kwh" value={Math.round(effectiveMonthlyKwh * 100) / 100} />
              <input type="hidden" name="bill_amount_php" value={kwhOverrideNum > 0 ? "" : bill} />
              <Button type="submit" size="sm" variant="secondary" disabled={effectiveMonthlyKwh <= 0}>
                Use as {monthLabel}&apos;s consumption
              </Button>
              <p className="mt-1.5 text-xs text-neutral-400">
                Saves this estimate into the bill history below so the ROI tab has real consumption
                data to size savings from.
              </p>
            </form>
          ) : (
            <p className="border-t border-black/5 pt-4 text-xs text-neutral-400">
              Locked outside draft — figures above are for reference only.
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}

function Row({ label, value, emphasize }: { label: string; value: string; emphasize?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-neutral-500">{label}</dt>
      <dd className={emphasize ? "font-semibold text-neutral-900" : "font-medium text-neutral-800"}>{value}</dd>
    </div>
  );
}
