import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import { canManageEquipment, canSeeCost } from "@/lib/roles";
import { Badge, Card, CardHeader, Field, Input, Select, Textarea, Button } from "@/components/ui";
import { formatDate, formatPhp, formatPct } from "@/lib/format";
import type { Equipment, EquipmentPrice, Supplier } from "@/lib/types";
import { addEquipmentPrice } from "../actions";

export default async function EquipmentDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await createClient();
  const user = await getCurrentUser();
  const showCost = user ? canSeeCost(user.roles) : false;
  const canManage = user ? canManageEquipment(user.roles) : false;

  const [{ data: equipment }, { data: priceHistory }, { data: suppliers }] = await Promise.all([
    supabase.from("equipment").select("*, equipment_categories(name)").eq("id", params.id).maybeSingle(),
    showCost
      ? supabase
          .from("equipment_prices")
          .select("*")
          .eq("equipment_id", params.id)
          .order("effective_from", { ascending: false })
      : Promise.resolve({ data: [] as EquipmentPrice[] }),
    canManage ? supabase.from("suppliers").select("*").eq("is_active", true).order("name") : Promise.resolve({ data: [] as Supplier[] }),
  ]);

  if (!equipment) notFound();

  const eq = equipment as Equipment & { equipment_categories: { name: string } | null };
  const prices = (priceHistory ?? []) as EquipmentPrice[];
  const supplierList = (suppliers ?? []) as Supplier[];
  const boundAddPrice = addEquipmentPrice.bind(null, eq.id);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <p className="text-xs font-medium text-brand-600">{eq.sku}</p>
        <h1 className="text-xl font-semibold text-neutral-900">{eq.description}</h1>
        <p className="text-sm text-neutral-500">
          {eq.equipment_categories?.name} · {[eq.manufacturer, eq.model].filter(Boolean).join(" · ") || "No brand/model on file"}
        </p>
      </div>

      <Card>
        <CardHeader title="Specifications" />
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 px-5 py-4 text-sm sm:grid-cols-3">
          <Spec label="Unit" value={eq.unit} />
          <Spec
            label="In stock"
            value={eq.quantity_on_hand === null ? "Not tracked" : `${eq.quantity_on_hand} ${eq.unit}`}
          />
          {eq.watt_peak && <Spec label="Watt peak" value={`${eq.watt_peak} Wp`} />}
          {eq.inverter_ac_kw && <Spec label="Inverter AC" value={`${eq.inverter_ac_kw} kW`} />}
          {eq.inverter_efficiency && <Spec label="Inverter efficiency" value={formatPct(eq.inverter_efficiency)} />}
          {eq.battery_nameplate_kwh && <Spec label="Battery nameplate" value={`${eq.battery_nameplate_kwh} kWh`} />}
          {eq.battery_usable_kwh && <Spec label="Battery usable" value={`${eq.battery_usable_kwh} kWh`} />}
          {eq.warranty_terms && <Spec label="Warranty" value={eq.warranty_terms} />}
        </div>
      </Card>

      {showCost && (
        <Card>
          <CardHeader title="Price history" subtitle="Append-only — a new price closes the previous one" />
          <div className="divide-y divide-black/5">
            {prices.map((p) => (
              <div key={p.id} className="flex items-center justify-between px-5 py-3 text-sm">
                <div>
                  <p className="font-medium text-neutral-900">
                    {formatPhp(p.cost_price_php)}{" "}
                    <span className="font-normal text-neutral-500">
                      · markup {formatPct(p.default_markup_rate)}
                    </span>
                  </p>
                  <p className="text-xs text-neutral-500">
                    Effective {formatDate(p.effective_from)}
                    {p.effective_to ? ` – ${formatDate(p.effective_to)}` : " – present"}
                    {p.source_note ? ` · ${p.source_note}` : ""}
                  </p>
                </div>
                {p.is_estimate && <Badge tone="amber">Estimate</Badge>}
              </div>
            ))}
            {prices.length === 0 && (
              <div className="px-5 py-4 text-sm text-neutral-500">No price on file yet.</div>
            )}
          </div>

          {canManage && (
            <details className="border-t border-black/5 px-5 py-4">
              <summary className="cursor-pointer text-sm font-medium text-brand-700">
                + Update price
              </summary>
              <form action={boundAddPrice} className="mt-4 space-y-3">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label="Cost price (₱)">
                    <Input name="cost_price_php" type="number" step="0.01" required />
                  </Field>
                  <Field label="Default markup (%)">
                    <Input name="default_markup_rate" type="number" step="0.01" required placeholder="e.g. 25" />
                  </Field>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label="Effective from">
                    <Input name="effective_from" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} />
                  </Field>
                  <Field label="Supplier">
                    <Select name="supplier_id" defaultValue="">
                      <option value="">Unspecified</option>
                      {supplierList.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </Select>
                  </Field>
                </div>
                <Field label="Source note">
                  <Textarea name="source_note" rows={2} placeholder="Supplier quotation ref., date checked, etc." />
                </Field>
                <label className="flex items-center gap-2 text-sm text-neutral-700">
                  <input type="checkbox" name="is_estimate" className="rounded" />
                  This is an estimate, not a confirmed quote
                </label>
                <div className="flex justify-end">
                  <Button type="submit" size="sm">Save new price</Button>
                </div>
              </form>
            </details>
          )}
        </Card>
      )}
    </div>
  );
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-neutral-400">{label}</p>
      <p className="font-medium text-neutral-800">{value}</p>
    </div>
  );
}
