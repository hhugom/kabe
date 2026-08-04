import { relativeDay } from './relative-day';

// Dates are built from LOCAL calendar components (new Date(y, monthIndex, d, h)) so the
// assertions hold in any runner timezone: the local calendar day is fixed by construction,
// and a calendar date's weekday (e.g. 2026-06-28 = Sunday) is timezone-independent.
const local = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h);

describe('relativeDay', () => {
  it('labels the same local day as "Today"', () => {
    expect(relativeDay(local(2026, 6, 30, 8), local(2026, 6, 30, 14))).toBe('Today');
  });

  it('labels the previous local day as "Yesterday"', () => {
    expect(relativeDay(local(2026, 6, 29, 20), local(2026, 6, 30, 8))).toBe('Yesterday');
  });

  it('labels 2–6 days ago as the weekday name', () => {
    // 2026-06-28 (2 days before) is a Sunday.
    expect(relativeDay(local(2026, 6, 28), local(2026, 6, 30))).toBe('Sun');
  });

  it('labels 7+ days ago as a short date, so weekdays do not read ambiguously', () => {
    // A week before — a weekday name would collide with this week.
    expect(relativeDay(local(2026, 6, 23), local(2026, 6, 30))).toBe('23 Jun');
  });

  it('keys off the device-local calendar day, not UTC (regression: #45 review)', () => {
    // 01:00 and 23:00 on the SAME local day. A UTC-based comparison puts these two
    // instants on different UTC dates for any non-UTC device — mislabeling an
    // evening/early-morning session as "Yesterday". Local-day math must say "Today".
    expect(relativeDay(local(2026, 6, 30, 1), local(2026, 6, 30, 23))).toBe('Today');
  });
});
