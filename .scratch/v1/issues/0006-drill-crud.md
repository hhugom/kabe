---
status: ready-for-agent
---

# 0006 — Drill CRUD (add, edit, archive) with soft-delete filtering

## Parent

[Kabe v1 PRD](../PRD.md)

## What to build

Let the player manage their Drill library: add a new Drill, edit any Drill (seeded or self-added), and archive Drills they no longer use. Seeded Drills are not special — they're editable and archivable like any other.

Use cases:

- `createDrill({ name, category, metric, target?, notes? })` — validates inputs, inserts a row, returns the Drill.
- `updateDrill({ id, name?, category?, metric?, target?, notes? })` — partial update. **Changing `metric` is allowed but must be a no-op if the Drill has any non-deleted DrillEntries** (returns a domain error in that case; otherwise the existing entries become invalid).
- `archiveDrill(id)` — sets `deleted_at = now()`. Idempotent.

UI:

- Drills tab gets a "+" action that opens a Drill-create screen (name field, category picker, metric picker, optional target number, optional notes).
- Tapping a Drill row from the Drills tab navigates to a Drill-detail / edit screen with an Archive action at the bottom.
- Archived Drills disappear from the Drills tab and from in-session Drill pickers, BUT a Drill referenced by past DrillEntries still appears in those past Sessions' history and on its own stats page (read-only view of historical data).

Stats integration:

- The stats page for an archived Drill still renders (via #0004's use case) — `listDrills({ includeArchived })` flag for the stats-tab list, with an "Include archived" toggle off by default.

## Acceptance criteria

- [ ] "+" on the Drills tab opens a create-Drill form. Submission persists the Drill and returns to the Drills list with the new Drill visible.
- [ ] Validation: name is required and non-empty; target is a non-negative integer (or blank); accuracy targets are 0–100; the metric/category enums are constrained.
- [ ] Tapping a Drill opens the edit screen, pre-filled with current values. Saving persists changes.
- [ ] Changing `metric` is rejected with a clear error if the Drill has DrillEntries.
- [ ] Archive action sets `deleted_at`, removes the Drill from the Drills tab and from Drill pickers in active Sessions.
- [ ] Past Sessions that referenced an archived Drill still display correctly in Session-detail (#0005) and on the per-Drill stats page (#0004).
- [ ] Use-case tests:
  - `createDrill` writes the row.
  - `updateDrill` partial update preserves untouched fields.
  - `updateDrill` rejects a metric change when entries exist.
  - `archiveDrill` is idempotent.
  - `listDrills()` excludes archived; `listDrills({ includeArchived: true })` includes them.
- [ ] UI test: create form submission calls `createDrill` with the entered shape and navigates back.

## Blocked by

- #0001 — Project scaffold + Drill library
