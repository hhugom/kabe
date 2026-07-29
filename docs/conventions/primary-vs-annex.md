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

- **Resume-session banner on Home.** When an active session exists, Home shows a resume card in place of the Start CTA. **Updated by #8:** superseded by the tab-bar center button morph — when a session is active, the center action on every tab-root morphs to *RESUME* in amber. **Post-#8 revision:** the resume affordance on Home is the **Home Start hero morphing to Resume** (amber fill, "Resume session" title), replacing the retired center-button morph. Same slot as the idle Start hero — one card, two states.
- **Active-session pill on every non-InSession mode-screen while a session is running.** Top of screen, immediately below the status bar, spanning full width, in `accentAmber` (amber = "attention, but not destructive" per aesthetic-direction). Tapping navigates to InSession. **Updated by #8:** rendering rule narrows — no pill on tab-roots (center-button morph covers it), no pill on sheets or modals. Pill still appears on stack-push-with-header (RoutineEditor) above the RN header. **Post-#8 revision:** no pill on Home (hero morph covers it); no pill on Routines / Stats in v1 (players tap Home to resume — see `navigation-surface.md` § Active-session pill for the follow-up candidate).

## Screen-by-screen goals

The mode-screens in v1 and their locked goals:

| Mode-screen | Goal |
|---|---|
| Home | Start a Session. |
| InSession (persistent workout sheet, archetype 5) | Log the next Drill. |
| PickRoutine | Pick a Routine. |
| Drills | Browse Drills. |
| RoutineEditor | Compose a Routine. |
| Stats | Review progress. |

**Updated by #8, revised post-#8:** #8 shifted Home's goal to *See recent practice* on the assumption that Start-a-Session lived on the tab-bar center button. The center button was retired in the post-#8 revision (see `navigation-surface.md`); Home's goal reverts to *Start a Session* (the #5 lock). The "Recent practice" section that ships on Home is dashboard content in the annex tier — an empty-state placeholder in v1, spec'd by a future feature ticket. PickRoutine's goal still broadens from *Pick a Routine* to *Start a Session* (it hosts the "Empty start" affordance alongside the routine list); Routines still has its new *Manage Routines* tab-root goal.

**Updated by ADR-0004:** the four InSession-* mode-screens (picker, reps, accuracy, duration) collapse into a single sheet surface. Goal is *Log the next Drill* — served by the FocusHero (the currently focused planned slot, in its entry mode). UpNextStrip and DoneList inside the sheet are same-goal peripheral (they answer *what's next* and *what's done* within the same "log the next drill" loop). The one-goal-per-mode-screen rule still applies: at any instant, exactly one FocusHero mode (reps/accuracy/duration/empty/finish) is active. See `docs/adr/0004-insession-persistent-workout-sheet.md`.

## Worked examples

### Home — goal: *Start a Session* (post-#8 revision)

| Item | Bucket | Destination |
|---|---|---|
| "Kabe" title | Chrome | Stays — minimal branding mark |
| "Solo tennis, tracked." tagline | Annex, no player-question | **Removed** |
| Home Start hero (accent-cyan card, "Start a session") | Primary | Stays — the single Start affordance; opens PickRoutine sheet |
| Home Start hero, active state (amber, "Resume session") | Allow-listed (per allow-list § Resume-session banner) | Stays — same slot as idle, amber morph |
| "Recent practice" section (dashboard content, empty state in v1) | Annex tier / dashboard content | Stays — placeholder until a feature ticket specs the block |

The Start-from-Routine alternative path from #5 collapses into the PickRoutine sheet the hero opens (routine rows are the same-goal alternative to Empty start).

### InSession (persistent workout sheet) — goal: *Log the next Drill*

**Updated by ADR-0004:** the four InSession-* mode-screens (picker, reps, accuracy, duration) are merged into one sheet body. FocusHero surfaces the currently focused slot in its entry mode; UpNextStrip is a horizontal chip strip of remaining unfilled slots; DoneList is a two-section list (planned-filled + ad-hoc) below. The old picker → per-drill navigation is retired.

| Item | Bucket | Destination |
|---|---|---|
| In-sheet header row (drag handle · title · three-dot) | Chrome | Stays — owns the Session menu three-dot |
| FocusHero (drill name + entry-mode input + Save/Cancel) | Primary | Stays — is the goal |
| UpNextStrip (horizontal chips for remaining unfilled slots + Add-drill chip) | Primary | Stays — same-goal peripheral: *what's next* |
| DoneList — planned-filled section | Primary | Stays — same-goal peripheral: *what's done*, tap-into-edit |
| DoneList — ad-hoc section | Primary | **Second labeled section below planned-filled**, distinct heading |
| Per-slot Delete on the focused slot (focus-delete on FocusHero) | Primary | Stays; on filled slots requires a confirm-tap modal (archetype 4) to prevent data loss |
| Per-entry Remove inside EditEntrySheet (for DoneList entries) | Primary | Stays; requires a confirm-tap modal to prevent data loss |
| "Add a drill" chip on UpNextStrip / EmptyHero "Add a drill" CTA | Primary | Stays — opens Add-a-drill sheet |
| Add-a-drill screen (master drill list picker) | — | **Bottom sheet** reached from either add-drill affordance |
| End Session action | Annex (belongs to a different goal) | **Session menu bottom sheet** reached from the in-sheet three-dot |
| Unfilled-slot handling at End Session | — | Session menu End Session triggers a **modal** if any planned slots remain unfilled: "complete-to-target" or "skip all" (bulk resolve) |
| Mid-timer save-and-switch prompt (tapping a different slot while duration timer runs) | Primary (data-loss guard) | **Modal** (archetype 4), not `Alert.alert` (per navigation-surface.md § Archetype 4) |

**Fusion detail.** A single list where each planned *set* is its own row. A routine item with `plannedSets: 3` becomes three rows. Each row is either an empty slot (up-next as a chip; tap → FocusHero switches to that slot's entry mode) or a filled slot (rendered in the planned-filled section of DoneList; tap → EditEntrySheet). Ad-hoc entries render in a second labeled section below planned-filled.

**No-routine sessions.** UpNext + DoneList start empty; FocusHero renders the EmptyHero variant whose primary CTA is "Add a drill".

**All-done state.** When every planned slot is filled and no active entry is in progress, FocusHero renders the FinishHero variant with a "Finish session" primary + "Add another drill" ghost.

**Per-slot Delete semantics.** On empty slots (focus-delete when no entry exists), Delete removes the planned slot from this session (functionally = skip, renamed for consistency) — one tap, silent. On filled slots (focus-delete when the slot has an entry, or edit-remove inside EditEntrySheet), Delete opens a confirm-tap modal because it destroys data. The unfilled-slots modal at End Session catches any slot still empty at session end.

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
  - Home Start hero: single accent-cyan card at the top of Home hosting the Start-a-Session primary; morphs to Resume (amber, "Resume session") when an active session exists. See `navigation-surface.md` § Home Start hero.
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
