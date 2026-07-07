# Kabe v1 — Solo Tennis Drill Tracker

> **Tracker note:** No issue tracker is configured for this repo (`setup-matt-pocock-skills` not run; the existing git remote points at an unrelated project). This PRD is filed as a local markdown artifact under `.scratch/v1/`. The `ready-for-agent` label is implicit — when a tracker is wired up, this should be re-published and labelled.

## Problem Statement

I practise tennis alone — against a wall and on serve — and I have no reliable way to remember what I did or whether I'm getting better. Generic note apps lose structure (I never go back and read prose), spreadsheets are too fiddly to fill in at the court, and existing tennis apps either assume a coach, demand an account/network, or focus on match scoring rather than solo drilling. The result: I practise inconsistently, can't compare today to last month, and can't tell which drills are actually moving the needle.

## Solution

A local-first mobile app (Android-first, iOS coming along for the ride via Expo) that lets me:

- Pick a Drill from a small, opinionated seed library (wall + service), or one I've added myself.
- Start a practice **Session** at the court — either blank or launched from a **Routine** (a reusable, ordered list of drills I commonly chain together).
- Log each set live with the fewest possible taps — a number for reps, X/Y for accuracy, a tap-Start / tap-Stop timer for duration.
- Reopen the app at any time and find my session still running (auto-resume) or backfill a session I forgot to log.
- See, per Drill, how often I'm practising, my recent and lifetime totals, and how often I hit my Target.

No account, no network, no onboarding screens. The seeds are the tutorial.

## User Stories

### Home and navigation

1. As a player, I want to see my recent practice Sessions on the home screen, so that I can quickly review what I've been doing.
2. As a player, I want a prominent "Start Session" action on the home screen, so that I can begin a blank Session in one tap.
3. As a player, I want a "Start from Routine" action on the home screen, so that I can launch a familiar practice plan in one tap.
4. As a player, I want a "Resume Session" banner whenever a Session is still open, so that I don't accidentally start a duplicate Session.
5. As a player, I want bottom navigation between Home, Drills, and Stats, so that I can move between the act-now view, my library, and my progress view without hunting.

### Library and seeds

6. As a first-time user, I want the app to ship with 8 seed Drills and 2 seed Routines already in my library, so that I can use the app immediately without setup work.
7. As a player, I want to add a new Drill (name, Category, Metric, optional Target), so that I can capture Drills my coach suggests.
8. As a player, I want to edit an existing Drill's name, Target, or notes, so that my library reflects how I actually train.
9. As a player, I want to archive (soft-delete) a Drill I no longer use, so that my library stays relevant without losing past entry history.
10. As a player, I want seed Drills to be indistinguishable from Drills I've added (fully editable and archivable), so that I don't have to learn a "system vs user" distinction.
11. As a player, I want to create a new Routine by naming it and ordering Drills, so that I can save practice plans I'll reuse.
12. As a player, I want to set an optional `planned_sets` on each RoutineItem (e.g. "Flat serve × 3"), so that the Routine can express prescriptive intent.
13. As a player, I want to edit a Routine (reorder, add, remove RoutineItems, change planned_sets), so that my Routines evolve with my training.
14. As a player, I want to archive a Routine, so that my Routines list stays tidy.

### Sessions — starting and lifecycle

15. As a player, I want to start a blank Session in one tap, so that ad-hoc practice has no friction.
16. As a player, I want to start a Session from a Routine, so that my planned Drills are pre-loaded and ticked off as I go.
17. As a player, I want only one Session active at a time, so that the model is unambiguous and "resume" is meaningful.
18. As a player, I want the active Session to persist across app closes and crashes, so that I never lose progress mid-practice.
19. As a player, I want to be prompted to either resume or end an old open Session when I reopen the app, so that abandoned Sessions don't pile up unnoticed.
20. As a player, I want to end a Session manually with a tap, so that I'm in control of when it closes (no auto-end after idle).
21. As a player, I want to deviate from a Routine mid-Session by adding an ad-hoc Drill, so that I can adapt to how practice is actually going.
22. As a player, I want to skip a planned Routine item, so that I can shorten practice if I run out of time.

### Sessions — logging entries

