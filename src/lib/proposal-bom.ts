import type { ProposalGroup, VRevisionBomRow } from "@/lib/types";

/**
 * The lot-based grouping structure for the Proposal document. Simplified
 * 2026-09-16 per Joel's request — the final proposal should show, in
 * order: client data (handled outside this file, on the document itself),
 * system specification (ditto), then this line-item list — Solar Panel /
 * Inverter / Battery itemized (one line per BOM line); Mounting System,
 * AC & DC Wire, AC & DC Protection, and Engineering/Logistics/Installation
 * each collapsed into a single "1 lot" line; then the optional add-ons
 * (Net Metering Application, Mobilization/Demobilization, Additional
 * Mounting Cost by roof type, Additional Works — service entrance
 * remodeling, inverter-enclosure/roofing fabrication, etc.) shown
 * itemized so each can carry its own description and price.
 *
 * AC Wire and DC Wire used to be two separate lot lines — now combined
 * into one "AC & DC Wire" line (mirroring how AC & DC Protection was
 * already combined), so a quotation only needs one wiring cost instead
 * of two. See buildProposalLines() for how older lines tagged with the
 * pre-simplification "dc_wire"/"ac_wire" values still roll up here.
 */
export const PROPOSAL_GROUPS: {
  value: ProposalGroup;
  label: string;
  mode: "itemized" | "lot";
}[] = [
  { value: "solar_panel", label: "Solar Panel", mode: "itemized" },
  { value: "inverter", label: "Inverter", mode: "itemized" },
  { value: "battery", label: "Battery (hybrid/off-grid only)", mode: "itemized" },
  { value: "mounting", label: "Mounting System", mode: "lot" },
  { value: "wiring", label: "AC & DC Wire", mode: "lot" },
  { value: "protection", label: "AC & DC Protection", mode: "lot" },
  { value: "engineering_labor", label: "Engineering, Logistics & Installation", mode: "lot" },
  { value: "net_metering", label: "Net Metering Application", mode: "itemized" },
  { value: "mobilization", label: "Mobilization / Demobilization", mode: "itemized" },
  { value: "roof_premium", label: "Additional Mounting Cost (Roof Type)", mode: "itemized" },
  { value: "additional_works", label: "Additional Works", mode: "itemized" },
  { value: "other", label: "Other", mode: "itemized" },
];

// Legacy proposal_group values retired by the 2026-09-16 simplification
// above, mapped to the group they now roll up into. A BOM line tagged
// before that date keeps its original stored value (no backfill run —
// same "don't rewrite historical/locked data" approach used elsewhere in
// this app) but still displays correctly, combined with any new lines
// tagged "wiring" directly.
const GROUP_ALIASES: Record<string, ProposalGroup> = {
  dc_wire: "wiring",
  ac_wire: "wiring",
};

/** Maps a stored proposal_group value (including a retired legacy one) to the group it now displays/rolls up as. */
export function canonicalProposalGroup(value: string | null): string | null {
  if (!value) return value;
  return GROUP_ALIASES[value] ?? value;
}

export function proposalGroupLabel(value: string | null): string {
  const canonical = canonicalProposalGroup(value);
  return PROPOSAL_GROUPS.find((g) => g.value === canonical)?.label ?? "Ungrouped";
}

export interface ProposalLine {
  group: ProposalGroup;
  groupLabel: string;
  mode: "itemized" | "lot";
  description: string;
  manufacturer: string | null;
  model: string | null;
  quantity: number;
  unit: string;
  selling_unit_price_php: number;
  selling_line_total_php: number;
}

/**
 * Rolls a revision's BOM lines up into the Proposal's lot-based structure.
 * Lines with no proposal_group tag are ignored here (they still appear on
 * the itemized BOQ tab/document) so an untagged line never silently shows
 * up mislabeled as "Other" on a customer-facing proposal.
 */
export function buildProposalLines(bom: VRevisionBomRow[]): ProposalLine[] {
  const byGroup = new Map<string, VRevisionBomRow[]>();
  for (const row of bom) {
    if (!row.show_on_document || !row.proposal_group) continue;
    const group = GROUP_ALIASES[row.proposal_group] ?? row.proposal_group;
    const list = byGroup.get(group);
    if (list) list.push(row);
    else byGroup.set(group, [row]);
  }

  const lines: ProposalLine[] = [];
  for (const g of PROPOSAL_GROUPS) {
    const rows = byGroup.get(g.value);
    if (!rows || rows.length === 0) continue;

    if (g.mode === "lot") {
      const total = rows.reduce((a, r) => a + r.selling_line_total_php, 0);
      lines.push({
        group: g.value,
        groupLabel: g.label,
        mode: "lot",
        description: g.label,
        manufacturer: null,
        model: null,
        quantity: 1,
        unit: "lot",
        selling_unit_price_php: total,
        selling_line_total_php: total,
      });
    } else {
      for (const r of rows) {
        lines.push({
          group: g.value,
          groupLabel: g.label,
          mode: "itemized",
          description: r.description,
          manufacturer: r.manufacturer,
          model: r.model,
          quantity: r.quantity,
          unit: r.unit,
          selling_unit_price_php: r.selling_unit_price_php,
          selling_line_total_php: r.selling_line_total_php,
        });
      }
    }
  }
  return lines;
}

/** BOM lines that haven't been tagged for the Proposal yet — surfaced as a checklist. */
export function untaggedLines(bom: VRevisionBomRow[]): VRevisionBomRow[] {
  return bom.filter((r) => r.show_on_document && !r.proposal_group);
}
