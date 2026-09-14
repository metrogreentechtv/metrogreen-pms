import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import { canWrite } from "@/lib/roles";
import { Card, CardHeader, Field, Input, Select, Textarea, Button, LinkButton } from "@/components/ui";
import type { Customer } from "@/lib/types";
import { updateCustomer } from "../../actions";

const CUSTOMER_TYPES = [
  ["residential", "Residential"],
  ["commercial", "Commercial"],
  ["industrial", "Industrial"],
  ["government", "Government"],
  ["subcontractor_client", "Subcontractor client"],
] as const;

const LEAD_SOURCES = [
  ["facebook_page", "Facebook page"],
  ["word_of_mouth", "Word of mouth"],
  ["referral", "Referral"],
  ["email", "Email"],
  ["walk_in", "Walk-in"],
  ["website", "Website"],
  ["other", "Other"],
] as const;

export default async function EditCustomerPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user || !canWrite(user.roles)) {
    redirect(`/customers/${params.id}`);
  }

  const supabase = await createClient();
  const { data: customer } = await supabase
    .from("customers")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();

  if (!customer) notFound();

  const c = customer as Customer;
  const boundUpdateCustomer = updateCustomer.bind(null, c.id);

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">Edit customer</h1>
          <p className="text-sm text-neutral-500">{c.customer_no}</p>
        </div>
        <LinkButton href={`/customers/${c.id}`} variant="secondary" size="sm">
          Cancel
        </LinkButton>
      </div>

      <Card>
        <CardHeader title="Customer details" />
        <form action={boundUpdateCustomer} className="space-y-4 px-5 py-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Customer / contact name">
              <Input name="customer_name" required defaultValue={c.customer_name} />
            </Field>
            <Field label="Company name (optional)">
              <Input name="company_name" defaultValue={c.company_name ?? ""} />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Customer type">
              <Select name="customer_type" defaultValue={c.customer_type} required>
                {CUSTOMER_TYPES.map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Industry (optional)">
              <Input name="industry" defaultValue={c.industry ?? ""} />
            </Field>
          </div>

          <Field label="Billing address">
            <Input name="billing_address" defaultValue={c.billing_address ?? ""} />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="City">
              <Input name="city" defaultValue={c.city ?? ""} />
            </Field>
            <Field label="Province">
              <Input name="province" defaultValue={c.province ?? ""} />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Lead source">
              <Select name="lead_source" defaultValue={c.lead_source} required>
                {LEAD_SOURCES.map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Lead source detail (optional)">
              <Input name="lead_source_detail" defaultValue={c.lead_source_detail ?? ""} />
            </Field>
          </div>

          <Field label="Notes">
            <Textarea name="notes" rows={3} defaultValue={c.notes ?? ""} />
          </Field>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="submit">Save changes</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
