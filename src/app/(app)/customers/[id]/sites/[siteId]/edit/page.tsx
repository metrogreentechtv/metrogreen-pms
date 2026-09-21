import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import { canWrite } from "@/lib/roles";
import { Card, CardHeader, Field, Input, Select, Textarea, Button, LinkButton } from "@/components/ui";
import type { Site } from "@/lib/types";
import { fetchSiteBillsWithUrls } from "@/lib/site-bills";
import { SiteBillList } from "@/components/customers/SiteBillList";
import { updateSite, uploadSiteBill, deleteSiteBill } from "../../../../actions";

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export default async function EditSitePage({
  params,
}: {
  params: { id: string; siteId: string };
}) {
  const user = await getCurrentUser();
  if (!user || !canWrite(user.roles)) {
    redirect(`/customers/${params.id}`);
  }

  const supabase = await createClient();
  const { data: site } = await supabase
    .from("sites")
    .select("*")
    .eq("id", params.siteId)
    .eq("customer_id", params.id)
    .is("deleted_at", null)
    .maybeSingle();

  if (!site) notFound();

  const s = site as Site;
  const boundUpdateSite = updateSite.bind(null, s.id, params.id);
  const boundUploadBill = uploadSiteBill.bind(null, s.id, params.id);
  const boundDeleteBill = deleteSiteBill.bind(null, s.id, params.id);
  const bills = await fetchSiteBillsWithUrls(supabase, s.id);
  const thisYear = new Date().getFullYear();

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">Edit site</h1>
          <p className="text-sm text-neutral-500">{s.site_no}</p>
        </div>
        <LinkButton href={`/customers/${params.id}`} variant="secondary" size="sm">
          Cancel
        </LinkButton>
      </div>

      <Card>
        <CardHeader title="Site details" />
        <form action={boundUpdateSite} className="space-y-4 px-5 py-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Site name">
              <Input name="site_name" required defaultValue={s.site_name} placeholder="Main rooftop" />
            </Field>
            <Field label="Service entrance">
              <Select name="service_entrance" defaultValue={s.service_entrance ?? ""}>
                <option value="">Unspecified</option>
                <option value="single_phase">Single phase</option>
                <option value="three_phase">Three phase</option>
              </Select>
            </Field>
          </div>

          <Field label="Address">
            <Input name="address" defaultValue={s.address ?? ""} />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="City">
              <Input name="city" defaultValue={s.city ?? ""} />
            </Field>
            <Field label="Province">
              <Input name="province" defaultValue={s.province ?? ""} />
            </Field>
          </div>

          <Field label="Distribution utility">
            <Input name="distribution_utility" defaultValue={s.distribution_utility ?? ""} />
          </Field>

          <Field label="Google Maps link">
            <Input
              name="google_maps_url"
              type="url"
              placeholder="Paste the site's Google Maps link here"
              defaultValue={s.google_maps_url ?? ""}
            />
          </Field>
          {s.google_maps_url && (
            <a
              href={s.google_maps_url}
              target="_blank"
              rel="noreferrer"
              className="-mt-2 block text-xs text-brand-700 hover:underline"
            >
              Open in Google Maps ↗
            </a>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Blended retail rate (₱/kWh)">
              <Input
                name="blended_retail_rate_php_kwh"
                type="number"
                step="0.0001"
                defaultValue={s.blended_retail_rate_php_kwh ?? ""}
              />
            </Field>
            <Field label="Peak sun hours / day">
              <Input
                name="peak_sun_hours_per_day"
                type="number"
                step="0.01"
                defaultValue={s.peak_sun_hours_per_day ?? ""}
              />
            </Field>
          </div>

          <label className="flex items-center gap-2 text-sm text-neutral-700">
            <input
              type="checkbox"
              name="net_metering_eligible"
              className="rounded"
              defaultChecked={!!s.net_metering_eligible}
            />
            Net-metering eligible
          </label>

          <div className="border-t border-black/5 pt-4">
            <p className="mb-3 text-xs font-medium uppercase tracking-wide text-neutral-500">
              Site &amp; roof details — these show on the project&apos;s Site information card once a
              quotation from this site is converted to a project
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Roof type">
                <Input name="roof_type" placeholder="e.g. Concrete slab, metal sheet" defaultValue={s.roof_type ?? ""} />
              </Field>
              <Field label="Roof material">
                <Input name="roof_material" placeholder="e.g. Corrugated GI sheet" defaultValue={s.roof_material ?? ""} />
              </Field>
              <Field label="Orientation (degrees)">
                <Input
                  name="roof_orientation_deg"
                  type="number"
                  step="1"
                  min="0"
                  max="360"
                  defaultValue={s.roof_orientation_deg ?? ""}
                />
              </Field>
              <Field label="Tilt (degrees)">
                <Input
                  name="roof_tilt_deg"
                  type="number"
                  step="1"
                  min="0"
                  max="90"
                  defaultValue={s.roof_tilt_deg ?? ""}
                />
              </Field>
              <Field label="Available area (sqm)">
                <Input
                  name="available_area_sqm"
                  type="number"
                  step="0.1"
                  defaultValue={s.available_area_sqm ?? ""}
                />
              </Field>
              <Field label="Main breaker (A)">
                <Input
                  name="main_breaker_amps"
                  type="number"
                  step="1"
                  defaultValue={s.main_breaker_amps ?? ""}
                />
              </Field>
            </div>
          </div>

          <Field label="Notes">
            <Textarea name="notes" rows={3} defaultValue={s.notes ?? ""} />
          </Field>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="submit">Save changes</Button>
          </div>
        </form>
      </Card>

      <div id="bills">
        <Card>
          <CardHeader
            title="Electric bills"
            subtitle="Upload a photo or PDF of the actual utility bill — these show up on the quotation's Load & Sizing tab for reference while entering kWh/₱ figures"
          />
          <SiteBillList bills={bills} deleteAction={boundDeleteBill} emptyLabel="No bills uploaded yet." />
          <form
            action={boundUploadBill}
            encType="multipart/form-data"
            className="grid grid-cols-1 gap-3 border-t border-black/5 px-5 py-4 sm:grid-cols-4"
          >
            <div className="sm:col-span-2">
              <Field label="Bill file (JPG, PNG, HEIC, or PDF — up to 15 MB)">
                <Input name="file" type="file" accept=".jpg,.jpeg,.png,.webp,.heic,.pdf" required />
              </Field>
            </div>
            <Field label="Bill month (optional)">
              <Select name="period_month" defaultValue="">
                <option value="">—</option>
                {MONTH_NAMES.map((m, i) => (
                  <option key={m} value={i + 1}>{m}</option>
                ))}
              </Select>
            </Field>
            <Field label="Bill year (optional)">
              <Input name="period_year" type="number" defaultValue="" placeholder={String(thisYear)} />
            </Field>
            <div className="sm:col-span-4">
              <Field label="Notes (optional)">
                <Input name="notes" placeholder="e.g. Meralco account no. on file" />
              </Field>
            </div>
            <div className="sm:col-span-4 flex justify-end">
              <Button type="submit" size="sm">Upload bill</Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
