"use client";

import { useState, type ReactNode } from "react";

const TABS = [
  { key: "load", label: "Load & Sizing" },
  { key: "design", label: "System Design" },
  { key: "boq", label: "BOQ" },
  { key: "pricing", label: "Pricing" },
  { key: "roi", label: "ROI" },
  { key: "proposal", label: "Proposal" },
  { key: "longFormProposal", label: "Long Form Proposal" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export function QuotationTabs({
  load,
  design,
  boq,
  pricing,
  roi,
  proposal,
  longFormProposal,
}: Record<TabKey, ReactNode>) {
  const [active, setActive] = useState<TabKey>("load");
  const panels: Record<TabKey, ReactNode> = { load, design, boq, pricing, roi, proposal, longFormProposal };

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-1 border-b border-black/10 print:hidden">
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
