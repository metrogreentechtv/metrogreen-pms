// Converts CO2 avoided (already computed by calc-engine.ts, co2AvoidedKgYear1 /
// annual, or a lifetime total the caller derives from it) into the kind of
// everyday-equivalent figures a customer-facing proposal shows — "that's like
// planting N trees." These are marketing/illustrative numbers, not financial
// or engineering figures, so unlike the rest of this app's calc engine they
// don't need a `settings` row or Joel's confirmation to ship — but the
// conversion factors ARE approximations from published sources, flagged here
// and in a footnote wherever they're shown, the same way the P90 interannual-
// CV placeholder is flagged in calc-engine.ts.
//
// Sources (standard, widely-cited figures — not Philippines-specific):
// - Car distance avoided: US EPA "Greenhouse Gas Equivalencies Calculator"
//   puts one metric ton of CO2 at ~2,481 miles (3,993 km) driven by an
//   average passenger vehicle.
// - Trees planted equivalent: US EPA figure of ~16.5 tree seedlings grown
//   for 10 years to sequester one metric ton of CO2.
// - Long-haul flights avoided: commonly cited estimate (myclimate/ICAO-style
//   figures) of ~1.6 metric tons CO2 per passenger for one long-haul return
//   flight.
const KM_PER_TON_CO2 = 3993;
const TREE_SEEDLINGS_PER_TON_CO2 = 16.5;
const TONS_CO2_PER_LONG_HAUL_FLIGHT = 1.6;

export interface EnvironmentalEquivalents {
  co2AvoidedTons: number;
  carKmAvoided: number;
  treesPlantedEquivalent: number;
  longHaulFlightsAvoided: number;
}

export function computeEnvironmentalEquivalents(co2AvoidedKg: number): EnvironmentalEquivalents {
  const tons = Math.max(0, co2AvoidedKg) / 1000;
  return {
    co2AvoidedTons: round(tons),
    carKmAvoided: round(tons * KM_PER_TON_CO2),
    treesPlantedEquivalent: round(tons * TREE_SEEDLINGS_PER_TON_CO2),
    longHaulFlightsAvoided: round(tons / TONS_CO2_PER_LONG_HAUL_FLIGHT),
  };
}

function round(n: number, decimals = 0): number {
  const f = Math.pow(10, decimals);
  return Math.round(n * f) / f;
}
