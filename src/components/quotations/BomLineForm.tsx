"use client";

import { useMemo, useState } from "react";
import { Button, Field, Input, Select, Textarea } from "@/components/ui";
import { formatPhp, formatPct } from "@/lib/format";
import { PROPOSAL_GROUPS } from "@/lib/proposal-bom";
import type { EquipmentCategory, EquipmentCurrentPriceView, Supplier } from "@/lib/types";

export function BomLineForm({
  categories,
  equipment,
  suppliers,
  action,
}: {
  categories: EquipmentCategory[];
  equipment: EquipmentCurrentPriceView[];
  suppliers: Supplier[];
  action: (formData: FormData) => void;
}) {
  const [categoryId, setCategoryId] = useState("");
  const [equipmentId, setEquipmentId] = useState("");
  const [description, setDescription] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [model, setModel] = useState("");
  const [unit, setUnit] = useState("pc");
  const [quantity, setQuantity] = useState("1");
  const [unitCost, setUnitCost] = useState("0");
  const [markup, setMarkup] = useState("20");
  const [sellingPrice, setSellingPrice] = useState("0");
  const [supplierId, setSupplierId] = useState("");

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
    if (eq.cost_price_php != null) setUnitCost(String(eq.cost_price_php));
    if (eq.default_markup_rate != null) setMarkup(String(Math.round(eq.default_markup_rate * 10000) / 100));
    if (eq.supplier_id) setSupplierId(eq.supplier_id);
    const cost = eq.cost_price_php ?? 0;
    const mk = eq.default_markup_rate ?? 0.2;
    setSellingPrice(String(Math.round(cost * (1 + mk) * 100) / 100));
  }

  const previewLineTotal = (Number(quantity) || 0) * (Number(sellingPrice) || 0);
  const previewLineCost = (Number(quantity) || 0) * (Number(unitCost) || 0);

  return (
    <form action={action} className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Category">
          <Select
            name="category_id"
            required
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
          >
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
        <Field label="From catalog (optional)">
          <Select
            name="equipment_id"
            value={equipmentId}
            onChange={(e) => pickEquipment(e.target.value)}
          >
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
        <Input
          name="description"
          required
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </Field>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Field label="Manufacturer">
          <Input name="manufacturer" value={manufacturer} onChange={(e) => setManufacturer(e.target.value)} />
        </Field>
        <Field label="Model">
          <Input name="model" value={model} onChange={(e) => setModel(e.target.value)} />
        </Field>
        <Field label="Unit">
          <Input name="unit" required value={unit} onChange={(e) => setUnit(e.target.value)} />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
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
        <Field label="Unit cost (₱)">
          <Input
            name="unit_cost_php"
            type="number"
            step="0.01"
            required
            value={unitCost}
            onChange={(e) => setUnitCost(e.target.value)}
          />
        </Field>
        <Field label="Markup (%)">
          <Input
            name="markup_rate"
            type="number"
            step="0.01"
            value={markup}
            onChange={(e) => setMarkup(e.target.value)}
          />
        </Field>
        <Field label="Selling unit price (₱)">
          <Input
            name="selling_unit_price_php"
            type="number"
            step="0.01"
            required
            value={sellingPrice}
            onChange={(e) => setSellingPrice(e.target.value)}
          />
        </Field>
        <Field label="Supplier">
          <Select name="supplier_id" value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
            <option value="">—</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <p className="text-xs text-neutral-500">
        Line cost {formatPhp(previewLineCost)} · Line selling total {formatPhp(previewLineTotal)} · Line margin{" "}
        {previewLineTotal > 0 ? formatPct((previewLineTotal - previewLineCost) / previewLineTotal) : "—"}
      </p>

      <Field label="Notes">
        <Textarea name="notes" rows={2} />
      </Field>

      <Field
        label="Proposal grouping"
        hint="How this line rolls up on the Proposal tab — leave blank to keep it off the Proposal (it still shows on the BOQ)"
      >
        <Select name="proposal_group" defaultValue="">
          <option value="">Not on Proposal</option>
          {PROPOSAL_GROUPS.map((g) => (
            <option key={g.value} value={g.value}>
              {g.label} {g.mode === "lot" ? "(shown as 1 lot)" : ""}
            </option>
          ))}
        </Select>
      </Field>

      <label className="flex items-center gap-2 text-sm text-neutral-700">
        <input type="checkbox" name="show_on_document" defaultChecked className="rounded" />
        Show this line on the printed quotation
      </label>

      <div className="flex justify-end">
        <Button type="submit" size="sm">
          Add line
        </Button>
      </div>
    </form>
  );
}
