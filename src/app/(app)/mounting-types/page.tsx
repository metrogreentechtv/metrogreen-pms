import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import { canEditBom } from "@/lib/roles";
import { Badge, Button, Card, CardHeader, EmptyState, Field, Input, Textarea } from "@/components/ui";
import type { MountingType } from "@/lib/types";
import { createMountingType, setMountingTypeActive, updateMountingType } from "./actions";

export default async function MountingTypesPage() {
  const user = await getCurrentUser();
  if (!user || !canEditBom(user.roles)) redirect("/dashboard");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("mounting_types")
    .select("*")
    .order("sort_order")
    .order("name");
  const mountingTypes = (data ?? []) as MountingType[];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Mounting types</h1>
        <p className="text-sm text-neutral-500">
          The mounting-structure options offered on a quotation&apos;s System Design tab, each with a
          reference price per kWp of DC capacity. Deactivating one keeps it available on quotations
          that already use it, but hides it from new selections.
        </p>
      </div>

      {error && (
        <Card className="px-5 py-4 text-sm text-red-700">Could not load mounting types: {error.message}</Card>
      )}

      <Card>
        {mountingTypes.length === 0 && !error ? (
          <div className="px-5 py-6">
            <EmptyState
              title="No mounting types yet"
              description="Add roof mount, ground mount, carport, ballasted, etc. — each with its reference price per kWp."
            />
          </div>
        ) : (
          <div className="divide-y divide-black/5">
            {mountingTypes.map((m) => (
              <div key={m.id} className="flex flex-wrap items-end gap-3 px-5 py-4">
                <form
                  id={`mounting-type-${m.id}`}
                  action={updateMountingType.bind(null, m.id)}
                  className="flex flex-1 flex-wrap items-end gap-3"
                >
                  <div className="w-full sm:w-auto sm:flex-1 sm:min-w-[200px]">
                    <Field label="Name">
                      <Input name="name" defaultValue={m.name} required />
                    </Field>
                  </div>
                  <div className="w-40">
                    <Field label="Price per kWp (₱)">
                      <Input name="price_per_kwp_php" type="number" step="0.01" defaultValue={m.price_per_kwp_php} />
                    </Field>
                  </div>
                  <div className="w-full sm:w-auto sm:flex-1 sm:min-w-[200px]">
                    <Field label="Notes">
                      <Textarea name="notes" rows={1} defaultValue={m.notes ?? ""} />
                    </Field>
                  </div>
                  <div className="w-24">
                    <Field label="Sort">
                      <Input name="sort_order" type="number" defaultValue={m.sort_order} />
                    </Field>
                  </div>
                </form>
                <div className="flex items-center gap-2 pb-0.5">
                  <Badge tone={m.is_active ? "green" : "neutral"}>{m.is_active ? "Active" : "Inactive"}</Badge>
                  <Button type="submit" form={`mounting-type-${m.id}`} size="sm" variant="secondary">
                    Save
                  </Button>
                  <form action={setMountingTypeActive.bind(null, m.id, !m.is_active)}>
                    <Button type="submit" size="sm" variant="ghost">
                      {m.is_active ? "Deactivate" : "Activate"}
                    </Button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <CardHeader title="Add a mounting type" />
        <form action={createMountingType} className="space-y-4 px-5 py-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Name">
              <Input name="name" required placeholder="e.g. Roof Mount — Tilted Rail" />
            </Field>
            <Field label="Price per kWp (₱)">
              <Input name="price_per_kwp_php" type="number" step="0.01" defaultValue={0} />
            </Field>
            <Field label="Sort order">
              <Input name="sort_order" type="number" defaultValue={100} />
            </Field>
          </div>
          <Field label="Notes">
            <Textarea name="notes" rows={2} />
          </Field>
          <div className="flex justify-end">
            <Button type="submit" size="sm">
              Add mounting type
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
