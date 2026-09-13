// Computes S-curve data (Planned / Actual / Variance cumulative %) from a
// project's milestones, following the same linear weight/duration-ramp
// model as the uploaded Gantt_Chart.xlsx template: each task's weight is
// spread evenly across its own day span, and every day's contributions
// are summed then accumulated over the whole project.
//
// PLANNED is exact — it comes straight from weight_pct / planned_start /
// planned_end, the same fields the template's "PLANNED" formula row reads.
//
// ACTUAL has no day-by-day history in this app (project_milestones keeps
// only a current snapshot: actual_start, actual_end, completion_pct), so
// it's approximated per milestone rather than replicated exactly:
//   - not started (no actual_start): contributes 0 throughout
//   - finished (actual_start & actual_end both set): ramps linearly across
//     that span, same as the planned model, reaching full weight_pct on
//     actual_end
//   - in progress (actual_start set, no actual_end): ramps linearly from
//     actual_start to "today", reaching completion_pct% of its weight
//     today, then holds flat at that value for any later day already on
//     the chart
// This is a reasonable reconstruction of the shape of progress, not a
// record of exactly which day each percent of work happened — flagged
// here and in the on-screen caption so it isn't mistaken for the former.

import type { ProjectMilestone } from "@/lib/types";

export interface SCurvePoint {
  day: number; // 0-indexed from rangeStart
  date: string; // ISO yyyy-mm-dd
  plannedCum: number; // 0–100
  actualCum: number; // 0–100
  varianceCum: number; // actualCum - plannedCum
}

const DAY_MS = 24 * 60 * 60 * 1000;

function toUTC(iso: string): number {
  return new Date(iso + "T00:00:00Z").getTime();
}

function dayIndex(iso: string, rangeStartMs: number): number {
  return Math.round((toUTC(iso) - rangeStartMs) / DAY_MS);
}

export function computeSCurve(milestones: ProjectMilestone[], todayISO?: string): SCurvePoint[] {
  const scheduled = milestones.filter((m) => m.planned_start && m.planned_end && m.weight_pct);
  if (scheduled.length === 0) return [];

  const today = todayISO ?? new Date().toISOString().slice(0, 10);

  const allDates: string[] = [];
  scheduled.forEach((m) => {
    allDates.push(m.planned_start!, m.planned_end!);
    if (m.actual_start) allDates.push(m.actual_start);
    if (m.actual_end) allDates.push(m.actual_end);
  });
  allDates.push(today);

  const rangeStartISO = allDates.reduce((a, b) => (a < b ? a : b));
  const rangeEndISO = allDates.reduce((a, b) => (a > b ? a : b));
  const rangeStartMs = toUTC(rangeStartISO);
  const totalDays = dayIndex(rangeEndISO, rangeStartMs) + 1;

  const planned = new Array(totalDays).fill(0);
  const actual = new Array(totalDays).fill(0);

  for (const m of scheduled) {
    const weight = m.weight_pct ?? 0;

    // Planned: exact ramp across planned_start..planned_end.
    const pStart = dayIndex(m.planned_start!, rangeStartMs);
    const pEnd = dayIndex(m.planned_end!, rangeStartMs);
    const pDuration = Math.max(1, pEnd - pStart + 1);
    const pDaily = weight / pDuration;
    for (let d = Math.max(0, pStart); d <= Math.min(totalDays - 1, pEnd); d++) {
      planned[d] += pDaily;
    }

    // Actual: approximated per the rules above.
    if (!m.actual_start) continue;
    const aStart = dayIndex(m.actual_start, rangeStartMs);

    if (m.actual_end) {
      const aEnd = dayIndex(m.actual_end, rangeStartMs);
      const aDuration = Math.max(1, aEnd - aStart + 1);
      const aDaily = weight / aDuration;
      for (let d = Math.max(0, aStart); d <= Math.min(totalDays - 1, aEnd); d++) {
        actual[d] += aDaily;
      }
    } else {
      const todayIdx = dayIndex(today, rangeStartMs);
      const targetWeight = weight * (Math.min(100, Math.max(0, m.completion_pct)) / 100);
      const aDuration = Math.max(1, todayIdx - aStart + 1);
      const aDaily = targetWeight / aDuration;
      for (let d = Math.max(0, aStart); d <= Math.min(totalDays - 1, todayIdx); d++) {
        actual[d] += aDaily;
      }
      // No contribution is added for days after today — the cumulative sum below
      // carries today's reached value forward flat for the rest of the chart.
    }
  }

  const points: SCurvePoint[] = [];
  let plannedCum = 0;
  let actualCum = 0;
  for (let d = 0; d < totalDays; d++) {
    plannedCum += planned[d];
    actualCum += actual[d];
    const date = new Date(rangeStartMs + d * DAY_MS).toISOString().slice(0, 10);
    points.push({
      day: d,
      date,
      plannedCum: Math.min(100, Math.round(plannedCum * 100) / 100),
      actualCum: Math.min(100, Math.round(actualCum * 100) / 100),
      varianceCum: Math.round((actualCum - plannedCum) * 100) / 100,
    });
  }
  return points;
}

export interface SCurveKpis {
  todayPlannedPct: number;
  todayActualPct: number;
  variancePct: number;
  daysElapsed: number;
  totalDays: number;
  plannedAtCompletionPct: number; // planned cumulative on the last scheduled day — should read ~100
}

export function computeSCurveKpis(points: SCurvePoint[], todayISO?: string): SCurveKpis | null {
  if (points.length === 0) return null;
  const today = todayISO ?? new Date().toISOString().slice(0, 10);
  const todayPoint = points.find((p) => p.date === today) ?? points[points.length - 1];
  const last = points[points.length - 1];
  return {
    todayPlannedPct: todayPoint.plannedCum,
    todayActualPct: todayPoint.actualCum,
    variancePct: todayPoint.varianceCum,
    daysElapsed: todayPoint.day,
    totalDays: last.day,
    plannedAtCompletionPct: last.plannedCum,
  };
}
