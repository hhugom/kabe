---
status: ready-for-agent
---

# 0004 — Per-Drill stats page (last-done, 30d, all-time, history)

## Parent

[Kabe v1 PRD](../PRD.md)

## What to build

A stats page per Drill, reachable two ways: tapping a Drill in the Drills tab, or browsing into the Stats tab. Shows the four sections agreed in the PRD: last-done, last 30 days, all-time, and history.

Use case:

- `getDrillStats(drillId)` returns:
  ```ts
  {
    drill: Drill,
    lastDone: ISODate | null,
    last30d: {
      entries: number,
      // metric-shaped totals:
      //   reps     → { totalReps: number }
      //   duration → { totalSeconds: number }
      //   accuracy → { totalIn: number, totalAttempted: number, percent: number }
      totals: MetricTotals,
      targetHit: { hit: number, of: number } | null   // null if Drill has no target
    },
    allTime: { entries: number, totals: MetricTotals },
    history: Array<{
      entryId: UUID,
      performedAt: ISODate,
      value: number,
      attempted: number | null,
      notes: string | null,
      targetMet: boolean | null   // null if no target on the Drill
    }>
  }
  ```
- "Last 30 days" window is `[now − 30 days, now]` (inclusive both ends). The window edges are deterministic given an injected clock.
- `targetMet` is `value >= target` for reps and duration, and `(value / attempted) * 100 >= target` for accuracy.

UI:

- Header: Drill name, category badge, metric badge, target string ("target 80%", "target 10 min", "target 20 reps", or "no target").
- Sections in this order: Last done, Last 30 days, All time, History.
- Empty states: "No entries yet" when the Drill has never been logged.
- Stats tab landing screen is a simple list of all Drills, each linking to its stats page.

## Acceptance criteria

- [ ] Tapping a Drill on the Drills tab opens its stats page.
- [ ] Stats tab shows a list of Drills; tapping one opens the same stats page.
- [ ] Stats page renders all four sections with the metric-appropriate totals.
- [ ] "Target hit: X / Y" shown for the last 30 days only when the Drill has a Target.
- [ ] History list shows entries newest first, with "(target hit)" annotation when applicable.
- [ ] Drills with zero entries render an empty state, not an error.
- [ ] Use-case tests for `getDrillStats`:
  - 30-day window edge: an entry at exactly `now − 30 days` is included; at `now − 30 days − 1s` is excluded.
  - Reps totals sum correctly.
  - Duration totals sum correctly.
  - Accuracy percent uses `sum(value) / sum(attempted)`, not the average of per-entry percentages.
  - `targetHit` is null when no target is set; non-null and correct when one is.
  - Soft-deleted DrillEntries are excluded.
- [ ] UI test (stats screen): stubbed `getDrillStats` response renders into the expected sections.

## Blocked by

- #0001 — Project scaffold + Drill library
- #0002 — Session lifecycle: start blank, log reps entry, end
- #0003 — Accuracy + duration entry with live timer
