"use client";

import { useState } from "react";
import { Button, Card, CardHeader, Field, Input, Select } from "@/components/ui";

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

type Mode = "monthly_kwh" | "monthly_amount" | "annual_kwh" | "annual_amount";

/**
 * The bulk "data connection" for the Load & Sizing tab — enter a whole
 * year's consumption in one submit, as either 12 monthly figures or one
 * yearly total, in kWh or in ₱. This writes into the same
 * `site_consumption` table (same upsert key) the single-month "Add /
 * update" form and the Quick Sizing Calculator below already use, so
 * everything downstream (the usage chart, the recommended-system
 * estimate, ROI) reads it the same way regardless of which form it came
 * through.
 *
 * An "annual total" has no seasonal usage curve to distribute it by —
 * this app doesn't model one — so it's split evenly across all 12 months
 * of the chosen year, clearly labeled as a flat estimate. Any individual
 * month can be corrected afterward in the table below this card.
 */
export function ConsumptionDataEntry({
  action,
  defaultRatePhpPerKwh,
  defaultYear,
}: {
  action: (formData: FormData) => Promise<void>;
  defaultRatePhpPerKwh: number | null;
  defaultYear: number;
}) {
  const [mode, setMode] = useState<Mode>("monthly_kwh");
  const isMonthly = mode === "monthly_kwh" || mode === "monthly_amount";
  const isAmount = mode === "monthly_amount" || mode === "annual_amount";

  return (
    <Card>
      <CardHeader
        title="Enter consumption data"
        subtitle="Fill in a year's electricity usage in one go — by month or as a yearly total, in kWh or ₱"
      />
      <form action={action} className="space-y-4 px-5 py-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Entry mode">
            <Select name="mode" value={mode} onChange={(e) => setMode(e.target.value as Mode)}>
              <option value="monthly_kwh">Monthly — kWh (Jan–Dec)</option>
              <option value="monthly_amount">Monthly — ₱ bill amount (Jan–Dec)</option>
              <option value="annual_kwh">Annual total — kWh</option>
              <option value="annual_amount">Annual total — ₱ amount</option>
            </Select>
          </Field>
          <Field label="Year">
            <Input name="period_year" type="number" defaultValue={defaultYear} required />
          </Field>
          {isAmount && (
            <Field label="Rate (₱/kWh)" hint="Used only to convert ₱ into kWh, not saved on its own">
              <Input
                name="rate_php_per_kwh"
                type="number"
                step="0.0001"
                defaultValue={defaultRatePhpPerKwh ?? ""}
                required
              />
            </Field>
          )}
        </div>

        {isMonthly ? (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
            {MONTH_NAMES.map((m, i) => (
              <Field key={m} label={m}>
                <Input name={`m${i + 1}`} type="number" step="0.01" placeholder="0" />
              </Field>
            ))}
          </div>
        ) : (
          <Field label={mode === "annual_kwh" ? "Total annual kWh" : "Total annual ₱ amount"}>
            <Input name="annual_total" type="number" step="0.01" required />
          </Field>
        )}

        {!isMonthly && (
          <p className="text-xs text-neutral-400">
            Split evenly across all 12 months of the chosen year — a flat estimate, not a seasonal
            curve. Correct any individual month afterward in the table below.
          </p>
        )}

        <div className="flex justify-end">
          <Button type="submit" size="sm">
            Save consumption data
          </Button>
        </div>
      </form>
    </Card>
  );
}
