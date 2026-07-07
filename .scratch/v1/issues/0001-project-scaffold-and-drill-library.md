---
status: ready-for-agent
---

# 0001 — Project scaffold + Drill library (seeds visible)

## Parent

[Kabe v1 PRD](../PRD.md)

## What to build

Bootstrap the Expo project and deliver the first end-to-end tracer: open the app, see the seeded Drill library on the **Drills** tab. No Sessions, no logging, no stats yet — just the library showing up because the schema, the seed use case, and the UI are all wired through.

Scope of the scaffold (carried by this slice because everything downstream depends on it):

- Expo (React Native) + TypeScript project initialised at the repo root.
- Bottom-tab navigation with three tabs: **Home**, **Drills**, **Stats**. Home and Stats are empty placeholder screens.
- `expo-sqlite` + **Drizzle ORM** wired up. Migrations run on app boot.
- Initial schema: the `drills` table only (other tables come in later slices). All sync-ready columns (`id` UUID, `created_at`, `updated_at`, `deleted_at`).
- Use-case layer module exposing `listDrills({ includeArchived? = false })` and `seedIfEmpty()`. `seedIfEmpty` inserts the 8 seed Drills (see PRD) iff the `drills` table is empty.
- `App` boot calls `seedIfEmpty()` once on launch.
- Drills tab queries `listDrills()` and renders the result as a flat list (name + category badge + metric badge). No tap interaction yet.

Use the domain glossary in `CONTEXT.md` — `Drill`, `Category`, `Metric`, `Target` — for all UI copy, type names, and column names.

## Acceptance criteria

- [ ] `npx expo start` launches the app on Android (the dogfood platform per ADR-0002); iOS build succeeds even if QA isn't done.
- [ ] Bottom tabs render: Home, Drills, Stats. Home and Stats show a single "Coming soon" placeholder.
- [ ] On first launch (empty DB), the 8 seed Drills appear on the Drills tab.
- [ ] On second launch (DB has rows), no duplicate seeds are inserted. `seedIfEmpty` is idempotent.
- [ ] The `drills` table has UUID `id`, `name`, `category` (`wall` | `service`), `metric` (`reps` | `duration` | `accuracy`), nullable `target`, nullable `notes`, `created_at`, `updated_at`, `deleted_at`.
- [ ] `listDrills()` excludes rows where `deleted_at IS NOT NULL` by default.
- [ ] Use-case test: `seedIfEmpty` inserts 8 rows on empty DB; running it again leaves the count at 8.
- [ ] UI test (`@testing-library/react-native`): Drills screen, given a stubbed `listDrills` returning 3 mocks, renders 3 list rows with the expected names.
- [ ] App package name and splash use "kabe".

## Blocked by

None — can start immediately.
