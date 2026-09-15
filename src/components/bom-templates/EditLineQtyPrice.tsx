"use client";

import { useState } from "react";

export function EditLineQtyPrice({
  quantity,
  unit,
  unitPrice,
  action,
}: {
  quantity: number;
  unit: string;
  unitPrice: number;
  /** Bound server action: (formData) => void, taking quantity/unit_price_php fields. */
  action: (formData: FormData) => void;
}) {
  const [qty, setQty] = useState(String(quantity));
  const [price, setPrice] = useState(String(unitPrice));

  return (
    <form action={action} className="flex flex-wrap items-center gap-1.5">
      <input
        name="quantity"
        type="number"
        step="0.01"
        value={qty}
        onChange={(e) => setQty(e.target.value)}
        className="w-16 rounded-md border border-black/10 px-1.5 py-1 text-xs tabular-nums"
      />
      <span className="text-xs text-neutral-400">{unit}</span>
      <span className="text-xs text-neutral-300">×</span>
      <input
        name="unit_price_php"
        type="number"
        step="0.01"
        value={price}
        onChange={(e) => setPrice(e.target.value)}
        className="w-24 rounded-md border border-black/10 px-1.5 py-1 text-xs tabular-nums"
      />
      <button type="submit" className="rounded px-2 py-1 text-xs text-brand-700 hover:bg-brand-50">
        Save
      </button>
    </form>
  );
}
