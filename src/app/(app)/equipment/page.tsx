import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import { canSeeCost } from "@/lib/roles";
import { Card, EmptyState, Input } from "@/components/ui";
import { EquipmentCategoryTable } from "@/components/equipment/EquipmentCategoryTable";
import { InventoryTabs } from "@/components/equipment/InventoryTabs";
import type { EquipmentCurrentPriceView } from "@/lib/types";

// The three categories that drive a quotation's major-equipment slots —
// everything else in the catalog (mounting, wiring/protection, conduits,
// grounding, etc.) is a supporting "Equipment" item, not a main material.
// Matched by category code (stable) rather than name (Joel could rename a
// category's display label later without meaning to move it between tabs).
const MAIN_MATERIAL_CODES = new Set(["solar_panels", "inverters", "batteries"]);

export default async function EquipmentPage({
  searchParams,
}: {
  searchParams: { q?: string; category?: string };
}) {
  const supabase = await createClient();
  const user = await getCurrentUser();
  const showCost = user ? canSeeCost(user.roles) : false;
  const q = searchParams?.q?.trim();

  let query = supabase
    .from("v_equipment_current_price")
    .select("*")
    .eq("is_active", true)
    .order("description");

  if (q) {
    query = query.or(
      `description.ilike.%${q}%,manufacturer.ilike.%${q}%,model.ilike.%${q}%,sku.ilike.%${q}%`
    );
  }
  if (searchParams?.category) {
    query = query.eq("category_code", searchParams.category);
  }

  const [{ data, error }, { data: categoryRows }] = await Promise.all([
    query,
    supabase
      .from("equipment_categories")
      .select("id, code, name")
      .eq("is_active", true)
      .order("sort_order"),
  ]);
  const items = (data ?? []) as EquipmentCurrentPriceView[];

  // Grouped and ordered by the catalog's own sort_order (Solar Panels → Inverter →
  // Rapid Shutdown → … → Grounding), not alphabetically by category name.
  const grouped = items.reduce<Record<string, EquipmentCurrentPriceView[]>>((acc, item) => {
    (acc[item.category_id] ??= []).push(item);
    return acc;
  }, {});
  const orderedGroups = (categoryRows ?? [])
    .map((c) => ({
      name: c.name as string,
      code: c.code as string,
      rows: grouped[c.id as string] ?? [],
    }))
    .filter((g) => g.rows.length > 0);

  const mainGroups = orderedGroups.filter((g) => MAIN_MATERIAL_CODES.has(g.code));
  const equipmentGroups = orderedGroups.filter((g) => !MAIN_MATERIAL_CODES.has(g.code));

  const renderGroups = (groups: typeof orderedGroups, emptyDescription: string) =>
    groups.length > 0 ? (
      <div className="space-y-5">
        {groups.map(({ name, rows }) => (
          <EquipmentCategoryTable key={name} category={name} rows={rows} showCost={showCost} />
        ))}
      </div>
    ) : (
      <Card className="px-5 py-6">
        <EmptyState title="Nothing here yet" description={q ? "Try a different search." : emptyDescription} />
      </Card>
    );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Equipment catalog</h1>
        <p className="text-sm text-neutral-500">
          Master equipment list with current pricing.{" "}
          {!showCost && "Cost and markup are hidden for your role — you see current selling reference only where applicable."}
        </p>
      </div>

      <form className="max-w-sm">
        <Input type="search" name="q" defaultValue={q} placeholder="Search description, brand, model, SKU…" />
      </form>

      {error && (
        <Card className="px-5 py-4 text-sm text-red-700">
          Could not load equipment: {error.message}
        </Card>
      )}

      {!error && items.length === 0 && (
        <Card className="px-5 py-6">
          <EmptyState title="No equipment found" description={q ? "Try a different search." : undefined} />
        </Card>
      )}

      {!error && items.length > 0 && (
        <InventoryTabs
          main={renderGroups(mainGroups, "No solar panel, inverter, or battery items on file yet.")}
          equipments={renderGroups(equipmentGroups, "No other equipment items on file yet.")}
        />
      )}
    </div>
  );
}
