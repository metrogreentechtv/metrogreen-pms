// Parses an uploaded Gantt-chart workbook into a flat list of schedule
// tasks, ready to be bulk-inserted as project_milestones.
//
// Matches the shape of the "Gantt_Chart.xlsx" template Joel supplied:
//   - a sheet (any name containing "TIMELINE", case-insensitive; falls
//     back to the first sheet) with:
//       - a "Start Date" label somewhere in the first ~10 rows, with the
//         date value in the next cell to the right
//       - a header row containing "ITEM" immediately followed by
//         "DESCRIPTION" — the columns after that are read relative to
//         "ITEM"'s position, so a template with extra leading columns
//         still parses: ITEM, DESCRIPTION, Relative Weight, Duration,
//         Day to Start, (blank), then a PLANNED/ACTUAL label column
//         found by locating "Day" in the same header row
//   - each real task occupies a PLANNED row (Item no., description,
//     weight, duration, day-to-start all filled) directly followed by an
//     ACTUAL row (label only) — this importer only reads the PLANNED row,
//     since "Actual" progress is tracked per-milestone afterwards inside
//     the app itself, not re-imported from the sheet
//   - section-divider rows (e.g. "TOSEN INSTALLATION WORKS") and
//     unweighted delivery/material line items (Relative Weight blank) are
//     skipped — they carry no schedule data to place on a timeline
//
// Relative Weight is stored in the workbook as a 0–1 fraction (e.g. 0.15
// for 15%); project_milestones.weight_pct is a plain percentage number
// (numeric(6,3), matching the "Weight (%)" convention already used by the
// app's own manual "Add milestone" form), so every weight is multiplied
// by 100 on the way in.

import * as XLSX from "xlsx";

export interface ImportedGanttTask {
  sequence_no: number;
  name: string;
  weight_pct: number;
  duration_days: number;
  day_to_start: number;
  planned_start: string; // ISO yyyy-mm-dd
  planned_end: string; // ISO yyyy-mm-dd
}

export interface ImportedGantt {
  sourceProjectName: string | null;
  sourceLocation: string | null;
  startDate: string; // ISO yyyy-mm-dd
  tasks: ImportedGanttTask[];
  skippedDeliveryItems: number;
  totalWeightPct: number; // should land close to 100 — surfaced so an odd upload is visible, not silently swallowed
}

type Row = (string | number | Date | null)[];

const norm = (v: unknown) => (typeof v === "string" ? v.trim().toLowerCase() : v);

function excelDateToISO(value: unknown): string | null {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "number") {
    // Excel serial date (days since 1899-12-30)
    const ms = Math.round((value - 25569) * 86400 * 1000);
    return new Date(ms).toISOString().slice(0, 10);
  }
  if (typeof value === "string" && value.trim()) {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  }
  return null;
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function parseGanttWorkbook(buffer: ArrayBuffer): ImportedGantt {
  const wb = XLSX.read(buffer, { type: "array", cellDates: true });

  const sheetName =
    wb.SheetNames.find((n) => n.toLowerCase().includes("timeline")) ?? wb.SheetNames[0];
  if (!sheetName) throw new Error("The workbook has no sheets.");
  const ws = wb.Sheets[sheetName];

  const rows: Row[] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null });

  // --- Project name / location / start date (best-effort, top of sheet) ---
  let sourceProjectName: string | null = null;
  let sourceLocation: string | null = null;
  let startDate: string | null = null;

  for (let r = 0; r < Math.min(rows.length, 15); r++) {
    const row = rows[r] ?? [];
    for (let c = 0; c < row.length; c++) {
      const label = norm(row[c]);
      if (label === "project name" && row[c + 1] != null) sourceProjectName = String(row[c + 1]).trim();
      else if (label === "location" && row[c + 1] != null) sourceLocation = String(row[c + 1]).trim();
      else if (label === "start date" && row[c + 1] != null) startDate = excelDateToISO(row[c + 1]);
    }
  }

  if (!startDate) {
    throw new Error(
      `Could not find a "Start Date" cell in the "${sheetName}" sheet — this doesn't look like the Gantt template.`
    );
  }

  // --- Header row: find "ITEM" immediately followed by "DESCRIPTION" ---
  let headerRow = -1;
  let itemCol = -1;
  for (let r = 0; r < Math.min(rows.length, 20); r++) {
    const row = rows[r] ?? [];
    for (let c = 0; c < row.length - 1; c++) {
      if (norm(row[c]) === "item" && norm(row[c + 1]) === "description") {
        headerRow = r;
        itemCol = c;
        break;
      }
    }
    if (headerRow >= 0) break;
  }
  if (headerRow < 0) {
    throw new Error(
      `Could not find the "ITEM / DESCRIPTION" header row in the "${sheetName}" sheet — this doesn't look like the Gantt template.`
    );
  }

  const weightCol = itemCol + 2;
  const durationCol = itemCol + 3;
  const dayToStartCol = itemCol + 4;

  // The PLANNED/ACTUAL label column: same header row, first cell reading "Day" at or after itemCol.
  let labelCol = -1;
  const hRow = rows[headerRow] ?? [];
  for (let c = itemCol; c < hRow.length; c++) {
    if (norm(hRow[c]) === "day") {
      labelCol = c;
      break;
    }
  }
  if (labelCol < 0) labelCol = itemCol + 6; // fall back to the template's known fixed offset

  // --- Task rows: PLANNED rows carrying a numeric weight, duration & day-to-start ---
  const tasks: ImportedGanttTask[] = [];
  let skippedDeliveryItems = 0;
  let seq = 0;

  for (let r = headerRow + 1; r < rows.length; r++) {
    const row = rows[r] ?? [];
    const label = norm(row[labelCol]);
    if (label !== "planned") continue;

    const name = row[itemCol + 1];
    const weight = row[weightCol];
    const duration = row[durationCol];
    const dayToStart = row[dayToStartCol];

    if (typeof weight !== "number" || typeof duration !== "number" || typeof dayToStart !== "number") {
      // A "PLANNED" row with no weight/duration/start is a delivery/material line item
      // (informational only in the template) rather than a schedulable work item.
      if (name != null && String(name).trim()) skippedDeliveryItems++;
      continue;
    }
    if (!name || !String(name).trim()) continue;

    seq += 1;
    const planned_start = addDays(startDate, dayToStart - 1);
    const planned_end = addDays(planned_start, duration - 1);
    tasks.push({
      sequence_no: seq,
      name: String(name).trim(),
      weight_pct: Math.round(weight * 100 * 1000) / 1000, // fraction -> percentage, keep 3dp (matches numeric(6,3))
      duration_days: duration,
      day_to_start: dayToStart,
      planned_start,
      planned_end,
    });
  }

  if (tasks.length === 0) {
    throw new Error(`No schedulable work items were found in the "${sheetName}" sheet.`);
  }

  const totalWeightPct = Math.round(tasks.reduce((a, t) => a + t.weight_pct, 0) * 100) / 100;

  return { sourceProjectName, sourceLocation, startDate, tasks, skippedDeliveryItems, totalWeightPct };
}
