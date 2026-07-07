---
status: ready-for-agent
---

# 0005 — Recent Sessions on Home + retroactive "Add past Session"

## Parent

[Kabe v1 PRD](../PRD.md)

## What to build

Two related additions, both about looking backwards rather than logging live:

1. **Recent Sessions on Home.** Below the Start / Resume area, a list of the most recent ended Sessions (limit 10), each row showing date, drill count, and total duration. Tapping a row drills into a read-only Session-detail screen listing every DrillEntry in that Session.
2. **Add past Session.** From Home, a secondary "Add past session" action opens a backfill flow: pick a date/time, then add DrillEntries (each with a Drill, value/attempted as appropriate for the Metric, and a per-entry `performed_at` defaulting to the Session date but editable). Save creates a Session with both `started_at` and `ended_at` set, and all entries attached.

Use cases:

- `getRecentSessions({ limit })` — returns ended Sessions (where `ended_at IS NOT NULL`) newest first, with derived fields (`drillCount`, `totalDurationSeconds`). Soft-deleted Sessions excluded.
- `getSessionDetail(sessionId)` — returns the Session and its DrillEntries with their Drills hydrated.
- `addPastSession({ startedAt, endedAt, entries: Array<{ drillId, value, attempted?, notes?, performedAt }> })` — transactional insert. Does NOT touch the active-Session invariant (a past Session is created with `ended_at` set, so it does not count as active).

UI:

- Home recent list renders the 10 most recent ended Sessions. Empty state when none.
- Session-detail screen lists entries grouped by Drill (with set counts visible: "Flat 1st serve: 3 entries").
- "Add past session" flow is a single screen with a date picker, an entry-add button, and a Save action.

## Acceptance criteria

- [ ] Recent Sessions list on Home shows up to 10 ended Sessions, newest first, with date, drill count, and total duration.
- [ ] Active Sessions never appear in the recent list.
- [ ] Tapping a recent Session opens a detail screen listing its entries.
- [ ] "Add past session" creates a Session with both `started_at` and `ended_at` set to the chosen date/time, plus the chosen DrillEntries with their `performed_at`.
- [ ] Adding a past Session while a Session is active does NOT fail (the active-Session invariant only applies to live Starts).
- [ ] DrillEntries in a past Session can have `performed_at` independent of the Session's `started_at`.
- [ ] Use-case tests:
  - `getRecentSessions` excludes active Sessions and soft-deleted Sessions.
  - `addPastSession` writes all entries in a single transaction; partial failure rolls back.
  - `addPastSession` succeeds while a separate live Session is active.
- [ ] UI test: Home renders the recent list given a stubbed `getRecentSessions` response.

## Blocked by

- #0002 — Session lifecycle: start blank, log reps entry, end
