import { Card, CardHeader, Field, Input, Select, Textarea, Button } from "@/components/ui";
import { createCustomer } from "../actions";

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

export default function NewCustomerPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">New customer</h1>
        <p className="text-sm text-neutral-500">
          The customer number is assigned automatically.
        </p>
      </div>

      <Card>
        <CardHeader title="Customer details" />
        <form action={createCustomer} className="space-y-4 px-5 py-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Customer / contact name">
              <Input name="customer_name" required placeholder="Juan Dela Cruz" />
            </Field>
            <Field label="Company name (optional)">
              <Input name="company_name" placeholder="Sample Manufacturing Corp." />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Customer type">
              <Select name="customer_type" defaultValue="residential" required>
                {CUSTOMER_TYPES.map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Industry (optional)">
              <Input name="industry" placeholder="Food manufacturing" />
            </Field>
          </div>

          <Field label="Billing address">
            <Input name="billing_address" placeholder="Lot 5 Industrial Park" />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="City">
              <Input name="city" placeholder="Meycauayan" />
            </Field>
            <Field label="Province">
              <Input name="province" placeholder="Bulacan" />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Lead source">
              <Select name="lead_source" defaultValue="referral" required>
                {LEAD_SOURCES.map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Lead source detail (optional)">
              <Input name="lead_source_detail" placeholder="Referred by…" />
            </Field>
          </div>

          <Field label="Notes">
            <Textarea name="notes" rows={3} />
          </Field>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="submit">Create customer</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
