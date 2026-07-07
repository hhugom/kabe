---
status: ready-for-agent
---

# 0003 — Accuracy entry + duration entry with live timer

## Parent

[Kabe v1 PRD](../PRD.md)

## What to build

Extend logging from `reps` to the full Metric set. Two new entry experiences:

- **Accuracy**: pick a Drill whose `metric = accuracy`, enter `value` (successes / numerator) and `attempted` (denominator), Save.
- **Duration**: pick a Drill whose `metric = duration`, see a Start button. Tap → the screen keeps awake, a clock counts UP from 00:00, the Drill's Target (if set) is shown as a static reference label. Tap Stop → `value` is set to elapsed seconds, a DrillEntry is written, return to the in-session screen.

Use cases:

- Extend `logEntry` to accept `attempted` (required for `accuracy` Drills, must be null for `reps`/`duration`) and to accept `value` in seconds for `duration`.
- A clock dependency is injected at the use-case boundary so duration / timestamp logic is deterministic in tests.

UI:

- Entry form on the in-session screen branches on the Drill's Metric:
  - `reps` → single number field (already done in #0002).
  - `accuracy` → two number fields (in / total), Target defaults the "total" when set.
  - `duration` → timer screen with Start / Stop, target reference label.
- Timer uses `expo-keep-awake` only while running, not before or after.
- Backgrounding the app mid-timer: when foregrounded, the elapsed display recomputes from `started_at` so OS sleep doesn't matter.

## Acceptance criteria

- [ ] Picking an accuracy Drill shows a two-field form (in / attempted). Both are required; submission persists a DrillEntry with both `value` and `attempted` set.
- [ ] Picking a duration Drill shows a Start button. Tapping Start starts a clock counting up.
- [ ] Screen stays on while the timer runs and turns off on Stop.
- [ ] Tapping Stop persists a DrillEntry with `value = elapsed seconds`, `attempted = null`, and the elapsed display agrees with the wall-clock difference between Start and Stop.
- [ ] If the Drill has a Target, the timer screen shows it (e.g. "target 10:00") but does not auto-stop.
- [ ] Backgrounding then foregrounding the app while the timer is running shows an updated elapsed time, not a frozen one.
- [ ] `logEntry` returns a domain error if `attempted` is missing for an accuracy Drill, or non-null for a non-accuracy Drill.
- [ ] Use-case tests:
  - Accuracy: `logEntry` with `value=16, attempted=20` persists both columns.
  - Duration: `logEntry` with `value=600` persists 600.
  - Validation errors for the wrong shapes per metric.
  - Clock injection deterministic — Start/Stop elapsed math testable without `setTimeout`.
- [ ] UI tests: accuracy form submit calls `logEntry` with `{ value, attempted }`; duration Stop calls `logEntry` with elapsed seconds.

## Blocked by

- #0002 — Session lifecycle: start blank, log reps entry, end
