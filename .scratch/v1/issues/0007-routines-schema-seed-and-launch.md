---
status: ready-for-agent
---

# 0007 — Routines: schema + seed + Start from Routine, with deviation

## Parent

[Kabe v1 PRD](../PRD.md)

## What to build

Add the `Routine` concept end-to-end: schema, two seed Routines, CRUD, and a "Start from Routine" Session launch with planned-item tick-off — while preserving the soft-contract rule (deviation, skipping, and ad-hoc additions are all allowed mid-Session).

Schema:

- `routines` (`id`, `name`, `notes` nullable, sync-ready timestamps + soft delete).
- `routine_items` (`id`, `routine_id` FK, `drill_id` FK, `position` integer, `planned_sets` nullable integer, sync-ready timestamps + soft delete).

Use cases:

- `listRoutines({ includeArchived? })`, `getRoutine(id)`, `createRoutine({ name, items: Array<{ drillId, plannedSets? }> })`, `updateRoutine(...)`, `archiveRoutine(id)`, `reorderRoutineItems(routineId, orderedItemIds[])`.
- `startSession({ routineId })` (extend the existing use case from #0002) — sets `routine_id` on the Session and returns a planned-items snapshot (drillId + plannedSets per item).
- The "planned items" snapshot lives on the active-session screen state, NOT a database table. As DrillEntries are logged, the UI ticks off planned items by counting DrillEntries per drillId in this Session against `planned_sets`.
- Skipping a planned item is a UI gesture only — no DB row needed. Adding an ad-hoc Drill is just `logEntry` against a Drill that wasn't in the Routine.
- Extend `seedIfEmpty` to also seed the 2 Routines from the PRD ("Wall warmup" and "Full serve session") iff `routines` is empty.

UI:

- Home gets a second primary action: **"Start from Routine"** which lists Routines, tap one to start a Session against it.
- In-session screen, when launched from a Routine, shows the planned items at the top with progress badges ("2 / 3 sets done" when `planned_sets` is set, "logged: N" when null). Each planned item has a Skip action.
- The full Drill picker (for ad-hoc additions) is still available below the planned list.
- A "Routines" sub-section on the Drills tab lists Routines, with a "+" to create a new one and tap-to-edit. Editor allows: rename, add/remove items, reorder, set `planned_sets` per item.

## Acceptance criteria

- [ ] On first launch (empty DB), the 2 seed Routines appear in the Routines section.
- [ ] Tapping "Start from Routine" on Home lists Routines; tapping one starts a Session with `routine_id` set and pre-loads the planned items on the in-session screen.
- [ ] As DrillEntries are logged against a planned item's Drill, the tick-off badge updates.
- [ ] Skipping a planned item is local UI state — no DB change, and the same Drill can still be logged ad-hoc later in the Session.
- [ ] Adding a Drill not in the Routine still works via the standard Drill picker.
- [ ] Routine editor allows reordering, adding, removing RoutineItems and setting `planned_sets` (nullable) per item.
- [ ] Archived Routines disappear from the launch list but past Sessions that referenced them still display correctly.
- [ ] `seedIfEmpty` remains idempotent across Drills AND Routines (a partial reseed never produces duplicates).
- [ ] Use-case tests:
  - `createRoutine` writes the routine and items atomically with the right `position` order.
  - `reorderRoutineItems` updates positions without dropping items.
  - `startSession({ routineId })` sets `routine_id` on the Session row.
  - Seed Routines insert iff `routines` is empty.
- [ ] UI test: in-session screen, given a stubbed Routine and a stream of `logEntry` calls, the planned-items tick-off reflects the entries.

## Blocked by

- #0002 — Session lifecycle: start blank, log reps entry, end
- #0006 — Drill CRUD (re-uses the same form/editor patterns)
