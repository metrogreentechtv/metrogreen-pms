// Simulates a net-metering customer's monthly electric bill, before and
// after the proposed solar system, for the Long Form Proposal's "Electricity
// Bill Savings" section. Only ever called for net-metering-eligible sites —
// callers gate on site.net_metering_eligible before using this module.
//
// Formula confirmed verbatim by Joel (2026-09, "Long Form Proposal" thread):
//   "monthly bill shows the net consumption of the house x rate - the net
//   export x generation rate... the credit is rollover and does not reset
//   yearly."
//
// Per month:
//   netGridConsumptionKwh = max(0, consumption - generation)
//   netExportKwh          = max(0, generation - consumption)
//   importCost            = netGridConsumptionKwh x retailRate
//   exportCredit          = netExportKwh x exportRate
//   billBeforeRollover    = importCost - exportCredit   (can go negative)
//
// A negative billBeforeRollover means that month alone produced more export
// credit than it owes — that surplus is banked into a running credit balance
// that carries forward indefinitely (deliberately NOT reset every 12 months,
// unlike the US-style annual reset/cash-out shown in the reference proposal
// PDF Joel is working from). A positive billBeforeRollover first draws down
// any banked credit before anything is actually due.
//
// This mirrors calc-engine.ts's own convention for the export rate: if the
// site has no net_metering_export_rate_php_kwh on file, exported kWh earns
// no credit (rate treated as 0) rather than falling back to the retail rate.

import type { SiteConsumption } from "./types";

export const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export interface MonthlyBillSimRow {
  monthIndex: number; // 0 = Jan ... 11 = Dec
  monthLabel: string;
  generationKwh: number;
  consumptionKwh: number;
  netGridImportKwh: number;
  netExportKwh: number;
  billBeforeSolarPhp: number; // consumptionKwh x retailRate — the no-solar baseline
  billBeforeRolloverPhp: number; // importCost - exportCredit, before applying any banked credit
  creditAppliedPhp: number; // banked credit drawn down to cover this month's bill
  billAfterSolarPhp: number; // actual amount due this month (floor 0)
  cumulativeCreditPhp: number; // banked credit balance carried into the next month
  savingsPhp: number; // billBeforeSolarPhp - billAfterSolarPhp
}

export interface NetMeteringSimulationResult {
  rows: MonthlyBillSimRow[];
  totalBillBeforeSolarPhp: number;
  totalBillAfterSolarPhp: number;
  totalSavingsPhp: number;
  endingCumulativeCreditPhp: number;
  // How the monthly consumption split was sourced — surfaced so the UI can
  // caption the chart/table honestly rather than presenting a flat 12-way
  // split of an annual total as if it were the customer's actual usage
  // pattern.
  consumptionSource: "actual" | "annual-split" | "none";
}

/**
 * Collapses (possibly multi-year) site_consumption rows into a single
 * Jan-Dec kWh array, using the same "most recent year on file wins per
 * calendar month" rule as MonthlyUsageChart.tsx. Only returns "actual" when
 * every one of the 12 months has at least one entry on file; otherwise falls
 * back to an even 12-way split of annualConsumptionKwhFallback (matching
 * this app's existing "annual-total entry is a flat 12-month split"
 * convention elsewhere), and "none" when neither is available.
 */
export function deriveMonthlyConsumptionKwh(
  consumption: SiteConsumption[],
  annualConsumptionKwhFallback: number | null
): { values: number[]; source: "actual" | "annual-split" | "none" } {
  const byMonth = new Map<number, SiteConsumption>();
  for (const c of consumption) {
    const existing = byMonth.get(c.period_month);
    if (!existing || c.period_year > existing.period_year) {
      byMonth.set(c.period_month, c);
    }
  }

  const monthsOnFile = Array.from({ length: 12 }, (_, i) => byMonth.get(i + 1));
  const hasAllMonths = monthsOnFile.every((m) => m != null && m.kwh > 0);

  if (hasAllMonths) {
    return {
      values: monthsOnFile.map((m) => m!.kwh),
      source: "actual",
    };
  }

  if (annualConsumptionKwhFallback && annualConsumptionKwhFallback > 0) {
    const perMonth = annualConsumptionKwhFallback / 12;
    return {
      values: Array(12).fill(perMonth),
      source: "annual-split",
    };
  }

  return { values: Array(12).fill(0), source: "none" };
}

