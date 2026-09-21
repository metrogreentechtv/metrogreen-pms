import Link from "next/link";
import { Button, Card, CardHeader, Field, Input, Select } from "@/components/ui";
import { formatNumber, formatPhp } from "@/lib/format";
import { QuickSizingCalculator } from "@/components/quotations/QuickSizingCalculator";
import { SiteBillList, type SiteBillUploadWithUrl } from "@/components/customers/SiteBillList";
import type { RevisionConfiguration, Site, SiteConsumption, VSiteConsumptionSummary } from "@/lib/types";

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export function LoadSizingPanel({
  site,
  siteBills,
  customerId,
  consumption,
  summary,
  cfg,
  editable,
  siteSizingAction,
  criticalLoadAction,
  addConsumptionAction,
  deleteConsumptionAction,
}: {
  site: Site | null;
  /** The site's uploaded electric bills (photo/PDF), for reference while
   * filling in the consumption-history table below — read-only here,
   * uploaded/managed from the site's own edit page on the customer record. */
  siteBills: SiteBillUploadWithUrl[];
  customerId: string | null;
  consumption: SiteConsumption[];
  summary: VSiteConsumptionSummary | null;
  cfg: RevisionConfiguration;
  editable: boolean;
  siteSizingAction: (formData: FormData) => Promise<void>;
  criticalLoadAction: (formData: FormData) => Promise<void>;
  addConsumptionAction: (formData: FormData) => Promise<void>;
  deleteConsumptionAction: (id: string) => Promise<void>;
}) {
  const thisYear = new Date().getFullYear();

  return (
    <div className="space-y-6">
      {!site && (
        <Card className="border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
          This quotation has no site on file — attach one from the customer record to size the
          system from actual consumption history.
        </Card>
      )}

      {site && (
        <>
          <Card>
            <CardHeader
              title="Electric bills on file"
              subtitle="Uploaded from the site's record on the customer page — open one to check the actual figures while filling in the table below"
              action={
                customerId && (
                  <Link
                    href={`/customers/${customerId}/sites/${site.id}/edit#bills`}
                    className="text-xs font-medium text-brand-700 hover:underline"
                  >
                    Upload / manage bills
                  </Link>
                )
              }
            />
            <SiteBillList
              bills={siteBills}
              emptyLabel="No electric bills uploaded for this site yet — upload one from the customer's Sites card, or the link above."
            />
          </Card>

          <QuickSizingCalculator
            defaultRatePhpPerKwh={site.blended_retail_rate_php_kwh ?? summary?.derived_blended_rate_php_kwh ?? null}
            defaultPeakSunHours={site.peak_sun_hours_per_day}
            editable={editable}
            saveConsumptionAction={addConsumptionAction}
          />

          <Card>
            <CardHeader
              title="Electricity bill / consumption history"
              subtitle="Feeds the annualised load estimate used for sizing and savings — add a few months of billed kWh"
            />
            <div className="grid grid-cols-2 gap-3 border-b border-black/5 px-5 py-4 sm:grid-cols-4">
              <Stat label="Months on file" value={summary ? String(summary.months_recorded) : "0"} />
              <Stat label="Avg monthly kWh" value={summary ? `${formatNumber(summary.avg_monthly_kwh, 0)} kWh` : "—"} />
              <Stat label="Annualised kWh" value={summary ? `${formatNumber(summary.annualised_kwh, 0)} kWh` : "—"} />
              <Stat
                label="Blended rate (derived)"
                value={summary?.derived_blended_rate_php_kwh ? `₱${formatNumber(summary.derived_blended_rate_php_kwh, 2)}/kWh` : "—"}
              />
            </div>

            {consumption.length > 0 && (
              <div className="overflow-x-auto border-b border-black/5">
                <table className="w-full text-left text-sm">
                  <thead className="bg-neutral-50 text-xs text-neutral-500">
                    <tr>
                      <th className="px-5 py-2 font-medium">Period</th>
                      <th className="px-5 py-2 font-medium">kWh</th>
                      <th className="px-5 py-2 font-medium">Bill</th>
                      <th className="px-5 py-2 font-medium">Peak demand</th>
                      {editable && <th className="px-5 py-2" />}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5">
                    {consumption.map((c) => (
                      <tr key={c.id}>
                        <td className="px-5 py-2">{MONTH_NAMES[c.period_month - 1]} {c.period_year}</td>
                        <td className="px-5 py-2 tabular-nums">{formatNumber(c.kwh, 0)}</td>
                        <td className="px-5 py-2 tabular-nums">{c.bill_amount_php ? formatPhp(c.bill_amount_php) : "—"}</td>
                        <td className="px-5 py-2 tabular-nums">{c.peak_demand_kw ? `${formatNumber(c.peak_demand_kw, 1)} kW` : "—"}</td>
                        {editable && (
                          <td className="px-5 py-2 text-right">
                            <form action={deleteConsumptionAction.bind(null, c.id)}>
                              <button type="submit" className="rounded px-2 py-1 text-xs text-neutral-500 hover:bg-red-50 hover:text-red-700">
                                Remove
                              </button>
                            </form>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {editable && (
              <form action={addConsumptionAction} className="grid grid-cols-2 gap-3 px-5 py-4 sm:grid-cols-6">
                <Field label="Year">
                  <Input name="period_year" type="number" defaultValue={thisYear} required />
                </Field>
                <Field label="Month">
                  <Select name="period_month" required defaultValue={new Date().getMonth() + 1}>
                    {MONTH_NAMES.map((m, i) => (
                      <option key={m} value={i + 1}>{m}</option>
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
                  <Button type="submit" size="sm" className="w-full">Add / update</Button>
                </div>
              </form>
            )}
          </Card>

          <Card>
            <CardHeader title="Site rate &amp; net metering" subtitle="Used to value savings and exported energy" />
            {editable ? (
              <form action={siteSizingAction} className="grid grid-cols-1 gap-4 px-5 py-5 sm:grid-cols-2">
                <Field label="Blended retail rate (₱/kWh)" hint="Leave blank to derive from the bills above">
                  <Input name="blended_retail_rate_php_kwh" type="number" step="0.0001" defaultValue={site.blended_retail_rate_php_kwh ?? ""} />
                </Field>
                <Field label="Peak sun hours / day (site default)">
                  <Input name="peak_sun_hours_per_day" type="number" step="0.01" defaultValue={site.peak_sun_hours_per_day ?? ""} />
                </Field>
                <Field label="Net-metering export rate (₱/kWh)">
                  <Input name="net_metering_export_rate_php_kwh" type="number" step="0.0001" defaultValue={site.net_metering_export_rate_php_kwh ?? ""} />
                </Field>
                <label className="mt-6 flex items-center gap-2 text-sm text-neutral-700">
                  <input type="checkbox" name="net_metering_eligible" defaultChecked={!!site.net_metering_eligible} className="rounded" />
                  Site is eligible for net metering
                </label>
                <div className="sm:col-span-2 flex justify-end">
                  <Button type="submit" size="sm">Save site sizing details</Button>
                </div>
              </form>
            ) : (
              <div className="px-5 py-4 text-sm text-neutral-600">Locked outside draft.</div>
            )}
          </Card>

          <Card>
            <CardHeader title="Critical / backup load" subtitle="Hybrid, off-grid, or battery-backed systems" />
            {editable ? (
              <form action={criticalLoadAction} className="grid grid-cols-1 gap-4 px-5 py-5 sm:grid-cols-2">
                <Field label="Critical load (kW)">
                  <Input name="critical_load_kw" type="number" step="0.01" defaultValue={cfg.critical_load_kw ?? ""} />
                </Field>
                <Field label="Required backup (hours)">
                  <Input name="required_backup_hours" type="number" step="0.1" defaultValue={cfg.required_backup_hours ?? ""} />
                </Field>
                <div className="sm:col-span-2 flex justify-end">
                  <Button type="submit" size="sm">Save</Button>
                </div>
              </form>
            ) : (
              <div className="px-5 py-4 text-sm text-neutral-600">
                {cfg.critical_load_kw ? `${cfg.critical_load_kw} kW critical load, ${cfg.required_backup_hours ?? "—"} h backup.` : "Not on-grid backup — no critical load set."}
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] text-neutral-400">{label}</p>
      <p className="font-medium text-neutral-800">{value}</p>
    </div>
  );
}
