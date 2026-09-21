import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import { canEditBom } from "@/lib/roles";
import { Badge, Button, Card, CardHeader, EmptyState, Field, Input } from "@/components/ui";
import type { EquipmentCategory } from "@/lib/types";
import { createCategory, setCategoryActive, updateCategory } from "./actions";

export default async function EquipmentCategoriesPage() {
  const user = await getCurrentUser();
  if (!user || !canEditBom(user.roles)) redirect("/dashboard");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("equipment_categories")
    .select("*")
    .order("sort_order")
    .order("name");
  const categories = (data ?? []) as EquipmentCategory[];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Equipment categories</h1>
        <p className="text-sm text-neutral-500">
          The category list a BOM line, equipment item, or BOM template line is filed under —
          drives the Equipment catalog&apos;s grouping, the BOQ tab&apos;s category picker, and which
          items count as &quot;Main Materials.&quot; Deactivating a category keeps it correctly labeled
          on anything that already uses it, but hides it from new selections everywhere in the app.
        </p>
      </div>

      {error && (
        <Card className="px-5 py-4 text-sm text-red-700">Could not load categories: {error.message}</Card>
      )}

      <Card>
        {categories.length === 0 && !error ? (
          <div className="px-5 py-6">
            <EmptyState
              title="No categories yet"
              description="Add the categories BOM lines and equipment get filed under."
            />
          </div>
        ) : (
          <div className="divide-y divide-black/5">
            {categories.map((c) => (
              <div key={c.id} className="flex flex-wrap items-end gap-3 px-5 py-4">
                <form
                  id={`category-${c.id}`}
                  action={updateCategory.bind(null, c.id)}
                  className="flex flex-1 flex-wrap items-end gap-3"
                >
                  <div className="w-28">
                    <Field label="Code">
                      <Input value={c.code} disabled className="bg-neutral-50 text-neutral-500" />
                    </Field>
                  </div>
                  <div className="w-full sm:w-auto sm:flex-1 sm:min-w-[180px]">
                    <Field label="Name">
                      <Input name="name" defaultValue={c.name} required />
                    </Field>
                  </div>
                  <div className="w-24">
                    <Field label="Sort">
                      <Input name="sort_order" type="number" defaultValue={c.sort_order} />
                    </Field>
                  </div>
                  <div className="flex items-center gap-4 pb-2.5">
                    <label className="flex items-center gap-1.5 text-sm text-neutral-700">
                      <input
                        type="checkbox"
                        name="is_material"
                        defaultChecked={c.is_material}
                        className="rounded"
                      />
                      Material
                    </label>
                    <label className="flex items-center gap-1.5 text-sm text-neutral-700">
                      <input
                        type="checkbox"
                        name="is_cost_only"
                        defaultChecked={c.is_cost_only}
                        className="rounded"
                      />
                      Cost-only
                    </label>
                  </div>
                </form>
                <div className="flex items-center gap-2 pb-0.5">
                  <Badge tone={c.is_active ? "green" : "neutral"}>{c.is_active ? "Active" : "Inactive"}</Badge>
                  <Button type="submit" form={`category-${c.id}`} size="sm" variant="secondary">
                    Save
                  </Button>
                  <form
                    action={setCategoryActive.bind(null, c.id, !c.is_active)}
                    onSubmit={(e) => {
                      if (
                        c.is_active &&
                        !confirm(
                          `Deactivate "${c.name}"? It stays correctly labeled on anything that already uses it, but won't be offered for new equipment, BOM lines, or templates.`
                        )
                      ) {
                        e.preventDefault();
                      }
                    }}
                  >
                    <Button type="submit" size="sm" variant="ghost">
                      {c.is_active ? "Deactivate" : "Activate"}
                    </Button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <CardHeader title="Add a category" />
        <form action={createCategory} className="space-y-4 px-5 py-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Name">
              <Input name="name" required placeholder="e.g. Rapid Shutdown" />
            </Field>
            <Field label="Code (optional — derived from name if left blank)">
              <Input name="code" placeholder="e.g. rapid_shutdown" />
            </Field>
            <Field label="Sort order">
              <Input name="sort_order" type="number" defaultValue={100} />
            </Field>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-1.5 text-sm text-neutral-700">
              <input type="checkbox" name="is_material" defaultChecked className="rounded" />
              Material (shows on the Equipment catalog, selectable on a BOM line)
            </label>
            <label className="flex items-center gap-1.5 text-sm text-neutral-700">
              <input type="checkbox" name="is_cost_only" className="rounded" />
              Cost-only (a service/labor line, not a physical stocked item)
            </label>
          </div>
          <div className="flex justify-end">
            <Button type="submit" size="sm">
              Add category
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
