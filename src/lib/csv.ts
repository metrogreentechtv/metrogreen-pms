/**
 * Minimal RFC 4180-ish CSV helpers — no external dependency. Handles quoted
 * fields, embedded commas/newlines, and doubled-quote escaping ("" inside a
 * quoted field means a literal "). Good enough for the customer import/
 * export round trip; not a general-purpose CSV library.
 */

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  // Normalize line endings and strip a UTF-8 BOM if present (common from Excel exports).
  const src = text.replace(/^﻿/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];

    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += ch;
    }
  }

  // Flush the last field/row (files may or may not end with a newline).
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  // Drop fully-blank trailing rows (common at end of an exported sheet).
  while (rows.length > 0 && rows[rows.length - 1].every((c) => c.trim() === "")) {
    rows.pop();
  }

  return rows;
}

export function parseCsvToRecords(text: string): Record<string, string>[] {
  const rows = parseCsv(text);
  if (rows.length === 0) return [];
  const headers = rows[0].map((h) => h.trim());
  return rows.slice(1).map((row) => {
    const rec: Record<string, string> = {};
    headers.forEach((h, i) => {
      rec[h] = (row[i] ?? "").trim();
    });
    return rec;
  });
}

function csvCell(value: string | number | null | undefined): string {
  const s = value === null || value === undefined ? "" : String(value);
  if (/[",\n]/.test(s)) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

export function rowsToCsv(header: string[], rows: (string | number | null | undefined)[][]): string {
  const lines = [header.map(csvCell).join(",")];
  for (const row of rows) {
    lines.push(row.map(csvCell).join(","));
  }
  return lines.join("\r\n") + "\r\n";
}
