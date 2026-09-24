// Groups a revision's BOM lines into the equipment cards shown on the "Your
// Solution" section of the Long Form Proposal — one card per BOM category
// (Solar Panel, Inverter, Battery, Mounting System, etc.), each listing its
// line items with warranty text pulled from the catalog where a line is
// linked to a catalog item (equipment_id). A BOM line entered as free text
// (no equipment_id — the 2026-09-19 convention for module/inverter/battery
// entries) simply shows no warranty line rather than a guessed one.
//
// This is deliberately sourced from revision_bom_lines (via v_revision_bom)
// rather than revision_configurations' module_name/inverter_name/
// battery_name free-text fields, because the BOM supports more than one
// distinct manufacturer/model per category (e.g. two different inverter
// models on one system) while the configuration fields only hold one.
import type { VRevisionBomRow } from "./types";

export interface SolutionCardItem {
  description: string;
  manufacturer: string | null;
  model: string | null;
  quantity: number;
  unit: string;
  warrantyTerms: string | null;
}

export interface SolutionCard {
  categoryName: string;
  categorySort: number;
  items: SolutionCardItem[];
}

export function buildSolutionCards(
  bom: VRevisionBomRow[],
  warrantyByEquipmentId: Map<string, string | null>
): SolutionCard[] {
  const byCategory = new Map<string, SolutionCard>();

  for (const row of bom) {
    if (!row.show_on_document) continue;
    let card = byCategory.get(row.category_name);
    if (!card) {
      card = { categoryName: row.category_name, categorySort: row.category_sort, items: [] };
      byCategory.set(row.category_name, card);
    }
    card.items.push({
      description: row.description,
      manufacturer: row.manufacturer,
      model: row.model,
      quantity: row.quantity,
      unit: row.unit,
      warrantyTerms: row.equipment_id ? warrantyByEquipmentId.get(row.equipment_id) ?? null : null,
    });
  }

  return Array.from(byCategory.values()).sort((a, b) => a.categorySort - b.categorySort);
}
