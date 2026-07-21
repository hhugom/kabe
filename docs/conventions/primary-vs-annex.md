# Primary vs annex convention

Resolved in issue #5 (part of map #1).

Every mode-screen in Kabe serves one goal. Everything on the screen either serves that goal (primary), earns a fixed sunlight exception (allow-listed), is minimal identity/structure (chrome), or gets disposed elsewhere (annex). This convention decides which — and settles bikesheds without re-litigating each screen.

## Goal-naming rule

The goal of a mode-screen is stated as **verb + noun-phrase**, from the player's point of view, expressing what they want to accomplish on this screen at this instant.

- Verb is a present-tense action the player performs (e.g. *start*, *pick*, *log*).
- Noun-phrase is a concrete thing in the domain vocabulary from `CONTEXT.md` (Drill, Session, DrillEntry, Routine).
- The whole phrase must fit in a single sentence with no "and" / "or". If you need a conjunction, you have two goals — split the mode-screen.

## The unit: mode-screen

The convention audits **rendered UI states**, not navigation destinations. If a single navigation destination swaps its whole UI between distinct layouts (e.g. picker → reps entry → accuracy entry → timer), each layout is a separate mode-screen with its own goal.

Consequence: the pain the convention exists to prevent ("secondary info competes for attention") lives per-view, not per-route. Applying it to routes would make goals so abstract they can't settle bikesheds.

## Vocabulary: primary, annex, chrome, allow-listed

Every on-screen item falls into exactly one of four buckets.

- **Primary** — serves the goal. Includes the goal itself (Save, Log), canonical goal-exits (Cancel), and same-goal alternative paths (e.g. *Start from Routine* alongside *Start Session*).
- **Annex** — doesn't serve the goal. Gets disposed via the ladder below. Default disposal is off-screen, not hidden-on-screen.
- **Allow-listed** — the small closed set of exceptions to the "goal-only on primary" rule (see below).
- **Chrome** — minimal identity/structure (app title on Home, header eyebrow, static screen titles). Must be small footprint and non-interactive. Chrome exists because forcing the app name to be classified as annex-or-primary is silly; without this bucket, chrome gets deleted or over-elevated.

## Disposal ladder

The 5 rungs, ordered by attention cost the annex item imposes on the goal when the player is *not* using it — lowest to highest:

1. **Removed from the app** — zero attention cost, zero access.
2. **Dedicated annex screen** — off this screen entirely; reached from nav or a flow-scoped affordance. Zero attention cost while on the primary surface.
3. **Bottom sheet from a subtle affordance** — on this screen but hidden; a small icon or handle is the only footprint.
4. **Modal** — on this screen, invoked by a prominent affordance. The affordance itself competes.
5. **Collapsed inline (expander)** — on this screen, in the layout; the collapsed header still occupies primary real estate.

**Default rung is #2 (annex screen).** Start there. Climb higher only when justified; drop lower only when justified.

**Updated by #8:** header-icon menus (Session menu, Routine menu — opened by the three-dot icon on stack-push headers) are a #8 override of this default — they use bottom sheets, not annex screens. Rationale: they're quick-tap 1–3-item menus, not exploration surfaces. See `navigation-surface.md` § Header-icon affordance.

**Climb criterion.** Climb to sheet / modal / inline only when the item is **needed *during* the goal** — the player can't complete the goal without seeing it right now.

**Drop-to-removed criterion.** Drop to removed when the item **answers no player-question** — nobody would ever navigate to it. A stub annex screen has real cost (nav entry, empty state, maintenance); don't build one if it has no purpose.

**Flow-scoped annex screens are reached from within the flow, not the tab bar.** The tab bar is reserved for top-level surfaces. A "Session menu" annex is reached by a header affordance on InSession, not by a Session tab.

## Sunlight/one-handed allow-list

Items on the primary surface that aren't the goal must earn admission via all three:

1. **Cross-flow safety.** Missing it causes silent data loss or corruption of another flow (e.g. player starts a second session because they forgot the first is still running).
2. **Time-sensitive.** The player needs to know *now*, not next time they open some tab.
3. **Single tap to resolve.** The item is either self-explanatory or a one-tap route to resolution — an escape hatch, not a notification.

**The allow-list is closed by default.** The initial list is exactly two items. Adding a third requires re-opening this doc; no per-screen judgment calls.

**Initial allow-list:**

