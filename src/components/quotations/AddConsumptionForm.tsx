"use client";

import { useState } from "react";
import { Button, Field, Input, Select } from "@/components/ui";
import type { SiteBillUploadWithUrl } from "@/components/customers/SiteBillList";

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/**
 * The "add / update a month's consumption" form from the Load & Sizing tab,
 * pulled out into its own client component so an "Import from an uploaded
 * bill" selector can prefill the Year/Month fields below it.
 *
 * There's no OCR here — nothing reads the kWh or peso figures off the bill
 * photo/PDF itself — this just saves re-typing (and mis-typing) the period a
 * tagged bill already carries, and keeps the two records — the photo and the
 * entered figures — pointed at the same month. Only bills tagged with a
 * month/year when uploaded show up in the selector; an untagged bill still
 * shows up in the reference list above, it just can't prefill anything here.
 */
export function AddConsumptionForm({
  bills,
  action,
  defaultYear,
}: {
  bills: SiteBillUploadWithUrl[];
  action: (formData: FormData) => Promise<void>;
  defaultYear: number;
}) {
  const now = new Date();
  const [periodYear, setPeriodYear] = useState(defaultYear);
  const [periodMonth, setPeriodMonth] = useState(now.getMonth() + 1);
  const [selectedBillId, setSelectedBillId] = useState("");

  const taggedBills = bills.filter((b) => b.period_year && b.period_month);
  const selectedBill = bills.find((b) => b.id === selectedBillId);

  function handleBillSelect(billId: string) {
    setSelectedBillId(billId);
    const bill = bills.find((b) => b.id === billId);
    if (bill?.period_year && bill.period_month) {
      setPeriodYear(bill.period_year);
      setPeriodMonth(bill.period_month);
    }
  }

  return (
    <form action={action} className="grid grid-cols-2 gap-3 px-5 py-4 sm:grid-cols-6">
      {taggedBills.length > 0 && (
        <div className="col-span-2 sm:col-span-6">
          <Field label="Import from an uploaded bill (optional) — fills in the year/month below; you still read the kWh/₱ off the bill and type them in">
            <Select value={selectedBillId} onChange={(e) => handleBillSelect(e.target.value)}>
              <option value="">— Enter manually —</option>
              {taggedBills.map((b) => (
                <option key={b.id} value={b.id}>
                  {MONTH_NAMES[(b.period_month as number) - 1]} {b.period_year} — {b.file_name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      )}

      <Field label="Year">
        <Input
          name="period_year"
          type="number"
          value={periodYear}
          onChange={(e) => setPeriodYear(Number(e.target.value))}
          required
        />
      </Field>
      <Field label="Month">
        <Select
          name="period_month"
          required
          value={periodMonth}
          onChange={(e) => setPeriodMonth(Number(e.target.value))}
        >
          {MONTH_NAMES.map((m, i) => (
            <option key={m} value={i + 1}>
              {m}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="kWh">
        <Input name="kwh" type="number" step="0.01" required />
      </Field>
      <Field label="Bill (₱)">
        <Input name="bill_amount_php" type="number" step="0.01" />
      </Field>
      <Field label="Peak demand (kW)">
        <Input name="peak_demand_kw" type="number" step="0.01" />
      </Field>
      <div className="flex items-end">
        <Button type="submit" size="sm" className="w-full">
          Add / update
        </Button>
      </div>

      <div className="col-span-2 sm:col-span-6">
        <Field label="Notes (optional)">
          <Input
            key={selectedBillId}
            name="notes"
            defaultValue={selectedBill ? `From uploaded bill: ${selectedBill.file_name}` : ""}
            placeholder="e.g. estimated, actual bill on file"
          />
        </Field>
      </div>
    </form>
  );
}
