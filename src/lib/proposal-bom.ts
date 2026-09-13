import type { ProposalGroup, VRevisionBomRow } from "@/lib/types";

/**
 * The lot-based grouping structure for the Proposal document, as specified
 * by Joel: Solar Panel / Inverter / Battery are shown itemized (one line per
 * BOM line), Racking, DC Wire, AC Wire, Protection Devices, and Engineering
 * + Design + Labor are each collapsed into a single "1 lot" line, and the
 * add-ons (net metering, mobilization, roof premium, additional works) are
 * shown itemized so each can carry its own description and price.
 */
export const PROPOSAL_GROUPS: {
  value: ProposalGroup;
  label: string;
  mode: "itemized" | "lot";
}[] = [
  { value: "solar_panel", label: "Solar Panel", mode: "itemized" },
  { value: "inverter", label: "Inverter", mode: "itemized" },
  { value: "battery", label: "Battery (hybrid/off-grid only)", mode: "itemized" },
  { value: "mounting", label: "Racking / Mounting Structure", mode: "lot" },
  { value: "dc_wire", label: "DC Wire", mode: "lot" },
  { value: "ac_wire", label: "AC Wire", mode: "lot" },
  { value: "protection", label: "AC & DC Protection Devices", mode: "lot" },
  { value: "engineering_labor", label: "Engineering, Design & Labor", mode: "lot" },
  { value: "net_metering", label: "Net Metering", mode: "itemized" },
  { value: "mobilization", label: "Mobilization", mode: "itemized" },
  { value: "roof_premium", label: "Additional Roof Type Cost", mode: "itemized" },
  { value: "additional_works", label: "Additional Works", mode: "itemized" },
  { value: "other", label: "Other", mode: "itemized" },
];

export function proposalGroupLabel(value: string | null): string {
  return PROPOSAL_GROUPS.find((g) => g.value === value)?.label ?? "Ungrouped";
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
    const list = byGroup.get(row.proposal_group);
    if (list) list.push(row);
    else byGroup.set(row.proposal_group, [row]);
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