- **Resume-session banner on Home.** When an active session exists, Home shows a resume card in place of the Start CTA. **Updated by #8:** superseded by the tab-bar center button morph — when a session is active, the center action on every tab-root morphs to *RESUME* in amber. The separate Home resume card is no longer needed on the tab-root itself.
- **Active-session pill on every non-InSession mode-screen while a session is running.** Top of screen, immediately below the status bar, spanning full width, in `accentAmber` (amber = "attention, but not destructive" per aesthetic-direction). Tapping navigates to InSession. **Updated by #8:** rendering rule narrows — no pill on tab-roots (center-button morph covers it), no pill on sheets or modals. Pill still appears on stack-push-with-header (RoutineEditor) above the RN header.

## Screen-by-screen goals

The nine mode-screens in v1 and their locked goals:

| Mode-screen | Goal |
|---|---|
| Home | Start a Session. |
| InSession-picker | Pick a Drill. |
| InSession-reps | Log reps for this Drill. |
| InSession-accuracy | Log accuracy for this Drill. |
| InSession-duration | Time this Drill. |
| PickRoutine | Pick a Routine. |
| Drills | Browse Drills. |
| RoutineEditor | Compose a Routine. |
| Stats | Review progress. |

**Updated by #8:** two goals revised. Home's goal shifts from *Start a Session* to *See recent practice* (Start-a-Session moved to the tab-bar center button, so Home no longer has a screen-scoped primary and becomes an at-a-glance dashboard surface). PickRoutine's goal broadens from *Pick a Routine* to *Start a Session* — it now hosts an "Empty start" affordance alongside the routine list. A new tab-root goal, *Manage Routines*, is added for the Routines tab (distinct from PickRoutine's session-launch goal). See `navigation-surface.md` § Tab set.

## Worked examples

### Home — goal: *Start a Session*

| Item | Bucket | Destination |
|---|---|---|
| "Kabe" title | Chrome | Stays — minimal branding mark |
| "Solo tennis, tracked." tagline | Annex, no player-question | **Removed** |
| Start Session button | Primary | Stays |
| Start from Routine button | Primary (same-goal alternative path) | Stays |
| Resume Session card | Allow-listed | Stays; amber treatment per allow-list spec |

### InSession-picker — goal: *Pick a Drill*

| Item | Bucket | Destination |
|---|---|---|
| Header eyebrow + title | Chrome | Stays |
| Fused planned-slot list (one row per planned set, empty or filled) | Primary | Stays — is the goal |
| Ad-hoc entry list (drills logged off-plan) | Primary | **Second section below the fused list**, labeled distinctly |
| Per-row Delete action (replaces Skip) | Primary | Stays; on filled rows, requires confirm-tap to prevent data loss |
| "Add a drill" CTA | Primary | Stays — routes to Add-a-drill annex screen |
| Add-a-drill screen (master drill list picker) | — | **New annex screen** reached from picker CTA |
| LOGGED SO FAR section (as separate block) | — | **Dissolved** — fused into the planned-slot list as the "filled" state, plus the ad-hoc section |
| End Session button (current footer bar) | Annex (belongs to a different goal) | **Session menu annex screen** reached from a header affordance present on all InSession modes |
| Unfilled-slot handling at End Session | — | Session menu triggers a **modal** if any planned slots remain unfilled: "mark complete-to-target" or "skip" (bulk resolve) |

