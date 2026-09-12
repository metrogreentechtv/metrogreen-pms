import { createClient } from "@/lib/supabase/server";
import { Button, Card, CardHeader, Field, Input, Select } from "@/components/ui";
import type { Customer, Site } from "@/lib/types";
import { createQuotation } from "../actions";

const SERVICE_TYPES = [
  ["supply_and_installation", "Supply and installation"],
  ["design_and_installation", "Design and installation"],
  ["design_and_project_management", "Design and project management"],
  ["installation_only", "Installation only"],
  ["supply_only", "Supply only"],
  ["operation_and_maintenance", "Operation and maintenance"],
  ["rehabilitation", "Rehabilitation"],
] as const;

const SYSTEM_TYPES = [
  ["on_grid", "On-grid"],
  ["hybrid", "Hybrid"],
  ["off_grid", "Off-grid"],
  ["solar_bess", "Solar + BESS"],
] as const;

export default async function NewQuotationPage({
  searchParams,
}: {
  searchParams: { customer?: string };
}) {
  const supabase = await createClient();

  const [{ data: customers }, { data: sites }, { data: salesRoles }, { data: engineerRoles }] =
    await Promise.all([
      supabase.from("customers").select("*").eq("is_active", true).order("customer_name"),
      supabase.from("sites").select("*").is("deleted_at", null).order("site_name"),
      supabase.from("user_roles").select("user_id, user_profiles(id, full_name)").eq("role", "sales"),
      supabase.from("user_roles").select("user_id, user_profiles(id, full_name)").eq("role", "engineer"),
    ]);

  const customerList = (customers ?? []) as Customer[];
  const siteList = (sites ?? []) as Site[];
  const customerById = new Map(customerList.map((c) => [c.id, c]));

  type RoleUser = { user_id: string; user_profiles: { id: string; full_name: string } | null };
  const salesUsers = ((salesRoles ?? []) as unknown as RoleUser[]).filter((r) => r.user_profiles);
  const engineerUsers = ((engineerRoles ?? []) as unknown as RoleUser[]).filter((r) => r.user_profiles);

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">New quotation</h1>
        <p className="text-sm text-neutral-500">
          The quotation number is assigned automatically. Revision 00 opens in draft.
        </p>
      </div>

      <Card>
        <CardHeader title="Quotation details" />
        <form action={createQuotation} className="space-y-4 px-5 py-5">
          <Field label="Customer">
            <Select name="customer_id" required defaultValue={searchParams?.customer ?? ""}>
              <option value="" disabled>
                Select a customer…
              </option>
              {customerList.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.customer_no} · {c.customer_name}
                  {c.company_name ? ` (${c.company_name})` : ""}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Site (optional)" hint="Sites are listed with their customer for now.">
            <Select name="site_id" defaultValue="">
              <option value="">No site selected</option>
              {siteList.map((s) => (
                <option key={s.id} value={s.id}>
                  {customerById.get(s.customer_id)?.customer_name ?? "—"} · {s.site_name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Project name">
            <Input name="project_name" required placeholder="e.g. 100 kWp Rooftop Solar PV System" />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Service type">
              <Select name="service_type" defaultValue="supply_and_installation" required>
                {SERVICE_TYPES.map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="System type">
              <Select name="system_type" defaultValue="on_grid" required>
                {SYSTEM_TYPES.map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Assigned salesperson" hint="Defaults to you if left blank.">
              <Select name="assigned_sales_id" defaultValue="">
                <option value="">Me</option>
                {salesUsers.map((r) => (
                  <option key={r.user_id} value={r.user_id}>
                    {r.user_profiles?.full_name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Assigned engineer">
              <Select name="assigned_engineer_id" defaultValue="">
                <option value="">Unassigned</option>
                {engineerUsers.map((r) => (
                  <option key={r.user_id} value={r.user_id}>
                    {r.user_profiles?.full_name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit">Create quotation</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
