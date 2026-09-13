import type { CustomerType } from "@/lib/types";

/**
 * Column contract for the customer CSV import/export round trip. Export
 * writes exactly these headers; import accepts these (case-insensitive,
 * with a few common aliases) so a file exported from here, or Joel's
 * original spreadsheet format, both import cleanly.
 */
export const CUSTOMER_CSV_HEADERS = [
  "Customer Code",
  "Company Name",
  "Contact Person",
  "Email",
  "Phone",
  "Address",
  "City",
  "Province",
  "Industry",
  "Customer Type",
  "Notes",
] as const;

const CUSTOMER_TYPE_MAP: Record<string, CustomerType> = {
  residential: "residential",
  commercial: "commercial",
  industrial: "industrial",
  government: "government",
  subcontractor_client: "subcontractor_client",
  "subcontractor client": "subcontractor_client",
  subcontractor: "subcontractor_client",
};

export function mapCustomerType(raw: string | undefined | null): CustomerType {
  const key = (raw ?? "").trim().toLowerCase();
  return CUSTOMER_TYPE_MAP[key] ?? "residential";
}

// A phone number Excel mangled into scientific notation on save/export
// (e.g. "6.39288E+11") — the original digits beyond a few significant
// figures are gone, so this must not be imported as-is.
export function isCorruptedScientificNotation(value: string): boolean {
  return /^\d(\.\d+)?e\+\d+$/i.test(value.trim());
}

export function deriveLeadSource(notes: string | null): { leadSource: "referral" | "other"; leadSourceDetail: string | null } {
  if (notes && /referr?al/i.test(notes)) {
    return { leadSource: "referral", leadSourceDetail: notes };
  }
  return { leadSource: "other", leadSourceDetail: null };
}

/** Case-insensitive lookup across a small set of header aliases. */
export function pickField(record: Record<string, string>, aliases: string[]): string {
  const lowerMap = new Map(Object.keys(record).map((k) => [k.toLowerCase().trim(), k]));
  for (const alias of aliases) {
    const key = lowerMap.get(alias.toLowerCase());
    if (key !== undefined) {
      const value = record[key];
      if (value && value.trim()) return value.trim();
    }
  }
  return "";
}

export interface ParsedCustomerRow {
  customerName: string;
  companyName: string | null;
  customerType: CustomerType;
  industry: string | null;
  billingAddress: string | null;
  city: string | null;
  province: string | null;
  notes: string | null;
  leadSource: "referral" | "other";
  leadSourceDetail: string | null;
  contactFullName: string | null;
  mobile: string | null;
  email: string | null;
}

export interface ParseIssue {
  row: number; // 1-based, counting the header as row 1 (so first data row is 2)
  reason: string;
}

export function parseCustomerRecord(
  record: Record<string, string>,
  rowNumber: number
): { row: ParsedCustomerRow | null; issue: ParseIssue | null } {
  const companyRaw = pickField(record, ["Company Name", "company_name", "Company"]);
  const contactRaw = pickField(record, ["Contact Person", "customer_name", "Name", "Full Name"]);
  const customerName = contactRaw || companyRaw;

  if (!customerName) {
    return { row: null, issue: { row: rowNumber, reason: "Missing both contact person and company name" } };
  }

  const email = pickField(record, ["Email", "email"]) || null;
  const phoneRaw = pickField(record, ["Phone", "phone", "Mobile", "mobile"]);
  const address = pickField(record, ["Address", "billing_address", "Billing Address"]) || null;
  const city = pickField(record, ["City", "city"]) || null;
  const province = pickField(record, ["Province", "province"]) || null;
  const industry = pickField(record, ["Industry", "industry"]) || null;
  const customerTypeRaw = pickField(record, ["Customer Type", "customer_type", "Type"]);
  const notesRaw = pickField(record, ["Notes", "notes"]) || null;

  let notes = notesRaw;
  let mobile: string | null = phoneRaw || null;
  if (phoneRaw && isCorruptedScientificNotation(phoneRaw)) {
    const warning =
      "Phone number in source file was corrupted by spreadsheet auto-formatting (scientific notation) - needs to be re-entered.";
    notes = notes ? `${notes} | ${warning}` : warning;
    mobile = null;
  }

  const { leadSource, leadSourceDetail } = deriveLeadSource(notes);

  return {
    row: {
      customerName,
      companyName: companyRaw && companyRaw !== customerName ? companyRaw : null,
      customerType: mapCustomerType(customerTypeRaw),
      industry,
      billingAddress: address,
      city,
      province,
      notes,
      leadSource,
      leadSourceDetail,
      contactFullName: contactRaw || null,
      mobile,
      email,
    },
    issue: null,
  };
}
