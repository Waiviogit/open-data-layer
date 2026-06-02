import {
  computeTimeWeightedAvg,
  WAIV_POWER_AVG_WINDOW_DAYS,
} from './waiv-power-avg.util';

const DAY_MS = 24 * 60 * 60 * 1000;

function daysAgo(now: Date, days: number): Date {
  return new Date(now.getTime() - days * DAY_MS);
}

describe('computeTimeWeightedAvg', () => {
  const now = new Date('2026-06-02T12:00:00.000Z');
  const windowStart = daysAgo(now, WAIV_POWER_AVG_WINDOW_DAYS);

  it('returns anchor value for stable user with no in-window records', () => {
    const avg = computeTimeWeightedAvg(
      { waiv_power: 200, recorded_at: daysAgo(now, 60) },
      [],
      windowStart,
      now,
    );
    expect(avg).toBe(200);
  });

  it('ramps up after a large stake on day 1 of the window', () => {
    const avg = computeTimeWeightedAvg(
      { waiv_power: 200, recorded_at: daysAgo(now, 60) },
      [{ waiv_power: 20_200, recorded_at: daysAgo(now, 1) }],
      windowStart,
      now,
    );
    expect(avg).toBeCloseTo((200 * 29 + 20_200) / 30, 5);
  });

  it('handles multiple in-window changes', () => {
    const avg = computeTimeWeightedAvg(
      { waiv_power: 200, recorded_at: daysAgo(now, 60) },
      [
        { waiv_power: 5000, recorded_at: daysAgo(now, 20) },
        { waiv_power: 1000, recorded_at: daysAgo(now, 15) },
      ],
      windowStart,
      now,
    );
    expect(avg).toBeCloseTo((200 * 10 + 5000 * 5 + 1000 * 15) / 30, 5);
  });

  it('returns in-window value for new user without anchor', () => {
    const avg = computeTimeWeightedAvg(
      null,
      [{ waiv_power: 500, recorded_at: daysAgo(now, 5) }],
      windowStart,
      now,
    );
    expect(avg).toBe(500);
  });

  it('barely moves when change happened at the end of the window', () => {
    const avg = computeTimeWeightedAvg(
      { waiv_power: 200, recorded_at: daysAgo(now, 60) },
      [{ waiv_power: 20_200, recorded_at: new Date(now.getTime() - 1000) }],
      windowStart,
      now,
    );
    expect(avg).toBeCloseTo(200, 0);
  });

  it('returns null when there is no history', () => {
    expect(computeTimeWeightedAvg(null, [], windowStart, now)).toBeNull();
  });
});
