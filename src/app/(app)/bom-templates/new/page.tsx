import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { canEditBom } from "@/lib/roles";
import { Button, Card, CardHeader, Field, Input, LinkButton, Select, Textarea } from "@/components/ui";
import { createTemplate } from "../actions";

const SYSTEM_TYPES = [
  ["", "Any system type"],
  ["on_grid", "On-grid"],
  ["hybrid", "Hybrid"],
  ["off_grid", "Off-grid"],
  ["solar_bess", "Solar + BESS"],
] as const;

export default async function NewBomTemplatePage() {
  const user = await getCurrentUser();
  if (!user || !canEditBom(user.roles)) redirect("/dashboard");

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">New BOM template</h1>
          <p className="text-sm text-neutral-500">
            Name it after the tier it covers — you'll add line items after saving.
          </p>
        </div>
        <LinkButton href="/bom-templates" variant="secondary" size="sm">
          Cancel
        </LinkButton>
      </div>

      <Card>
        <CardHeader title="Template details" />
        <form action={createTemplate} className="space-y-4 px-5 py-5">
          <Field label="Template name" hint='e.g. "5kW On-Grid Standard"'>
            <Input name="name" required placeholder="5kW On-Grid Standard" />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="System size (kWp)">
              <Input name="system_size_kwp" type="number" step="0.01" required placeholder="5" />
            </Field>
            <Field label="System type">
              <Select name="system_type" defaultValue="">
                {SYSTEM_TYPES.map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <Field label="Description (optional)">
            <Textarea name="description" rows={2} placeholder="What this package is for, any notes for sales." />
          </Field>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="submit">Create template</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