**Fusion detail.** Instead of two separate blocks (PLANNED with aggregate progress, LOGGED SO FAR chronological), a single list where each planned *set* is its own row. A routine item with `plannedSets: 3` becomes three rows. Each row is either an empty slot (tap → routes to the drill's entry mode) or a filled slot (shows logged value; tap → view/edit that entry). Ad-hoc entries render in a second section below.

**No-routine sessions.** The fused list starts empty; the primary surface is the "Add a drill" CTA. Empty state IS the CTA.

**Per-row Delete semantics.** On empty rows, Delete removes the planned slot from this session (functionally = skip, renamed for consistency). On filled rows, Delete erases the logged entry and reverts the row to empty; requires confirm-tap because it destroys data. The unfilled-slots modal at End Session catches any slot still empty at session end.

### InSession entry modes (reps / accuracy / duration)

**Compliant, no changes.** Each entry mode is already single-goal, single-primary. Header is Chrome; the input primitive(s), Save, and Cancel are all Primary (Cancel is a canonical goal-exit). The duration mode's TARGET / REMAINING chips and progress bar are Primary — needed to pace during the goal. No allow-listed pill in entry modes: while the player is *in* an entry mode they are already in the session, so the pill would be tautological.

### PickRoutine — goal: *Pick a Routine*

**Compliant, no changes.** The list is the goal; nothing smuggled in.

### Drills — goal: *Browse Drills*

| Item | Bucket | Destination |
|---|---|---|
| "Drills" header | Chrome | Stays |
| ROUTINES section (routine list + "New routine" card) | Annex (serves a Routine goal, not a Drill goal) | **Off Drills primary.** Destination — top-level tab / annex from Routines / elsewhere — decided in #8 |
| Drill cards | Primary | Stays |
| Empty state ("No drills yet") | Primary | Stays |

**Drills-screen fate.** Once Routines takes the top-level position expected in #8, Drills becomes an **annex screen reachable from Routines** (a library the player consults occasionally). It stops being a top-level tab.

### RoutineEditor — goal: *Compose a Routine*

| Item | Bucket | Destination |
|---|---|---|
| Name input | Primary | Stays |
| Items list (drill name, planned-sets, reorder, remove) | Primary | Stays |
| Add-a-drill list | Primary | Stays |
| Save button | Primary | Stays |
| Archive routine button (current footer, edit-mode only) | Annex (belongs to a "manage this routine" goal) | **Routine menu annex screen** reached from a header affordance. Header affordance renders only in edit mode. |

### Stats — goal: *Review progress*

**Compliant vacuously.** The screen is a stub. When built, re-run this convention on the concrete UI; goal may split (e.g. *Review per-Drill totals* vs *Review target-hit rate*) if the screen resists the no-conjunction test.

## Known tensions (out of scope for this convention)

These are real IA smells surfaced during grilling but deliberately not fixed here. Flagged for future tickets.

- **PickRoutine has no manage-routines affordance.** Today, routine management lives on the Drills tab. Once that moves per #8, the pathway becomes clearer.
- **Drills screen has no add-drill affordance.** Drills are seed-only in v1. If drill creation is ever built, it lives exclusively on the Add-a-drill screen from the InSession flow (per Hugo's directive) — nowhere else. Building the feature itself is out of scope per map #1 ("no new features").
- **Top-level tab structure.** Routines-as-top-level-tab is captured as input to #8, not pre-empted here.

## Consequences carried into follow-on tickets

- **#6 (library decision, screen rebuilds)** must implement:
  - Session menu annex screen with header-icon entry point on every InSession mode; holds End Session (danger).
  - Add-a-drill annex screen reached from InSession-picker's "Add a drill" CTA.
  - Routine menu annex screen with header-icon entry point on RoutineEditor edit mode; holds Archive (danger).
  - Fused planned-slot list on InSession-picker (per-set rows, empty/filled states, ad-hoc second section, per-row Delete with confirm on filled).
  - Unfilled-slots modal on End Session (bulk complete-to-target / skip). Backing use-case does not yet exist; flag as prerequisite before UI ships.
  - Amber active-session pill component: top of screen, full width, tap → InSession.
  - Home resume card in place of Start CTA when active session exists.
- **#7 (canonical row primitive)** must serve at least: drill cards (Drills / Add-a-drill / PickRoutine row types), fused-slot rows (empty and filled states, per-row Delete affordance), routine list rows.
- **#8 (navigation surface + primary action)** decides Routines-vs-Drills top-level placement (Routines is the recommended top-level surface, Drills becomes annex from Routines) and specifies the header-icon affordance pattern used by Session menu and Routine menu.

## Rejected alternatives

- **Screen = navigation destination (not mode-screen).** Would make InSession's goal so abstract ("complete this session") it can't settle bikesheds. Rejected in favour of mode = screen.
- **Default disposal rung = "removed."** Too aggressive; deletes annex info that answers real player-questions. Rejected in favour of default rung = annex screen.
- **Keep End Session on InSession-picker footer as an allow-list exception.** Would open the allow-list door for the only item that breaks the Q4 criterion; once open, allow-list creep begins. Rejected in favour of moving End Session to Session menu, even at the cost of an extra tap.
- **Fold LOGGED SO FAR into Session menu (hide from picker).** Rejected in favour of the fused planned-slot list — logged entries are part of the "what to do next" decision the picker exists for.
- **Ad-hoc rows inside the fused list marked "ad-hoc".** Breaks the plan-shape of the fused list. Rejected in favour of a distinct second section below.
- **Remove per-row Skip entirely without replacement.** Loses the player's early-out for slots they know they won't do. Rejected in favour of Skip → Delete swap with confirm-tap on filled rows.
- **Start-from-Routine as annex on Home.** Would push a critical-path flow behind an extra tap. Rejected in favour of primary placement.
- **Routines stay on Drills screen.** The exact secondary-info-competes-for-attention pattern this convention exists to prevent. Rejected.
- **Archive stays in RoutineEditor footer with 24 dp spacing.** Ergonomic-minima permits it (RoutineEditor is annex-tier, mis-tap risk low), but a per-screen "annex-tier so relaxed" exemption opens a door across all annex screens. Rejected for uniform application.
