import Link from "next/link";
import { Button, Card, CardHeader, Field, Input, Select } from "@/components/ui";
import { formatNumber, formatPhp } from "@/lib/format";
import { QuickSizingCalculator } from "@/components/quotations/QuickSizingCalculator";
import { MonthlyUsageChart } from "@/components/quotations/MonthlyUsageChart";
import { AddConsumptionForm } from "@/components/quotations/AddConsumptionForm";
import { ConsumptionDataEntry } from "@/components/quotations/ConsumptionDataEntry";
import { RecommendedSystemCard } from "@/components/quotations/RecommendedSystemCard";
import { SiteBillList, type SiteBillUploadWithUrl } from "@/components/customers/SiteBillList";
import type {
  RevisionConfiguration,
  Site,
  SiteConsumption,
  SystemType,
  VSiteConsumptionSummary,
} from "@/lib/types";

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export function LoadSizingPanel({
  site,
  siteBills,
  customerId,
  customerSites,
  systemType,
  consumption,
  summary,
  cfg,
  editable,
  siteSizingAction,
  criticalLoadAction,
  addConsumptionAction,
  deleteConsumptionAction,
  attachSiteAction,
  batchConsumptionAction,
}: {
  site: Site | null;
  /** The site's uploaded electric bills (photo/PDF), for reference while
   * filling in the consumption-history table below — read-only here,
   * uploaded/managed from the site's own edit page on the customer record. */
  siteBills: SiteBillUploadWithUrl[];
  customerId: string | null;
  /** The customer's own sites, for the "attach a site" picker shown when
   * this quotation doesn't have one yet — `site_id` can currently only be
   * chosen at quotation-creation time, so a quotation created without one
   * needs a way to fix that from here. */
  customerSites: Site[];
  systemType: SystemType | null;
  consumption: SiteConsumption[];
  summary: VSiteConsumptionSummary | null;
  cfg: RevisionConfiguration;
  editable: boolean;
  siteSizingAction: (formData: FormData) => Promise<void>;
  criticalLoadAction: (formData: FormData) => Promise<void>;
  addConsumptionAction: (formData: FormData) => Promise<void>;
  deleteConsumptionAction: (id: string) => Promise<void>;
  attachSiteAction: (formData: FormData) => Promise<void>;
  batchConsumptionAction: (formData: FormData) => Promise<void>;
}) {
  const thisYear = new Date().getFullYear();

  // Cross-reference tagged bills against consumption rows sharing the same
  // period, so the table below can show "bill on file" next to a month that
  // has one — a cheap visual link between the two records without a schema
  // change (bills aren't required to be tagged, so this is best-effort).
  const billByPeriod = new Map<string, SiteBillUploadWithUrl>();
  for (const b of siteBills) {
    if (b.period_year && b.period_month) {
      billByPeriod.set(`${b.period_year}-${b.period_month}`, b);
    }
  }

  return (
    <div className="space-y-6">
      {!site && (
        <Card className="border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
          <p className="mb-3">
            This quotation has no site on file — attach one to size the system from actual
            consumption history.
          </p>
          {customerSites.length > 0 ? (
            <form action={attachSiteAction} className="flex flex-wrap items-end gap-3">
              <div className="min-w-[220px] flex-1">
                <Field label="Site">
                  <Select name="site_id" required defaultValue="">
                    <option value="" disabled>
                      Choose a site…
                    </option>
                    {customerSites.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.site_name}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
              <Button type="submit" size="sm">
                Attach site
              </Button>
            </form>
          ) : (
            customerId && (
              <Link href={`/customers/${customerId}`} className="font-medium underline">
                This customer has no sites yet — add one on the customer record first
              </Link>
            )
          )}
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

          {editable && (
            <ConsumptionDataEntry
              action={batchConsumptionAction}
              defaultRatePhpPerKwh={site.blended_retail_rate_php_kwh ?? summary?.derived_blended_rate_php_kwh ?? null}
              defaultYear={thisYear}
            />
          )}

          <RecommendedSystemCard summary={summary} site={site} systemType={systemType} cfg={cfg} />

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

            <div className="border-b border-black/5">
              <MonthlyUsageChart consumption={consumption} />
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
                      <th className="px-5 py-2 font-medium">Photo</th>
                      {editable && <th className="px-5 py-2" />}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5">
                    {consumption.map((c) => {
                      const linkedBill = billByPeriod.get(`${c.period_year}-${c.period_month}`);
                      return (
                      <tr key={c.id}>
                        <td className="px-5 py-2">{MONTH_NAMES[c.period_month - 1]} {c.period_year}</td>
                        <td className="px-5 py-2 tabular-nums">{formatNumber(c.kwh, 0)}</td>
                        <td className="px-5 py-2 tabular-nums">{c.bill_amount_php ? formatPhp(c.bill_amount_php) : "—"}</td>
                        <td className="px-5 py-2 tabular-nums">{c.peak_demand_kw ? `${formatNumber(c.peak_demand_kw, 1)} kW` : "—"}</td>
                        <td className="px-5 py-2">
                          {linkedBill?.signed_url ? (
                            <a
                              href={linkedBill.signed_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs font-medium text-brand-700 hover:underline"
                            >
                              View
                            </a>
                          ) : (
                            <span className="text-xs text-neutral-300">—</span>
                          )}
                        </td>
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
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {editable && (
              <AddConsumptionForm bills={siteBills} action={addConsumptionAction} defaultYear={thisYear} />
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
