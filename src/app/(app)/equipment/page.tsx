import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import { canSeeCost } from "@/lib/roles";
import { Badge, Card, EmptyState, Input } from "@/components/ui";
import { formatNumber, formatPct, formatPhp } from "@/lib/format";
import type { EquipmentCurrentPriceView } from "@/lib/types";

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
    .order("category_name")
    .order("description");

  if (q) {
    query = query.or(
      `description.ilike.%${q}%,manufacturer.ilike.%${q}%,model.ilike.%${q}%,sku.ilike.%${q}%`
    );
  }
  if (searchParams?.category) {
    query = query.eq("category_code", searchParams.category);
  }

  const { data, error } = await query;
  const items = (data ?? []) as EquipmentCurrentPriceView[];

  const grouped = items.reduce<Record<string, EquipmentCurrentPriceView[]>>((acc, item) => {
    (acc[item.category_name] ??= []).push(item);
    return acc;
  }, {});

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

      {Object.entries(grouped).map(([category, rows]) => (
        <Card key={category}>
          <div className="border-b border-black/5 px-5 py-3">
            <h2 className="text-sm font-semibold text-neutral-900">{category}</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-50 text-xs text-neutral-500">
                <tr>
                  <th className="px-5 py-2.5 font-medium">Description</th>
                  <th className="px-5 py-2.5 font-medium">Manufacturer / Model</th>
                  <th className="px-5 py-2.5 font-medium">Unit</th>
                  {showCost && <th className="px-5 py-2.5 font-medium">Cost</th>}
                  {showCost && <th className="px-5 py-2.5 font-medium">Markup</th>}
                  <th className="px-5 py-2.5 font-medium">Price status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-neutral-50">
                    <td className="px-5 py-2.5">
                      <Link href={`/equipment/${r.id}`} className="font-medium text-brand-700 hover:underline">
                        {r.description}
                      </Link>
                      <p className="text-xs text-neutral-400">{r.sku}</p>
                    </td>
                    <td className="px-5 py-2.5 text-neutral-600">
                      {[r.manufacturer, r.model].filter(Boolean).join(" · ") || "—"}
                    </td>
                    <td className="px-5 py-2.5 text-neutral-600">{r.unit}</td>
                    {showCost && (
                      <td className="px-5 py-2.5 tabular-nums text-neutral-800">
                        {formatPhp(r.cost_price_php)}
                      </td>
                    )}
                    {showCost && (
                      <td className="px-5 py-2.5 tabular-nums text-neutral-800">
                        {formatPct(r.default_markup_rate)}
                      </td>
                    )}
                    <td className="px-5 py-2.5">
                      {r.price_record_id ? (
                        r.price_is_stale ? (
                          <Badge tone="amber">Stale · {formatNumber(r.price_age_days, 0)}d</Badge>
                        ) : (
                          <Badge tone="green">Current</Badge>
                        )
                      ) : (
                        <Badge tone="red">No price on file</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ))}

      {items.length === 0 && !error && (
        <Card className="px-5 py-6">
          <EmptyState title="No equipment found" description={q ? "Try a different search." : undefined} />
        </Card>
      )}
    </div>
  );
}
