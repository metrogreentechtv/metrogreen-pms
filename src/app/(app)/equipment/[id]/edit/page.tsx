import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import { canManageEquipment } from "@/lib/roles";
import { Button, Card, CardHeader, Field, Input, LinkButton, Select } from "@/components/ui";
import type { Equipment, EquipmentCategory } from "@/lib/types";
import { updateEquipment } from "../../actions";

export default async function EditEquipmentPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user || !canManageEquipment(user.roles)) {
    redirect(`/equipment/${params.id}`);
  }

  const supabase = await createClient();
  const [{ data: equipment }, { data: categoryRows }] = await Promise.all([
    supabase.from("equipment").select("*").eq("id", params.id).maybeSingle(),
    supabase.from("equipment_categories").select("*").eq("is_active", true).order("sort_order"),
  ]);

  if (!equipment) notFound();

  const eq = equipment as Equipment;
  let categoryList = (categoryRows ?? []) as EquipmentCategory[];
  // Safety net: if this item's own category has since been soft-retired (see
  // the 2026-09-14 inventory recategorization), it won't be in the active
  // list above — add it back in so the form doesn't silently drop/blank the
  // item's category on save.
  if (!categoryList.some((c) => c.id === eq.category_id)) {
    const { data: ownCategory } = await supabase
      .from("equipment_categories")
      .select("*")
      .eq("id", eq.category_id)
      .maybeSingle();
    if (ownCategory) categoryList = [...categoryList, ownCategory as EquipmentCategory];
  }

  const boundUpdateEquipment = updateEquipment.bind(null, eq.id);

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">Edit equipment</h1>
          <p className="text-sm text-neutral-500">{eq.sku}</p>
        </div>
        <LinkButton href={`/equipment/${eq.id}`} variant="secondary" size="sm">
          Cancel
        </LinkButton>
      </div>

      <Card>
        <CardHeader title="Equipment details" />
        <form action={boundUpdateEquipment} className="space-y-4 px-5 py-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="SKU">
              <Input name="sku" required defaultValue={eq.sku} />
            </Field>
            <Field label="Category">
              <Select name="category_id" required defaultValue={eq.category_id}>
                {categoryList.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <Field label="Description">
            <Input name="description" required defaultValue={eq.description} />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Manufacturer (optional)">
              <Input name="manufacturer" defaultValue={eq.manufacturer ?? ""} />
            </Field>
            <Field label="Model (optional)">
              <Input name="model" defaultValue={eq.model ?? ""} />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Unit">
              <Input name="unit" required defaultValue={eq.unit} placeholder="pc, m, lot…" />
            </Field>
            <Field label="Quantity on hand (optional)">
              <Input
                name="quantity_on_hand"
                type="number"
                step="0.01"
                defaultValue={eq.quantity_on_hand ?? ""}
                placeholder="Not tracked"
              />
            </Field>
            <Field label="Reorder point (optional)">
              <Input
                name="reorder_point"
                type="number"
                step="0.01"
                defaultValue={eq.reorder_point ?? ""}
              />
            </Field>
          </div>

          <Field label="Warranty terms (optional)">
            <Input name="warranty_terms" defaultValue={eq.warranty_terms ?? ""} />
          </Field>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="submit">Save changes</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
