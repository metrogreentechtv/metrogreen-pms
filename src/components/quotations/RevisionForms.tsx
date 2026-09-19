import { Button, Card, CardHeader, Field, Input, Select, Textarea } from "@/components/ui";
import { formatNumber, formatPhp } from "@/lib/format";
import type {
  MountingType,
  RevisionConfiguration,
  RevisionCosting,
  RevisionPricing,
  QuotationRevision,
} from "@/lib/types";

export function ConfigurationForm({
  cfg,
  mountingTypes,
  editable,
  action,
  recalcAction,
}: {
  cfg: RevisionConfiguration;
  mountingTypes: MountingType[];
  editable: boolean;
  action: (formData: FormData) => Promise<void>;
  recalcAction: () => Promise<void>;
}) {
  const selectedMountingType = mountingTypes.find((m) => m.id === cfg.mounting_type_id);
  const mountingReferenceCost =
    selectedMountingType && cfg.dc_capacity_kwp
      ? selectedMountingType.price_per_kwp_php * cfg.dc_capacity_kwp
      : null;
  return (
    <Card>
      <CardHeader
        title="System configuration"
        subtitle="Freely-designed system spec — recommend it off Load & Sizing, or type in whatever the site calls for. Drives the energy, savings, and payback estimates."
      />
      {editable ? (
        <form action={action} className="space-y-4 px-5 py-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Module" hint="Free text — brand/model, e.g. Jinko 585W Bifacial">
              <Input name="module_name" defaultValue={cfg.module_name ?? ""} />
            </Field>
            <Field label="Module quantity">
              <Input name="module_quantity" type="number" defaultValue={cfg.module_quantity ?? ""} />
            </Field>
            <Field label="DC capacity (kWp)">
              <Input name="dc_capacity_kwp" type="number" step="0.001" defaultValue={cfg.dc_capacity_kwp ?? ""} />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Inverter" hint="Free text — brand/model">
              <Input name="inverter_name" defaultValue={cfg.inverter_name ?? ""} />
            </Field>
            <Field label="Inverter quantity">
              <Input name="inverter_quantity" type="number" defaultValue={cfg.inverter_quantity ?? ""} />
            </Field>
            <Field label="Inverter AC total (kW)">
              <Input
                name="inverter_ac_kw_total"
                type="number"
                step="0.01"
                defaultValue={cfg.inverter_ac_kw_total ?? ""}
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Battery" hint="Free text — leave blank for on-grid, no storage">
              <Input name="battery_name" defaultValue={cfg.battery_name ?? ""} />
            </Field>
            <Field label="Battery quantity">
              <Input name="battery_quantity" type="number" defaultValue={cfg.battery_quantity ?? ""} />
            </Field>
            <Field label="Battery usable total (kWh)">
              <Input
                name="battery_usable_kwh_total"
                type="number"
                step="0.01"
                defaultValue={cfg.battery_usable_kwh_total ?? ""}
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field
              label="Mounting type"
              hint={
                mountingReferenceCost != null
                  ? `Reference cost: ${formatPhp(mountingReferenceCost)} (${formatPhp(
                      selectedMountingType!.price_per_kwp_php
                    )}/kWp × ${formatNumber(cfg.dc_capacity_kwp ?? 0, 1)} kWp)`
                  : "Managed under Mounting Types (Admin)"
              }
            >
              <Select name="mounting_type_id" defaultValue={cfg.mounting_type_id ?? ""}>
                <option value="">—</option>
                {mountingTypes.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({formatPhp(m.price_per_kwp_php)}/kWp)
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Peak sun hours override" hint="Leave blank to use the site/system default">
              <Input
                name="peak_sun_hours_used"
                type="number"
                step="0.01"
                defaultValue={cfg.peak_sun_hours_used ?? ""}
              />
            </Field>
            <Field label="Performance ratio override">
              <Input
                name="performance_ratio_used"
                type="number"
                step="0.01"
                defaultValue={cfg.performance_ratio_used ?? ""}
              />
            </Field>
            <Field label="Analysis period (years)">
              <Input name="analysis_years" type="number" defaultValue={cfg.analysis_years ?? 25} />
            </Field>
          </div>

          <div className="flex justify-end">
            <Button type="submit" size="sm">
              Save configuration
            </Button>
          </div>
        </form>
      ) : (
        <div className="px-5 py-4 text-sm text-neutral-600">
          Locked outside draft — showing last saved configuration. Create a new revision to change it.
        </div>
      )}

      <div className="border-t border-black/5 px-5 py-4">
        <p className="mb-2 text-xs text-neutral-500">
          Technical output from the configuration above. Full financial results (savings, payback,
          NPV/IRR/LCOE) are on the ROI tab.
        </p>
        <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
          <Stat label="Annual generation" value={cfg.annual_kwh_year1 ? `${formatNumber(cfg.annual_kwh_year1, 0)} kWh` : "—"} />
          <Stat label="Required roof area" value={cfg.required_area_sqm ? `${formatNumber(cfg.required_area_sqm, 0)} m²` : "—"} />
          <Stat label="DC:AC ratio" value={cfg.dc_ac_ratio ? formatNumber(cfg.dc_ac_ratio, 2) : "—"} />
        </div>
        {editable && (
          <form action={recalcAction} className="mt-3">
            <Button type="submit" size="sm" variant="secondary">
              Recalculate engineering estimates
            </Button>
          </form>
        )}
      </div>
    </Card>
  );
}

export function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] text-neutral-400">{label}</p>
      <p className="font-medium text-neutral-800">{value}</p>
    </div>
  );
}

