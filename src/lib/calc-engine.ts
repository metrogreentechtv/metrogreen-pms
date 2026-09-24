// MetroGreen centralized engineering calculation engine.
//
// The database (schema `app`) owns the COST/PRICING math end-to-end —
// see app.recalculate_revision_financials(), which runs automatically
// on every BOM change. It does NOT compute energy generation, savings,
// payback, NPV/IRR/LCOE, or CO2 avoided — revision_configurations has
// columns reserved for those (calc_inputs/calc_outputs/calc_engine_version/
// validation_*) but no engine writes them yet. This module is that engine,
// on the application side, so the formulas exist exactly once and every
// screen (configuration panel, quotation PDF, proposal PDF) reads the
// same stored result instead of recomputing it inline.
//
// Formulas follow the MetroGreen build prompt (see project docs) and the
// live `settings` table for every assumption (peak sun hours, performance
// ratio, degradation, VAT, discount rate, emission factor, etc.).

export const CALC_ENGINE_VERSION = "mgpms-calc-1.0";

export interface CalcSettings {
  peakSunHoursDefault: number;
  performanceRatioDefault: number;
  annualDegradation: number;
  firstYearLid: number;
  monthlyDistribution: number[]; // 12 fractions summing to ~1
  analysisYears: number;
  layoutFactor: number;
  discountRate: number;
  gridEmissionFactorKgPerKwh: number;
  omCostPctOfCapex: number;
  inverterReplacementYear: number;
  inverterReplacementCostPct: number;
  // Interannual generation variability (coefficient of variation, as a
  // fraction) used to derate the P50-equivalent generation estimate down
  // to a P90 (90% probability-of-exceedance) figure, the standard solar
  // bankability convention: P90 = P50 x (1 - 1.282 x CV). See
  // settings["energy.interannual_cv_pct"].
  interannualCv: number;
}

export interface CalcInputs {
  dcCapacityKwp: number;
  moduleAreaSqm: number | null;
  moduleQuantity: number;
  peakSunHours: number;
  performanceRatio: number;
  blendedRateePhpPerKwh: number;
  netMeteringEligible: boolean;
  netMeteringExportRatePhpPerKwh: number | null;
  annualConsumptionKwh: number | null; // from site_consumption, if on file
  totalProjectCostPhp: number;
  totalContractPricePhp: number;
}

export interface CalcOutputs {
  // P50-equivalent (expected-case) year-1 generation, before the P90
  // derate is applied. annualKwhYear1 below (and everything computed from
  // it — savings, payback, ROI, NPV, IRR, monthly split) is the derated
  // P90 figure used everywhere in the app, so financial output is
  // conservative/bankable by default.
  annualKwhP50Year1: number;
  p90DerateFactor: number;
  interannualCvUsed: number;
  annualKwhYear1: number;
  monthlyKwh: number[];
  lifetimeKwh: number;
  selfConsumedKwhYear1: number;
  exportedKwhYear1: number;
  annualSavingsYear1Php: number;
  co2AvoidedKgYear1: number;
  simplePaybackYears: number | null;
  roiPct: number | null;
  npvPhp: number;
  irrPct: number | null;
  lcoePhpPerKwh: number | null;
  requiredAreaSqm: number | null;
  // Year-by-year net cash flow, PHP. Index 0 is year 0 (the negative
  // upfront investment, -totalContractPricePhp); index N is year N's
  // savings minus O&M minus any inverter replacement that year. Length is
  // settings.analysisYears + 1. Was already computed internally to feed
  // NPV/IRR below but never exposed — added so the Long Form Proposal's
  // Net Financial Impact charts (cumulative savings with a payback
  // marker, annual savings with the initial investment marked) can read
  // it directly instead of recomputing the same series a second time.
  yearlyCashFlowsPhp: number[];
}

