# Kabe

A local-first app for practicing solo tennis drills (wall, service) and tracking progress over time. Partner drills are out of scope for v1.

## Language

**Drill**:
A repeatable tennis practice routine. Covers solo work (wall, service) in v1. Has a category, a metric type, and an optional target value (e.g. 20 reps, 10 min, 80% accuracy).
_Avoid_: Exercise, workout, routine

**Target**:
The optional aim a Drill is set up for. Same unit as the Drill's metric. When set, drives the default entry value and stats like "% of sessions where target was met". When blank, the Drill has no expected value.

**Category**:
The kind of drill: `wall` or `service` in v1. A flat tag on a Drill, not a subtype. `partner` is reserved for future scope.

**Metric**:
What a Drill measures every time you do it. One of: `reps` (count to N), `duration` (practice for N minutes), or `accuracy` (X of Y successful). Declared on the Drill. Every DrillEntry also has a freeform `notes` field for unstructured context (e.g. "windy", "felt tired").

**Session**:
One practice outing (a single trip to the court or wall). Contains one or more DrillEntries. Has `started_at` and a nullable `ended_at` (null while the session is in progress).
_Avoid_: Workout, practice, training

**DrillEntry**:
The record of doing a Drill once inside a Session. Holds the logged metric value (reps done, duration in seconds, or X of Y successful) plus optional notes and its own `performed_at` timestamp (allows retroactive backfill).
_Avoid_: Attempt, log, run, set

**Routine**:
A named, reusable, ordered list of Drills that can be launched as a Session in one tap (e.g. "Wall warmup", "Full serve session"). A starting point, not a contract — once the Session is in progress you can add ad-hoc Drills or skip planned ones.
_Avoid_: Template, plan, program

**RoutineItem**:
One entry in a Routine: a reference to a Drill plus an optional `planned_sets` (e.g. 3) and a position in the ordered list. Blank `planned_sets` means "do this Drill at least once, count is up to you".