export function CostingForm({
  costing,
  editable,
  action,
}: {
  costing: RevisionCosting;
  editable: boolean;
  action: (formData: FormData) => Promise<void>;
}) {
  if (!editable) return null;
  return (
    <Card>
      <CardHeader title="Pricing mode" subtitle="How the selling price is derived from cost" />
      <form action={action} className="space-y-4 px-5 py-5">
        <Field label="Pricing mode">
          <Select name="pricing_mode" defaultValue={costing.pricing_mode}>
            <option value="target_margin">Target gross margin (price = cost ÷ (1 − margin))</option>
            <option value="markup_on_cost">Markup on cost (price = cost × (1 + markup))</option>
          </Select>
        </Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Target gross margin (%)">
            <Input
              name="target_gross_margin"
              type="number"
              step="0.01"
              defaultValue={costing.target_gross_margin != null ? costing.target_gross_margin * 100 : 25}
            />
          </Field>
          <Field label="Markup on cost (%)">
            <Input
              name="markup_rate"
              type="number"
              step="0.01"
              defaultValue={costing.markup_rate != null ? costing.markup_rate * 100 : 25}
            />
          </Field>
          <Field label="Contingency (%)">
            <Input
              name="contingency_rate"
              type="number"
              step="0.01"
              defaultValue={costing.contingency_rate * 100}
            />
          </Field>
        </div>
        <Field label="Minimum gross margin required (%)" hint="Approval is blocked below this unless overridden">
          <Input
            name="min_margin_required"
            type="number"
            step="0.01"
            defaultValue={costing.min_margin_required != null ? costing.min_margin_required * 100 : 15}
          />
        </Field>
        <div className="flex justify-end">
          <Button type="submit" size="sm">
            Save &amp; recalculate
          </Button>
        </div>
      </form>
    </Card>
  );
}

export function PricingForm({
  pricing,
  editable,
  action,
}: {
  pricing: RevisionPricing;
  editable: boolean;
  action: (formData: FormData) => Promise<void>;
}) {
  if (!editable) return null;
  return (
    <Card>
      <CardHeader title="VAT &amp; discount" />
      <form action={action} className="space-y-4 px-5 py-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="VAT treatment">
            <Select name="vat_treatment" defaultValue={pricing.vat_treatment}>
              <option value="exclusive">Exclusive (added on top)</option>
              <option value="inclusive">Inclusive (already in price)</option>
              <option value="zero_rated">Zero-rated</option>
            </Select>
          </Field>
          <Field label="Discount (₱)">
            <Input name="discount_php" type="number" step="0.01" defaultValue={pricing.discount_php} />
          </Field>
        </div>
        <div className="flex justify-end">
          <Button type="submit" size="sm">
            Save &amp; recalculate
          </Button>
        </div>
      </form>
    </Card>
  );
}

export function RevisionHeaderForm({
  revision,
  action,
}: {
  revision: QuotationRevision;
  action: (formData: FormData) => Promise<void>;
}) {
  return (
    <Card>
      <CardHeader
        title="Quotation terms &amp; details"
        subtitle="Editable at any status — fixes a typo without needing a new revision"
      />
      <form action={action} className="space-y-4 px-5 py-5">
        <Field label="Validity (days)">
          <Input name="validity_days" type="number" defaultValue={revision.validity_days} className="max-w-[140px]" />
        </Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Payment terms">
            <Textarea name="payment_terms" rows={2} defaultValue={revision.payment_terms ?? ""} />
          </Field>
          <Field label="Delivery timeline">
            <Textarea name="delivery_timeline" rows={2} defaultValue={revision.delivery_timeline ?? ""} />
          </Field>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Warranty terms">
            <Textarea name="warranty_terms" rows={2} defaultValue={revision.warranty_terms ?? ""} />
          </Field>
          <Field label="Net-metering note">
            <Textarea name="net_metering_note" rows={2} defaultValue={revision.net_metering_note ?? ""} />
          </Field>
        </div>
        <Field label="Scope of work">
          <Textarea name="scope_of_work" rows={3} defaultValue={revision.scope_of_work ?? ""} />
        </Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Inclusions">
            <Textarea name="inclusions" rows={3} defaultValue={revision.inclusions ?? ""} />
          </Field>
          <Field label="Exclusions">
            <Textarea name="exclusions" rows={3} defaultValue={revision.exclusions ?? ""} />
          </Field>
        </div>
        <Field label="Terms and conditions">
          <Textarea name="terms_conditions" rows={3} defaultValue={revision.terms_conditions ?? ""} />
        </Field>
        <div className="flex justify-end">
          <Button type="submit" size="sm">
            Save details
          </Button>
        </div>
      </form>
    </Card>
  );
}
