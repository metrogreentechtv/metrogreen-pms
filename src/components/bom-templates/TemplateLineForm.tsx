"use client";

import { useMemo, useState } from "react";
import { Button, Field, Input, Select, Textarea } from "@/components/ui";
import { formatPhp } from "@/lib/format";
import type { EquipmentCategory, EquipmentCurrentPriceView } from "@/lib/types";

export function TemplateLineForm({
  categories,
  equipment,
  action,
}: {
  categories: EquipmentCategory[];
  equipment: EquipmentCurrentPriceView[];
  action: (formData: FormData) => void;
}) {
  const [categoryId, setCategoryId] = useState("");
  const [equipmentId, setEquipmentId] = useState("");
  const [description, setDescription] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [model, setModel] = useState("");
  const [unit, setUnit] = useState("pc");
  const [quantity, setQuantity] = useState("1");
  const [unitPrice, setUnitPrice] = useState("0");
  const [isMajor, setIsMajor] = useState(false);

  const byCategory = useMemo(() => {
    const map: Record<string, EquipmentCurrentPriceView[]> = {};
    for (const e of equipment) (map[e.category_id] ??= []).push(e);
    return map;
  }, [equipment]);

  const visibleEquipment = categoryId ? byCategory[categoryId] ?? [] : equipment;

  function pickEquipment(id: string) {
    setEquipmentId(id);
    const eq = equipment.find((e) => e.id === id);
    if (!eq) return;
    setCategoryId(eq.category_id);
    setDescription(eq.description);
    setManufacturer(eq.manufacturer ?? "");
    setModel(eq.model ?? "");
    setUnit(eq.unit);
    const cost = eq.cost_price_php ?? 0;
    const markup = eq.default_markup_rate ?? 0.2;
    setUnitPrice(String(Math.round(cost * (1 + markup) * 100) / 100));
  }

  const previewAmount = (Number(quantity) || 0) * (Number(unitPrice) || 0);

  return (
    <form action={action} className="space-y-3">
      <label className="flex items-start gap-2 rounded-lg border border-black/10 bg-neutral-50 px-3 py-2 text-sm text-neutral-700">
        <input
          type="checkbox"
          name="is_major"
          checked={isMajor}
          onChange={(e) => setIsMajor(e.target.checked)}
          className="mt-0.5 rounded"
        />
        <span>
          <span className="font-medium">Major equipment slot</span> — sales chooses the specific item from
          this category when applying the template to a quotation (e.g. Solar Panel, Inverter, Battery,
          Mounting Structure). Leave unchecked for a fixed/standard line.
        </span>
      </label>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Category">
          <Select name="category_id" required value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="" disabled>
              Select category…
            </option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          label={isMajor ? "Suggested default (optional)" : "From catalog (optional)"}
          hint={isMajor ? "Just a default — sales still picks the actual item per quotation." : undefined}
        >
          <Select name="equipment_id" value={equipmentId} onChange={(e) => pickEquipment(e.target.value)}>
            <option value="">Custom line item (type below)</option>
            {visibleEquipment.map((e) => (
              <option key={e.id} value={e.id}>
                {e.description} {e.manufacturer ? `— ${e.manufacturer}` : ""}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Field label="Description">
        <Input name="description" required value={description} onChange={(e) => setDescription(e.target.value)} />
      </Field>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Field label="Manufacturer">
          <Input name="manufacturer" value={manufacturer} onChange={(e) => setManufacturer(e.target.value)} />
        </Field>
        <Field label="Model">
          <Input name="model" value={model} onChange={(e) => setModel(e.target.value)} />
        </Field>
        <Field label="Quantity">
          <Input
            name="quantity"
            type="number"
            step="0.01"
            required
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
        </Field>
        <Field label="Unit">
          <Input name="unit" required value={unit} onChange={(e) => setUnit(e.target.value)} />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Field label="Unit price (₱)" hint={isMajor ? "Reference only — priced live from the catalog when applied." : undefined}>
          <Input
            name="unit_price_php"
            type="number"
            step="0.01"
            required
            value={unitPrice}
            onChange={(e) => setUnitPrice(e.target.value)}
          />
        </Field>
      </div>

      <p className="text-xs text-neutral-500">Amount {formatPhp(previewAmount)}</p>

      <Field label="Notes (optional)">
        <Textarea name="notes" rows={2} />
      </Field>

      <div className="flex justify-end">
        <Button type="submit" size="sm">
          Add line
        </Button>
      </div>
    </form>
  );
}
