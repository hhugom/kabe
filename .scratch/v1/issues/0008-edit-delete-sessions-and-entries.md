---
status: ready-for-agent
---

# 0008 — Edit / delete Sessions and DrillEntries (soft)

## Parent

[Kabe v1 PRD](../PRD.md)

## What to build

Make logged data correctable. From the Session-detail screen (#0005), tap any DrillEntry to edit its `value`, `attempted`, `notes`, or `performed_at`, or to delete it. From the same screen, edit or delete the whole Session (`started_at`, `ended_at`, `notes`, or soft-delete it). Deletes are soft.

Use cases:

- `editEntry({ id, value?, attempted?, notes?, performedAt? })` — partial update, validates that the new shape still matches the Drill's Metric (e.g. `attempted` non-null iff `accuracy`).
- `deleteEntry(id)` — sets `deleted_at = now()`. Idempotent.
- `editSession({ id, startedAt?, endedAt?, notes? })` — partial update.
- `deleteSession(id)` — sets `deleted_at` on the Session AND cascades (in code, not via FK CASCADE) `deleted_at` onto its DrillEntries. The cascade is at the use-case layer so the rule is testable.

UI:

- Session-detail screen (from #0005) gets an edit/delete action menu on each entry row.
- Editing an entry opens a metric-shaped form pre-filled with current values; saving persists.
- Deleting prompts a confirmation toast with an Undo affordance (sets `deleted_at` to null if Undo tapped within the toast window — local UI behaviour, no time bomb).
- Session-detail screen gets a "Edit session" and a "Delete session" action in a header menu.
- Editing/deleting a Session that is currently active is allowed (it just keeps `ended_at = null` unless explicitly set).

Stats & history integration:

- Stats and recent-Sessions queries already filter `deleted_at IS NULL` (per #0001 / #0004 / #0005) — verify these filters across the board after soft-delete cascade.

## Acceptance criteria

- [ ] On Session-detail, each DrillEntry row has Edit and Delete actions.
- [ ] Edit opens a metric-shaped form with current values; Save persists and the row updates in place.
- [ ] Delete sets `deleted_at`; an Undo toast appears, tapping Undo clears `deleted_at`.
- [ ] After delete, the entry no longer appears in Session-detail, recent-Session totals, or per-Drill stats.
- [ ] Editing an accuracy entry to remove `attempted` is rejected with a clear error; editing a reps entry to add `attempted` is also rejected.
- [ ] Editing `performed_at` keeps the entry attached to its Session even if the new timestamp is outside `[started_at, ended_at]` (we trust the player).
- [ ] "Edit session" allows changing `started_at`, `ended_at`, and `notes`.
- [ ] "Delete session" cascades soft-delete onto all the Session's DrillEntries; Undo restores BOTH the Session and its entries.
- [ ] Use-case tests:
  - `editEntry` partial update; metric-shape validation.
  - `deleteEntry` is idempotent and hides from `listDrills`'s downstream queries.
  - `deleteSession` cascades to entries; restoring the Session restores entries that were cascaded by this delete (not entries that were soft-deleted earlier — keep their original `deleted_at`).
- [ ] UI test: edit form on Session-detail calls `editEntry` with the changed shape; delete row triggers the Undo toast.

## Blocked by

- #0002 — Session lifecycle: start blank, log reps entry, end
- #0005 — Recent Sessions on Home + retroactive add (Session-detail screen lives there)
