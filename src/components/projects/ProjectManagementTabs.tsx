"use client";

import { useState, type ReactNode } from "react";

const TABS = [
  { key: "ci", label: "C&I Projects" },
  { key: "residential", label: "Residential Projects" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export function ProjectManagementTabs({ ci, residential }: { ci: ReactNode; residential: ReactNode }) {
  const [active, setActive] = useState<TabKey>("ci");
  const panels: Record<TabKey, ReactNode> = { ci, residential };

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
