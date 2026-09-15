"use client";

import { useState, type ReactNode } from "react";

const TABS = [
  { key: "main", label: "Main Materials" },
  { key: "equipments", label: "Equipments" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

/**
 * Splits the equipment catalog into two tabs: "Main Materials" (the three
 * items that drive a quotation's major-equipment slots — Solar Panel,
 * Inverter, Battery) and "Equipments" (everything else — mounting,
 * protection/wiring, conduits, grounding, etc.). Same pre-render-both/
 * toggle-with-hidden pattern as QuotationTabs, so each tab's table is a
 * plain Server Component and only the tab switcher itself needs to be a
 * Client Component.
 */
export function InventoryTabs({ main, equipments }: Record<TabKey, ReactNode>) {
  const [active, setActive] = useState<TabKey>("main");
  const panels: Record<TabKey, ReactNode> = { main, equipments };

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-1 border-b border-black/10">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setActive(t.key)}
            className={`rounded-t-lg px-4 py-2 text-sm font-medium transition ${
              active === t.key
                ? "border-b-2 border-brand-600 text-brand-700"
                : "text-neutral-500 hover:text-neutral-800"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {TABS.map((t) => (
        <div key={t.key} hidden={active !== t.key}>
          {panels[t.key]}
        </div>
      ))}
    </div>
  );
}