export function computeEngineering(
  inputs: CalcInputs,
  settings: CalcSettings
): CalcOutputs {
  const {
    dcCapacityKwp,
    moduleAreaSqm,
    moduleQuantity,
    peakSunHours,
    performanceRatio,
    blendedRateePhpPerKwh,
    netMeteringEligible,
    netMeteringExportRatePhpPerKwh,
    annualConsumptionKwh,
    totalProjectCostPhp,
    totalContractPricePhp,
  } = inputs;

  // Year-1 generation, net of first-year light-induced degradation —
  // this is the P50 (expected-case) estimate.
  const annualKwhP50Year1 =
    dcCapacityKwp *
    peakSunHours *
    365 *
    performanceRatio *
    (1 - settings.firstYearLid);

  // Derate P50 to a P90 (90% probability-of-exceedance) figure using the
  // standard bankability formula: P90 = P50 x (1 - 1.282 x CV). Every
  // downstream figure (savings, payback, ROI, NPV, IRR, LCOE) is computed
  // from this P90 value, not the P50 one, so the quotation's financial
  // case is conservative by default.
  const interannualCvUsed = settings.interannualCv;
  const p90DerateFactor = Math.max(0, 1 - 1.282 * interannualCvUsed);
  const annualKwhYear1 = annualKwhP50Year1 * p90DerateFactor;

  const dist =
    settings.monthlyDistribution.length === 12
      ? settings.monthlyDistribution
      : Array(12).fill(1 / 12);
  const monthlyKwh = dist.map((f) => Math.round(annualKwhYear1 * f * 100) / 100);

  // Lifetime generation with straight-line annual degradation.
  let lifetimeKwh = 0;
  const yearlyKwh: number[] = [];
  for (let y = 0; y < settings.analysisYears; y++) {
    const yearKwh = annualKwhYear1 * Math.pow(1 - settings.annualDegradation, y);
    yearlyKwh.push(yearKwh);
    lifetimeKwh += yearKwh;
  }

  // Self-consumption split: capped by actual/assumed load if known,
  // otherwise assume full self-consumption (typical for a sizing-to-load
  // residential/commercial system without net-metering data on file).
  const selfConsumedKwhYear1 = annualConsumptionKwh
    ? Math.min(annualKwhYear1, annualConsumptionKwh)
    : annualKwhYear1;
  const exportedKwhYear1 = Math.max(annualKwhYear1 - selfConsumedKwhYear1, 0);

  const exportRate =
    netMeteringEligible && netMeteringExportRatePhpPerKwh != null
      ? netMeteringExportRatePhpPerKwh
      : 0;

  const annualSavingsYear1Php =
    selfConsumedKwhYear1 * blendedRateePhpPerKwh + exportedKwhYear1 * exportRate;

  const co2AvoidedKgYear1 = annualKwhYear1 * settings.gridEmissionFactorKgPerKwh;

  const simplePaybackYears =
    annualSavingsYear1Php > 0 ? totalContractPricePhp / annualSavingsYear1Php : null;

  // Cash-flow series for NPV/IRR/ROI: year 0 is the (negative) investment,
  // each following year is savings minus O&M minus any inverter
  // replacement, growing with degradation.
  const omCostYear1 = settings.omCostPctOfCapex * totalProjectCostPhp;
  const cashFlows: number[] = [-totalContractPricePhp];
  for (let y = 1; y <= settings.analysisYears; y++) {
    const savings = annualSavingsYear1Php * Math.pow(1 - settings.annualDegradation, y - 1);
    const om = omCostYear1 * Math.pow(1.0, y - 1);
    const replacement =
      y === settings.inverterReplacementYear
        ? settings.inverterReplacementCostPct * totalProjectCostPhp
        : 0;
    cashFlows.push(savings - om - replacement);
  }

  const npvPhp = npv(settings.discountRate, cashFlows);
  const irrPct = irr(cashFlows);
  const totalLifetimeSavings = cashFlows.slice(1).reduce((a, b) => a + b, 0);
  const roiPct =
    totalContractPricePhp > 0
      ? (totalLifetimeSavings - totalContractPricePhp) / totalContractPricePhp
      : null;

  const lcoePhpPerKwh = lifetimeKwh > 0 ? totalProjectCostPhp / lifetimeKwh : null;

  const requiredAreaSqm = moduleAreaSqm
    ? moduleQuantity * moduleAreaSqm * settings.layoutFactor
    : null;

  return {
    annualKwhP50Year1: round(annualKwhP50Year1),
    p90DerateFactor: round(p90DerateFactor, 4),
    interannualCvUsed,
    annualKwhYear1: round(annualKwhYear1),
    monthlyKwh,
    lifetimeKwh: round(lifetimeKwh),
    selfConsumedKwhYear1: round(selfConsumedKwhYear1),
    exportedKwhYear1: round(exportedKwhYear1),
    annualSavingsYear1Php: round(annualSavingsYear1Php),
    co2AvoidedKgYear1: round(co2AvoidedKgYear1),
    simplePaybackYears: simplePaybackYears != null ? round(simplePaybackYears, 2) : null,
    roiPct: roiPct != null ? round(roiPct, 4) : null,
    npvPhp: round(npvPhp),
    irrPct: irrPct != null ? round(irrPct, 4) : null,
    lcoePhpPerKwh: lcoePhpPerKwh != null ? round(lcoePhpPerKwh, 4) : null,
    requiredAreaSqm: requiredAreaSqm != null ? round(requiredAreaSqm, 1) : null,
    yearlyCashFlowsPhp: cashFlows.map((cf) => round(cf)),
  };
}

function npv(rate: number, cashFlows: number[]): number {
  return cashFlows.reduce((acc, cf, t) => acc + cf / Math.pow(1 + rate, t), 0);
}

// Bisection search for IRR — robust for the single-sign-change cash flow
// shape (one upfront outflow, then positive inflows) this engine produces.
function irr(cashFlows: number[]): number | null {
  let lo = -0.99;
  let hi = 5;
  let fLo = npv(lo, cashFlows);
  let fHi = npv(hi, cashFlows);
  if (Number.isNaN(fLo) || Number.isNaN(fHi) || fLo * fHi > 0) return null;

  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    const fMid = npv(mid, cashFlows);
    if (Math.abs(fMid) < 1e-6) return mid;
    if (fLo * fMid < 0) {
      hi = mid;
      fHi = fMid;
    } else {
      lo = mid;
      fLo = fMid;
    }
  }
  return (lo + hi) / 2;
}

function round(n: number, digits = 2): number {
  const f = Math.pow(10, digits);
  return Math.round(n * f) / f;
}

export function dcCapacityFromModules(moduleQuantity: number, wattPeak: number): number {
  return round((moduleQuantity * wattPeak) / 1000, 3);
}

export function modulesFromTargetCapacity(targetKwp: number, wattPeak: number): number {
  return Math.ceil((targetKwp * 1000) / wattPeak);
}

export function dcAcRatio(dcCapacityKwp: number, inverterAcKwTotal: number): number | null {
  if (!inverterAcKwTotal) return null;
  return round(dcCapacityKwp / inverterAcKwTotal, 3);
}