23. As a player, I want to log a DrillEntry as I do each set, so that my records reflect what I actually did.
24. As a player, I want "3 sets of 20 serves" to record as three separate DrillEntries (not one with sub-fields), so that I can capture different per-set values.
25. As a player, I want the entry form to default to the Drill's Target value when set, so that I have less to type.
26. As a player, I want to add a freeform `notes` field to a DrillEntry, so that I can capture context like "windy" or "felt tired".
27. As a player, I want to log a `reps` Drill by entering a single number, so that recording a set is fast.
28. As a player, I want to log an `accuracy` Drill by entering successes (X) and attempts (Y), so that I can record performance precisely.
29. As a player, I want to log a `duration` Drill by tapping Start → screen stays on → timer counts up → tap Stop, with the elapsed seconds auto-saved as the DrillEntry value, so that I don't have to guess the duration.
30. As a player, I want the duration timer to show the Drill's Target (if set) as a reference line, so that I can pace myself.
31. As a player, I want the duration timer to record wall-clock elapsed (no pause/resume), so that the model is predictable and water breaks don't split my entry.

### Retroactive logging

32. As a player, I want to add a past Session with a custom date and entries, so that I can backfill Sessions I forgot to log live.
33. As a player, I want each DrillEntry to carry its own `performed_at` (independent of the Session's `started_at`), so that retroactive logs reflect when sets actually happened.

### Editing and deletion

34. As a player, I want to edit a DrillEntry's value, notes, or timestamp after logging, so that I can correct mistakes.
35. As a player, I want to edit or delete a past Session, so that bad data doesn't pollute my stats.
36. As a player, I want deletion to be soft (set `deleted_at`, hidden from UI), so that accidental deletes don't lose my data forever.

### Stats and progress

37. As a player, I want a per-Drill stats page showing: last-done relative time, last-30-days summary, all-time totals, and a chronological history of entries — so that I can see progress and recent trends at a glance.
38. As a player, I want the last-30-days summary to include entry count and the metric's sum/average (reps total, minutes total, accuracy percentage), so that recent activity is glanceable.
39. As a player, I want the last-30-days summary to show "target hit: X / Y sets" when the Drill has a Target, so that I can see how often I'm meeting my own bar.
40. As a player, I want "(target hit)" annotations on individual entries in the history list, so that I can quickly spot good sets.
41. As a player, I want per-Drill stats reachable from both the Drills list (tap a Drill) and the Stats tab, so that I can get to them naturally.

### Local-first

42. As a player, I want all data stored on my device with no account required, so that I can use the app without setting anything up.
43. As a player, I want my data to survive app updates, so that I don't lose history when a new version ships.
44. As a developer (future-me), I want the schema to use UUIDs + `created_at` / `updated_at` / `deleted_at` everywhere, so that cross-device sync can be added later without painful migration.

### First launch

45. As a first-time user, I want the app to open straight to the home screen with seeds in place, so that I'm not blocked by onboarding screens.
46. As a first-time user, I want the seed Routines to be ready to launch in one tap, so that my very first Session can be immediate.

### Platform

47. As an Android user (the v1 daily driver), I want the app to feel native and polished on Android, so that my primary device is well-supported.
48. As an iOS user, I want the same app to install and function on iOS, so that the option exists even if v1 polish is Android-first.

## Implementation Decisions

### Domain (terms come from `CONTEXT.md`)

- **Drill, Target, Category, Metric, Session, DrillEntry, Routine, RoutineItem** — see `CONTEXT.md` for canonical definitions. Implementations and UI copy use these names exactly.
- `Category` enum in v1: `wall | service`. (`partner` is reserved for future scope — ADR-0001.)
- `Metric` enum in v1: `reps | duration | accuracy`. No `free` metric (every Drill is quantifiable).
- A Drill carries an optional `Target` whose unit matches its Metric (integer reps, integer seconds, integer 0–100 accuracy percentage).
- Every DrillEntry has its own `performed_at` so retroactive backfill works and sets can be reordered within a Session.
- A Routine is a soft starting point for a Session, not a contract — once a Session is active, the player can add ad-hoc Drills, skip planned RoutineItems, log fewer or more sets than `planned_sets`.
- At most one Session may have `ended_at IS NULL` at any time. Enforced at the use-case layer (UI checks before starting; a use-case-level invariant blocks a second open Session).

### Architecture (respects ADR-0002)

- Expo (React Native) + TypeScript, single codebase for Android + iOS.
- `expo-sqlite` for on-device persistence, **Drizzle ORM** for typed schema and migrations.
- No backend, no auth, no network in v1.
- Sync-ready schema (UUID PKs, `created_at`, `updated_at`, `deleted_at` on every row) — no sync actually implemented.
- Soft delete only — no hard deletes. All read queries filter `deleted_at IS NULL`.
- Navigation: bottom tabs (Home / Drills / Stats). Routines are reachable as a sub-section of Drills (or a small list on Home), avoiding a fourth tab.

### Schema (Drizzle-shaped, prose form)

- `drills` — `id`, `name`, `category`, `metric`, `target` (nullable integer), `notes` (nullable text), `created_at`, `updated_at`, `deleted_at`.
- `routines` — `id`, `name`, `notes` (nullable text), `created_at`, `updated_at`, `deleted_at`.
- `routine_items` — `id`, `routine_id` (FK), `drill_id` (FK), `position` (integer, ordering within routine), `planned_sets` (nullable integer), timestamps.
- `sessions` — `id`, `started_at`, `ended_at` (nullable until ended), `routine_id` (nullable FK — null for blank Sessions), `notes` (nullable text), `created_at`, `updated_at`, `deleted_at`.
- `drill_entries` — `id`, `session_id` (FK), `drill_id` (FK), `value` (integer — reps count, seconds elapsed, or successes), `attempted` (nullable integer — denominator for accuracy Drills only), `notes` (nullable text), `performed_at`, `created_at`, `updated_at`, `deleted_at`.

`value` interpretation depends on the Drill's `metric`:
- `reps` → `value` is the count, `attempted` is null.
- `duration` → `value` is seconds elapsed, `attempted` is null.
- `accuracy` → `value` is successes (numerator), `attempted` is the denominator. Both required.

### Use-case layer (the primary seam)

Pure-ish functions that own the domain rules and are the only callers of Drizzle. UI calls these; tests call these. Initial surface (names indicative):

- `seedIfEmpty()` — first-launch seed insert if no Drills exist.
- `listDrills({ includeArchived? })`, `createDrill(...)`, `updateDrill(...)`, `archiveDrill(id)`.
- `listRoutines(...)`, `createRoutine(...)`, `updateRoutine(...)`, `archiveRoutine(id)`, `reorderRoutineItems(...)`.
- `startSession({ routineId? })` — fails if an active Session exists.
- `getActiveSession()` — returns the open Session (if any) plus its RoutineItems and so-far DrillEntries.
- `endSession(sessionId)`.
- `addPastSession(...)` — retroactive backfill.
- `logEntry({ sessionId, drillId, value, attempted?, notes?, performedAt? })`.
- `editEntry(...)`, `deleteEntry(...)`, `editSession(...)`, `deleteSession(...)`.
- `getDrillStats(drillId)` — returns `{ lastDone, last30d: { entries, sum/avg, targetHitRatio? }, allTime: {...}, history: DrillEntry[] }`.
- `getRecentSessions({ limit })` — chronological list for the home screen.

The use-case layer is the **only place** where session-singleton, soft-delete filtering, and metric-type-dependent value interpretation live. Drizzle queries are an implementation detail behind it.

### Seed data

Inserted by `seedIfEmpty()` on first launch.

**Seed Drills** (8):
- Wall, duration:
  - Forehand crosscourt rally
  - Backhand rally
  - Alternating FH/BH rally
  - Volley sequence close to wall
- Service, accuracy:
  - Flat 1st serve, deuce box
  - Flat 1st serve, ad box
  - Slice serve wide
  - Second serve, body

**Seed Routines** (2):
- *Wall warmup* — FH crosscourt (planned_sets: 1) → BH rally (1) → Alternating FH/BH (1).
- *Full serve session* — each of the 4 service drills × 3 planned_sets.

Targets on seed Drills are left blank; the player sets their own once they know their baseline.

### Timer UX (duration Drills)

- Foreground-only timer. Uses `expo-keep-awake` to hold the screen on during a running drill.
- Counts UP from 00:00. If the Drill has a Target, the target time appears as a reference label below the running clock (e.g. "target 10:00").
- Records `started_at` on Start. On Stop: `value = now - started_at` in seconds, write a DrillEntry, return to the in-session screen.
- No pause/resume. App backgrounded mid-timer: when foregrounded, recompute elapsed from wall-clock difference (resilient to OS sleep).
- No background notifications, no Apple Watch hand-off.

### First-launch detection

- App boot calls `seedIfEmpty()`. If `drills` count = 0, run the seed insert in a single transaction. Otherwise no-op.
- No "is first launch" flag — the empty-DB check is the trigger, idempotent on reinstall.

### Out-of-band

- Repo's git remote (`hhugom/rythm-game.git`) is stale and unrelated to this project. It will need re-pointing to the correct Kabe repo before any push.
- `setup-matt-pocock-skills` should be run early to wire up an issue tracker so subsequent PRDs don't fall back to local markdown.

## Testing Decisions

### What makes a good test in this repo

- **Tests observable external behaviour only.** A test should describe what the user (or use-case caller) experiences, not how it's wired internally. "Starting a Session while one is already open returns an error" — good. "`startSession` calls `db.insert` with these arguments" — bad.
- **Refactor-tolerant.** Schema column renames, query restructuring, or moving helpers around must not break tests.
- **Honest data setup.** Use the real in-memory SQLite + the real Drizzle schema. Don't mock the DB out of unit tests at the use-case seam — the whole point of testing use cases is to verify the schema interaction.
- **Fast.** No real timer waits in tests — inject a clock at the use-case boundary so duration / "30 days ago" logic is deterministic.

### Two seams

1. **Use-case layer (primary seam).** All domain rules tested here. Each test spins up an in-memory SQLite, runs migrations, optionally seeds fixtures, calls a use case, asserts on the returned data and on follow-up queries. Coverage targets:
   - Session lifecycle: start, single-active invariant, resume detection, end, retroactive add.
   - Entry logging per Metric type (reps, duration, accuracy) — value/attempted shape, target-hit calculation.
   - Routine launch: planned items appear, ad-hoc additions work, skipped items don't appear in stats, deviating doesn't corrupt the Routine.
   - Soft-delete behaviour: archived Drills don't appear in listings but their past entries still appear in Session history.
   - Stats math: last-done, 30-day window edges (inclusive/exclusive), all-time totals, target-hit ratio.
   - Seed: idempotent on a non-empty DB.

2. **UI component tests for key screens.** `react-native-testing-library` against three screens, with the use-case layer mocked. Coverage targets:
   - **Home** — Resume banner appears when active Session exists; Start Session and Start from Routine actions fire the right use case; recent Sessions render.
   - **In-session** — picking a Drill and submitting an entry calls `logEntry` with the right shape (per Metric); duration timer renders Start/Stop and triggers `logEntry` on Stop with the elapsed value; routine items tick off as entries are logged.
   - **Stats (per-Drill)** — renders last-done, 30-day summary, all-time, and history list against a stubbed `getDrillStats` response.

### Prior art

Greenfield repo — no existing tests. Establish patterns with this v1:

- Use-case tests: Vitest (or Jest if Expo's default tooling pushes there), one file per use case, helper to build an in-memory DB + migrate + seed fixtures.
- UI tests: `@testing-library/react-native` + `jest-expo` preset, one file per screen, use-case module mocked at the import boundary.

## Out of Scope

- **Partner drills** — deferred per ADR-0001. No partner identity, no shared sessions, no two-player tracking. `Category.partner` is reserved but not wired up.
- **Cross-device sync / cloud backup** — schema is sync-ready (UUIDs, timestamps, soft delete) but no sync layer is built. No account, no server.
- **Export / import** — no CSV export, no JSON dump, no manual backup flow.
- **Goals and streaks** — no "7 days in a row", no weekly target, no gamified mechanics.
- **Charts and graphs** — stats are numeric summaries + history lists only. Line/bar charts deferred to v2.
- **Notifications and reminders** — no push, no scheduled "time to practise" alerts.
- **Background timer** — duration timer is foreground + keep-awake only. No background task entitlements, no lock-screen widget.
- **Pause/resume on duration timer** — wall-clock Start → Stop is the only model.
- **Per-rep counting UX** — set-level logging is the only flow. No "tap +1 per serve" mode.
- **Coaching, video, form analysis, AI feedback** — no media capture or analysis.
- **Multi-user / family / profile switching** — single implicit user per device.
- **Drill sharing / community library** — no import-from-other-users.
- **Apple Watch / wearables** — phone only.
- **Onboarding screens** — seeds are the tutorial.

## Further Notes

- **Two ADRs are load-bearing** for this PRD: `docs/adr/0001-v1-scope-solo-only.md` (scope) and `docs/adr/0002-v1-architecture.md` (stack). Future ADRs should be added when a new "hard to reverse + surprising + real trade-off" decision is made.
- **The `notes` interpretive rule** (from grilling): a Routine is a *soft contract*. The UI must always allow deviating, skipping, and adding ad-hoc. If a future design feels like it's locking the Session to the Routine, push back.
- **Repo housekeeping** (not strictly in this PRD's scope but a blocker): fix the stale git remote and run `setup-matt-pocock-skills` so the next PRD can be filed in a real tracker with a real `ready-for-agent` label.
- **App name "kabe"** (壁, Japanese for "wall") is intentional — keep it in package name, splash, and store metadata.
