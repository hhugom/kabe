---
status: ready-for-agent
---

# 0002 — Session lifecycle: start blank, log reps entry, end

## Parent

[Kabe v1 PRD](../PRD.md)

## What to build

The first end-to-end practice loop. Start a blank Session from Home, pick a `reps` Drill, log a DrillEntry as a single number, end the Session. The Resume Session banner appears on Home if a Session is still open and survives app close.

Scope:

- `sessions` table (`id`, `started_at`, `ended_at` nullable, `routine_id` nullable, `notes` nullable, sync-ready timestamps + soft delete).
- `drill_entries` table (`id`, `session_id`, `drill_id`, `value`, `attempted` nullable, `notes` nullable, `performed_at`, sync-ready timestamps + soft delete). Only `value` is used in this slice (reps count).
- Use cases:
  - `startSession({ routineId? })` — fails with a domain error if any Session has `ended_at IS NULL`.
  - `getActiveSession()` — returns the active Session plus its DrillEntries; null if none.
  - `endSession(sessionId)` — sets `ended_at = now()`.
  - `logEntry({ sessionId, drillId, value, performedAt? })` — inserts a DrillEntry. Defaults `performed_at` to `now()`. In this slice, only `reps` Drills are supported (UI prevents picking other metrics for now, or a guard at use-case level).
- UI:
  - **Home** screen: when `getActiveSession()` is null, show a big "Start Session" button. When non-null, show a "Resume Session • started Nh ago" banner instead.
  - **In-session** screen: pick a Drill (filtered to reps Drills for now); shows an entry form with a single numeric field (defaulting to the Drill's Target if set); Save creates a DrillEntry; list of already-logged entries for this Session displayed below; "End Session" action.
  - Resume-banner tap returns to the in-session screen with state intact.

The Session-singleton invariant is enforced **at the use-case layer**, not by a database constraint — keeps the rule in code where it's testable.

## Acceptance criteria

- [ ] Tapping "Start Session" with no active Session creates a Session row with `started_at = now()`, `ended_at = null`, and navigates to the in-session screen.
- [ ] Tapping "Start Session" while a Session is active is impossible from the UI (button is replaced by Resume); calling `startSession` directly returns a domain error in this case.
- [ ] In-session screen lists reps Drills; picking one opens an entry form.
- [ ] Entry form defaults its value to the Drill's `target` when set, blank otherwise.
- [ ] Submitting the entry persists a DrillEntry with `value` = entered number, `session_id` of the active Session, `performed_at` = now, and returns to the in-session screen with the entry now visible.
- [ ] "End Session" sets `ended_at`, returns to Home, where the active-session banner is no longer shown.
- [ ] Closing and reopening the app while a Session is open: Home shows the Resume banner.
- [ ] Use-case tests:
  - Single-active invariant: `startSession` succeeds once, second call returns an error.
  - `endSession` followed by `startSession` succeeds.
  - `logEntry` writes a row with the correct `value` and `session_id`.
- [ ] UI tests (in-session screen): submitting a value calls `logEntry` with `{ value, sessionId, drillId }`; after submission the new entry appears in the list.

## Blocked by

- #0001 — Project scaffold + Drill library
