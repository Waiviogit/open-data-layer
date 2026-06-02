/** Rolling average window for community vote weight (days). */
export const WAIV_POWER_AVG_WINDOW_DAYS = 30;

/** History rows older than this are pruned (except latest per account). */
export const WAIV_POWER_HISTORY_PRUNE_DAYS = 32;

export interface WaivPowerHistoryPoint {
  waiv_power: number;
  recorded_at: Date;
}

export interface WaivPowerSegment {
  waiv_power: number;
  effective_from: Date;
}

export function buildWaivPowerSegments(
  anchorBefore: WaivPowerHistoryPoint | null,
  inWindow: WaivPowerHistoryPoint[],
  windowStart: Date,
): WaivPowerSegment[] {
  const segments: WaivPowerSegment[] = [];
  if (anchorBefore) {
    segments.push({
      waiv_power: anchorBefore.waiv_power,
      effective_from: windowStart,
    });
  }
  const sorted = [...inWindow].sort(
    (a, b) => a.recorded_at.getTime() - b.recorded_at.getTime(),
  );
  for (const point of sorted) {
    segments.push({
      waiv_power: point.waiv_power,
      effective_from: point.recorded_at,
    });
  }
  return segments;
}

/**
 * Time-weighted average of WAIV power over [windowStart, now].
 * Returns null when there is no anchor and no in-window history.
 */
export function computeTimeWeightedAvg(
  anchorBefore: WaivPowerHistoryPoint | null,
  inWindow: WaivPowerHistoryPoint[],
  windowStart: Date,
  now: Date,
): number | null {
  const segments = buildWaivPowerSegments(anchorBefore, inWindow, windowStart);
  if (segments.length === 0) {
    return null;
  }

  let weightedSum = 0;
  let totalDurationSec = 0;
  for (let i = 0; i < segments.length; i++) {
    const start = segments[i].effective_from;
    const end =
      i + 1 < segments.length ? segments[i + 1].effective_from : now;
    const durationSec = Math.max(0, (end.getTime() - start.getTime()) / 1000);
    weightedSum += segments[i].waiv_power * durationSec;
    totalDurationSec += durationSec;
  }

  if (totalDurationSec === 0) {
    return segments[segments.length - 1].waiv_power;
  }

  return weightedSum / totalDurationSec;
}

export function waivPowerAvgWindowStart(now: Date): Date {
  return new Date(
    now.getTime() - WAIV_POWER_AVG_WINDOW_DAYS * 24 * 60 * 60 * 1000,
  );
}
