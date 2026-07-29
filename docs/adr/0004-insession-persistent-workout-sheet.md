# InSession is a persistent workout sheet, not a stack push

The InSession surface is a persistent bottom sheet rooted at the top of the app tree, not a stack-push route. It has two snap points — **PEEK** (a compact header showing elapsed time and current-drill label) and **FULL** (sheet occupies the screen above the tab bar and status bar). It is non-modal — while PEEKed, the underlying tab-root or pushed screen stays interactive. Hardware back at FULL collapses to PEEK; it never dismisses the sheet (only ending the session does). Dismissal is not user-driven — a session ends via the in-sheet three-dot Session menu → End Session flow. Reference: Strong's in-workout view (same PEEK/FULL non-modal model).

Trigger: session state was invisible from every tab-root except Home. A player mid-drill on Routines/Stats had no at-a-glance signal a session was running. The previous compensations — amber ActiveSessionPill on stack-push headers, tab-bar Resume morph, Home hero morph — solved three narrow slices with three separate mechanisms. The persistent sheet peek covers all of them in one primitive: elapsed timer + current drill label visible from every surface, one tap to expand. The ActiveSessionPill component and its coupling in PillHeader are retired (dead code deleted; no shim). The tab-bar center-button morph was already retired in #40. The Home hero's active-session morph is now redundant with the peek — kept in-place for one release because ripping it out is out of scope for this ADR; future ticket may collapse it.

Rejected alternatives:

- **Keep InSession as a stack-push route.** Loses at-a-glance visibility from other tabs. Every compensating affordance (pill, hero morph, resume tab) is a bandaid. This is what the codebase had; the switch is the whole point of the ADR.
- **Modal sheet with dimmed backdrop (archetype 3 Sheet).** Blocks interaction with underlying surfaces. Cannot serve the "peek from anywhere" role. Also lifecycle-hostile: dismissing the sheet doesn't imply ending the session, but the archetype's contract does.
- **Full-screen overlay (archetype 4 Modal).** Same interaction-blocking problem, plus its "tap-outside ignored / explicit action required" contract fights the peek/collapse gesture.
- **Bottom nav item + stack-push route (like Instagram's Create tab).** Adds a fourth tab for a surface that isn't a navigation destination — dilutes the tab set (see navigation-surface.md § Tab set rationale).
- **Floating action button that opens InSession as a route.** Same problems as stack-push (no at-a-glance), plus FAB adds chrome the flat Zwift-HUD strip specifically rejected in #40.
- **Peek header on the tab bar (extend the tab bar upward when session active).** Confuses navigation chrome with session state; peek would move when routes change tab visibility. The rooted sheet decouples cleanly.

Consequences:

- `docs/conventions/navigation-surface.md` — the four screen archetypes become five; InSession migrates from archetype 2 (Stack push) to a new archetype 5 (Persistent workout sheet). § Active-session pill is retired. § Header stance no longer applies to InSession. § Header-icon affordance for the Session menu moves from RN header three-dot to an in-sheet three-dot at the top of the sheet body.
- `docs/conventions/primary-vs-annex.md` — InSession-picker / -reps / -accuracy / -duration mode-screens collapse into a single sheet-body surface. Goal renames from four separate goals to *Run a Session*. The one-goal-per-mode-screen rule still applies within the sheet body (FocusHero is the single active mode at any instant; UpNextStrip and DoneList are same-goal peripheral).
- Screens that render bottom-anchored primary buttons under the sheet peek must add bottom padding equal to `PEEK_HEIGHT` when a session is active on a stack-push route (RoutineEditor is the only current case). Exposed via `useSessionSheetInset()` from `SessionSheet.tsx`.
- The three-dot Session menu is no longer wired via `navigation.setOptions({ onMenuPress })` — that indirection existed to let a screen publish its menu to its RN header. InSession owns and renders its own three-dot inside the sheet.
- `ActiveSessionPill.tsx` + tests are deleted (dead code). `PillHeader` no longer accepts `sessionActive` / `onResumePress` props.
- The `InSession` route is removed from `RootStackParamList`. Screens that previously navigated to InSession call `useSessionSheet().openFull()` instead.
