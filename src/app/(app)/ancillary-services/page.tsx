import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import { canEditBom } from "@/lib/roles";
import { Badge, Button, Card, CardHeader, EmptyState, Field, Input, Select, Textarea } from "@/components/ui";
import { PROPOSAL_GROUPS } from "@/lib/proposal-bom";
import type { AncillaryService, EquipmentCategory } from "@/lib/types";
import { createAncillaryService, setAncillaryServiceActive, updateAncillaryService } from "./actions";

const PRICING_METHODS: { value: AncillaryService["pricing_method"]; label: string }[] = [
  { value: "flat", label: "Flat (one lot)" },
  { value: "per_sqm", label: "Per square meter" },
  { value: "per_linear_meter", label: "Per linear meter" },
  { value: "per_unit", label: "Per unit" },
];

export default async function AncillaryServicesPage() {
  const user = await getCurrentUser();
  if (!user || !canEditBom(user.roles)) redirect("/dashboard");

  const supabase = await createClient();
  const [{ data, error }, { data: categoryRows }] = await Promise.all([
    supabase.from("ancillary_services").select("*").order("sort_order").order("name"),
    supabase.from("equipment_categories").select("*").eq("is_active", true).order("sort_order"),
  ]);
  const services = (data ?? []) as AncillaryService[];
  const categories = (categoryRows ?? []) as EquipmentCategory[];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Ancillary services</h1>
        <p className="text-sm text-neutral-500">
          Non-equipment services — Mobilization/Demobilization, trenching, canopy or roofing
          fabrication, roof painting, service entrance remodeling, and any others — offered as
          "+ Add ancillary service" on a quotation&apos;s BOQ tab. Deactivating one keeps it on quotations
          that already used it, but hides it from new selections.
        </p>
      </div>

      {error && (
        <Card className="px-5 py-4 text-sm text-red-700">Could not load ancillary services: {error.message}</Card>
      )}

      <Card>
        {services.length === 0 && !error ? (
          <div className="px-5 py-6">
            <EmptyState
              title="No ancillary services yet"
              description="Add Mobilization/Demobilization and any other non-equipment services quotations should be able to add."
            />
          </div>
        ) : (
          <div className="divide-y divide-black/5">
            {services.map((s) => (
              <div key={s.id} className="space-y-3 px-5 py-4">
                <form
                  id={`ancillary-service-${s.id}`}
                  action={updateAncillaryService.bind(null, s.id)}
                  className="grid grid-cols-1 gap-3 sm:grid-cols-6"
                >
                  <div className="sm:col-span-2">
                    <Field label="Name">
                      <Input name="name" defaultValue={s.name} required />
                    </Field>
                  </div>
                  <Field label="Pricing method">
                    <Select name="pricing_method" defaultValue={s.pricing_method}>
                      {PRICING_METHODS.map((p) => (
                        <option key={p.value} value={p.value}>
                          {p.label}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Rate (₱)">
                    <Input name="rate_php" type="number" step="0.01" defaultValue={s.rate_php} />
                  </Field>
                  <Field label="Unit label">
                    <Input name="unit_label" defaultValue={s.unit_label ?? ""} placeholder="sqm, lm, lot…" />
                  </Field>
                  <Field label="Sort">
                    <Input name="sort_order" type="number" defaultValue={s.sort_order} />
                  </Field>
                  <Field label="Default category">
                    <Select name="default_category_id" defaultValue={s.default_category_id ?? ""}>
                      <option value="">—</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Proposal grouping">
                    <Select name="default_proposal_group" defaultValue={s.default_proposal_group ?? ""}>
                      <option value="">Not on Proposal</option>
                      {PROPOSAL_GROUPS.map((g) => (
                        <option key={g.value} value={g.value}>
                          {g.label}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <div className="sm:col-span-3">
                    <Field label="Notes">
                      <Textarea name="notes" rows={1} defaultValue={s.notes ?? ""} />
                    </Field>
                  </div>
                </form>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Badge tone={s.is_active ? "green" : "neutral"}>{s.is_active ? "Active" : "Inactive"}</Badge>
                    {s.rate_php === 0 && <Badge tone="amber">Rate not yet set</Badge>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button type="submit" form={`ancillary-service-${s.id}`} size="sm" variant="secondary">
                      Save
                    </Button>
                    <form action={setAncillaryServiceActive.bind(null, s.id, !s.is_active)}>
                      <Button type="submit" size="sm" variant="ghost">
                        {s.is_active ? "Deactivate" : "Activate"}
                      </Button>
                    </form>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <CardHeader title="Add an ancillary service" />
        <form action={createAncillaryService} className="space-y-4 px-5 py-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Name">
              <Input name="name" required placeholder="e.g. Trenching" />
            </Field>
            <Field label="Pricing method">
              <Select name="pricing_method" defaultValue="flat">
                {PRICING_METHODS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Rate (₱)">
              <Input name="rate_php" type="number" step="0.01" defaultValue={0} />
            </Field>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Unit label">
              <Input name="unit_label" placeholder="sqm, lm, lot…" />
            </Field>
            <Field label="Default category">
              <Select name="default_category_id" defaultValue="">
                <option value="">—</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Proposal grouping">
              <Select name="default_proposal_group" defaultValue="additional_works">
                <option value="">Not on Proposal</option>
                {PROPOSAL_GROUPS.map((g) => (
                  <option key={g.value} value={g.value}>
                    {g.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Notes">
            <Textarea name="notes" rows={2} />
          </Field>
          <div className="flex justify-end">
            <Button type="submit" size="sm">
              Add service
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