export interface SimulateNetMeteringBillsInput {
  monthlyGenerationKwh: number[]; // 12 values, from calc_outputs.monthly_kwh
  consumption: SiteConsumption[]; // site_consumption rows for the site, any span of years
  annualConsumptionKwhFallback: number | null; // used only when consumption has < 12 distinct months on file
  retailRatePhpPerKwh: number; // site.blended_retail_rate_php_kwh
  exportRatePhpPerKwh: number | null; // site.net_metering_export_rate_php_kwh
}

export function simulateNetMeteringBills(
  input: SimulateNetMeteringBillsInput
): NetMeteringSimulationResult {
  const {
    monthlyGenerationKwh,
    consumption,
    annualConsumptionKwhFallback,
    retailRatePhpPerKwh,
    exportRatePhpPerKwh,
  } = input;

  const { values: monthlyConsumptionKwh, source } = deriveMonthlyConsumptionKwh(
    consumption,
    annualConsumptionKwhFallback
  );

  const generation = Array.from({ length: 12 }, (_, i) => monthlyGenerationKwh[i] ?? 0);
  const exportRate = exportRatePhpPerKwh ?? 0;

  let runningCredit = 0;
  const rows: MonthlyBillSimRow[] = [];

  for (let i = 0; i < 12; i++) {
    const generationKwh = generation[i];
    const consumptionKwh = monthlyConsumptionKwh[i];

    const netGridImportKwh = Math.max(0, consumptionKwh - generationKwh);
    const netExportKwh = Math.max(0, generationKwh - consumptionKwh);

    const importCost = netGridImportKwh * retailRatePhpPerKwh;
    const exportCredit = netExportKwh * exportRate;
    const billBeforeRolloverPhp = importCost - exportCredit;

    const billBeforeSolarPhp = consumptionKwh * retailRatePhpPerKwh;

    let creditAppliedPhp = 0;
    let billAfterSolarPhp: number;

    if (billBeforeRolloverPhp > 0) {
      creditAppliedPhp = Math.min(runningCredit, billBeforeRolloverPhp);
      billAfterSolarPhp = billBeforeRolloverPhp - creditAppliedPhp;
      runningCredit = runningCredit - creditAppliedPhp;
    } else {
      // This month's export credit alone covers (and exceeds) its import
      // cost — nothing due, and the surplus banks into the rollover balance.
      billAfterSolarPhp = 0;
      runningCredit = runningCredit + -billBeforeRolloverPhp;
    }

    rows.push({
      monthIndex: i,
      monthLabel: MONTH_LABELS[i],
      generationKwh: round(generationKwh),
      consumptionKwh: round(consumptionKwh),
      netGridImportKwh: round(netGridImportKwh),
      netExportKwh: round(netExportKwh),
      billBeforeSolarPhp: round(billBeforeSolarPhp),
      billBeforeRolloverPhp: round(billBeforeRolloverPhp),
      creditAppliedPhp: round(creditAppliedPhp),
      billAfterSolarPhp: round(billAfterSolarPhp),
      cumulativeCreditPhp: round(runningCredit),
      savingsPhp: round(billBeforeSolarPhp - billAfterSolarPhp),
    });
  }

  const totalBillBeforeSolarPhp = round(rows.reduce((a, r) => a + r.billBeforeSolarPhp, 0));
  const totalBillAfterSolarPhp = round(rows.reduce((a, r) => a + r.billAfterSolarPhp, 0));
  const totalSavingsPhp = round(totalBillBeforeSolarPhp - totalBillAfterSolarPhp);

  return {
    rows,
    totalBillBeforeSolarPhp,
    totalBillAfterSolarPhp,
    totalSavingsPhp,
    endingCumulativeCreditPhp: runningCredit,
    consumptionSource: source,
  };
}

function round(n: number, decimals = 2): number {
  const f = Math.pow(10, decimals);
  return Math.round(n * f) / f;
}
