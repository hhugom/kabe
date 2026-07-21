# Navigation surface + primary action

Resolved in issue #8 (part of map #1).

Where the player's thumb goes for the top actions. This convention decides the tab set, tab implementation, header stance, primary-action placement, back/dismiss behavior, and the four screen archetypes every future screen builds on. Together with #5 (primary vs annex), it settles the "what belongs where" question for the whole app.

## Tab set

Three bottom tabs: **Home / Routines / Stats.**

Drills is no longer a top-level tab. Per #5, Drills becomes an annex screen reachable from Routines (a library the player consults occasionally). Routines takes the top-level slot because it's the composition layer players use most.

Tab-root goals:

| Tab | Goal (per #5's rule) |
|---|---|
| Home | See recent practice. |
| Routines | Manage Routines. |
| Stats | Review progress. |

**Home's goal changed** from *"Start a Session"* (the #5 lock) to *"See recent practice"*. The Start-a-Session action moved to the tab-bar center button (see below), leaving Home without a screen-scoped primary. Home becomes an at-a-glance dashboard surface (content deferred — see Known tensions).

**Routines is a new tab-root goal**, distinct from PickRoutine's goal (see below). *Manage Routines* = the tab-root that lists routines and links to RoutineEditor and to the Drills library annex. *Start a Session* (formerly *Pick a Routine*) = the bottom-sheet picker triggered by the tab-bar center button.

## Tab implementation

Keep React Navigation's `createBottomTabNavigator`; replace its default `tabBar` with a hand-authored Tamagui component.

Rationale: reimplementing tab navigation from scratch trades a small aesthetic win for a large maintenance surface (safe area, keyboard hide, tab-root reset behavior, back-button routing). The `tabBar` prop gives full visual freedom without touching the state machine.

Visual treatment:

- **Active-tab indicator** — M3-style active pill: a rounded filled shape wrapping the active tab's icon + label. Fill = `accentCyan`, icon + label = black (per #3's "black on cyan hits AAA" contrast note). Matches Zwift-HUD chunkiness and gives the active tab a strong visual claim.
- **Content per tab** — icon + label together inside the pill (icon-only forces guessing; label-only loses at-glance scannability). Icons: filled/chunky per #3's HUD glyph rule (Material Symbols filled weight 500+ or Lucide filled). Final icon-set choice deferred (map #1 "Icon set" gap).

## Tab-bar center action

The tab bar has a **fourth, centered slot** (visually distinct from the three navigation tabs) that acts as the Start-a-Session primary action.

- **Presence.** Always visible on every tab. Same pixel location across Home / Routines / Stats — a persistent, muscle-memory anchor for the app's most-common action.
- **Default state.** Filled cyan, chunky icon + "START" label (or icon-only if space forces it — icon-set decision pending). Tap → opens PickRoutine as a **bottom sheet** overlaying the current tab.
- **PickRoutine sheet content.** An "Empty start" affordance at the top (starts a session with no routine), followed by the routine list. Both paths land the player in InSession.
- **Active-session state.** When a session is active, the center button morphs: same location and shape, label becomes "RESUME", fill becomes `accentAmber`. Tap → navigates to InSession. Consequence: on tab-root screens, the amber pill from #5 is *not* rendered — the morphed center button is the affordance. Pill rendering rules narrow accordingly (see below).

Rejected alternatives to the center action are captured at the bottom of this doc.

## Header stance

RN header renders on **stack pushes only.** Tab-roots have no RN header and self-title via in-content Chrome (per #5's vocabulary).

Stack-push headers carry three functional slots:

- **Left:** back button (icon-only chevron-left, per Back / dismiss below).
- **Middle:** title — small/quiet Chrome for orientation, never the goal statement itself. Always present so the player always knows they can back out.
- **Right:** header-icon affordance (three-dot menu, per Header-icon affordance below), rendered only when the annex has ≥1 action.

**In-content EntryHeader stays** on InSession modes even though the RN header carries a title. The two answer different questions: the RN header title says *"what screen am I on"* (Session); the in-content EntryHeader says *"what drill am I logging"* (WALL · Wall Warmup). Both are needed and don't compete because the RN title is deliberately small/quiet.

**Header background matches screen background** on modes with strong in-content hero content — no elevation line, no separator. This keeps the double-title stack (RN title above in-content eyebrow) reading as continuous instead of stacked-and-heavy.

## Header-icon affordance (three-dot menu)

Right side of every stack-push header. Icon = **three-dot menu** (universal "more actions" affordance, filled/chunky per #3). Tapping opens the associated annex as a **bottom sheet** (Tamagui `Sheet` primitive).

**This is a #8 override of #5's default disposal rung** for header-icon menus specifically. #5's default is "annex screen" (a full stack push). Header-icon menus are quick-tap surfaces with 1–3 items (Session menu = End Session; Routine menu = Archive) — a full stack push is over-engineered. Bottom sheet is the right shape: quick in, quick out, preserves context, uses a primitive Tamagui already ships. Not native contextual popup (default OS chrome bleeds through the custom aesthetic).

**Visibility rule.** Icon renders only when the annex has ≥1 action. RoutineEditor in create mode → no icon (nothing to archive yet). RoutineEditor in edit mode → icon appears. InSession → always shows it (End Session always available). An empty header icon that opens an empty sheet is worse than no icon — it invites a wasted tap.

## Primary action pattern

On every **stack-push mode-screen**, the primary commit action is a single bottom-anchored, full-width, filled button. If the goal has a canonical exit that isn't the back button (e.g. Cancel), that exit renders as a ghost-variant button *directly below* the primary. All other actions live in the header-icon affordance or in the annex.

Applied per mode-screen with a discrete commit action:

| Mode-screen | Bottom primary | Bottom cancel |
|---|---|---|
| InSession-picker | Add a drill (routes to Add-a-drill sheet) | — |
| InSession-reps | Save | Cancel (ghost) |
| InSession-accuracy | Save | Cancel (ghost) |
| InSession-duration | Start / Stop (morphs on state, colour follows #3's state-driven accent) | Cancel (ghost) |
| RoutineEditor | Save | — |
| PickRoutine (sheet) | — (list rows are the action) | — |
| Add-a-drill (sheet) | — (list rows are the action) | — |
| Session menu (sheet) | — (rows; End Session is a danger row) | — |
| Routine menu (sheet) | — (rows; Archive is a danger row) | — |

Two hard rules the pattern enforces:

- **Cancel is kept as a ghost button below primary on entry modes.** Cancel and back are semantically different (Cancel = "throw away this entry's draft", back = "leave the screen"). Merging into just the header back button loses the clean-cancel affordance. Ghost variant keeps it visually secondary.
- **Danger actions never sit as bottom-anchored primary buttons.** Bottom-anchored primary is the muscle-memory location for "commit the goal"; putting danger there is the exact mis-tap risk #5 warned about. End Session, Archive, and any future destructive action live only as **danger-styled rows inside an annex sheet** — two-step by design.

## Back / dismiss convention

Android hardware back is authoritative on every surface. Top-left back on stack pushes is icon-only chevron-left (RN default on Android), 56dp tap target via hit-slop even though the icon itself is smaller.

| Surface | Top-left back | Hardware back | Other dismiss |
|---|---|---|---|
| Tab-root (Home, Routines, Stats) | No | Exits app (standard Android) | — |
| Stack push (InSession, RoutineEditor) | Yes — chevron-left | Pops stack | — |
| Bottom sheet (PickRoutine, Add-a-drill, Session menu, Routine menu) | No | Dismisses the sheet | Drag-down; tap-outside backdrop |
| Modal (unfilled-slots at End Session) | No | Dismisses = Cancel | Explicit action button only |

**Modals ignore tap-outside.** The unfilled-slots modal requires an explicit choice (complete-to-target or skip). Tap-outside would silently cancel the End Session action if the player mis-taps. Hardware back is the only implicit dismiss, treated as equivalent to Cancel (return to the previous screen; don't end the session).

## Active-session pill (updated from #5)

The pill spec from #5 (top of screen, immediately below status bar, full-width, `accentAmber`, tap → InSession) stands. Its **rendering rule narrows**:

| Surface | Pill? |
|---|---|
| Tab-root (Home, Routines, Stats) | No — center tab-bar button morphs to Resume (amber) instead |
| Stack push with RN header (RoutineEditor) | Yes — above the RN header (order: status bar → pill → header → content) |
| Bottom sheet (PickRoutine, Add-a-drill, Session menu, Routine menu) | No on the sheet itself; whatever's underneath governs pill visibility |
| Modal | No |
| InSession modes | No (in-session — tautological, per #5) |

## Four screen archetypes

Every future screen fits one of these four shapes. Sketches show placement of thumb-actions.

### Archetype 1 — Tab-root
Home, Routines, Stats.

```
┌──────────────────────────┐
│ [status bar]             │
├──────────────────────────┤
│  Kabe                    │  ← Chrome mark (small)
│  <in-content hero>       │  ← self-title (eyebrow + title)
│                          │
│  <content …>             │
│                          │
├──────────────────────────┤
│  ⌂    ◉ START    ≡  ▤   │  ← tab bar w/ M3 active-pill
│ HOME  (center)  ROU STA  │    center morphs to RESUME (amber) if active
└──────────────────────────┘
```

### Archetype 2 — Stack push
InSession modes, RoutineEditor.

```
┌──────────────────────────┐
│ [status bar]             │
├──────────────────────────┤
│ ▓ RESUME SESSION ▓ amber │  ← pill (only if session active + non-InSession)
├──────────────────────────┤
│ [<]   Session   [∙∙∙]    │  ← RN header: back / title (Chrome) / three-dot
├──────────────────────────┤
│  EYEBROW                 │  ← in-content goal context
│  <hero>                  │
│                          │
│  <content …>             │
│                          │
├──────────────────────────┤
│  [   PRIMARY BUTTON  ]   │  ← bottom-anchored, full-width, filled
│           Cancel         │  ← ghost, entry modes only
└──────────────────────────┘
```

### Archetype 3 — Sheet
PickRoutine (from center button), Add-a-drill (from InSession picker), Session menu (from InSession header-icon), Routine menu (from RoutineEditor header-icon).

```
┌──────────────────────────┐
│ (underlying dimmed)      │
│                          │
│  ┌────────────────────┐  │
│  │      ──            │  │  ← drag handle
│  ├────────────────────┤  │
│  │  <sheet title>     │  │
│  │                    │  │
│  │  ▶ item            │  │  ← list rows are the action
│  │  ▶ item            │  │
│  │  ▶ item            │  │
│  └────────────────────┘  │
└──────────────────────────┘   Dismiss: drag-down / tap-outside / hw-back
```

### Archetype 4 — Modal
Currently only the unfilled-slots modal at End Session. Alert/confirm dialogs (if added later) use this archetype.

```
┌──────────────────────────┐
│ ▓▓▓▓ dimmed ▓▓▓▓▓▓▓▓▓▓ │
│    ┌──────────────┐     │
│    │  <question>  │     │
│    │              │     │
│    │ [Complete-   │     │
│    │  to-target]  │     │  ← primary action (filled)
│    │ [Skip all]   │     │  ← alternate action (filled, alt colour)
│    │  Cancel      │     │  ← ghost (destructive-safe exit)
│    └──────────────┘     │
│ ▓▓▓▓ dimmed ▓▓▓▓▓▓▓▓▓▓ │
└──────────────────────────┘   Dismiss: modal buttons / hw-back (=Cancel).
                                Tap-outside is IGNORED.
```

## Consequences for #5 (updates to primary-vs-annex.md)

Three narrowings resolved by #8 that #5 didn't (couldn't) settle:

- **Amber active-session pill drops on tab-root screens.** The tab-bar center button morphs to Resume in amber and covers the same job. Pill still appears on stack-push-with-header (RoutineEditor).
- **Header-icon menus (Session menu, Routine menu) use bottom sheet, not annex screen.** This is a #8 override of #5's default disposal rung for this specific pattern (quick-tap 1–3 item menus).
- **Two goals change.** Home's goal shifts from *Start a Session* to *See recent practice*. PickRoutine's goal broadens from *Pick a Routine* to *Start a Session* (subsumes Empty start).

`docs/conventions/primary-vs-annex.md` gets a small "Updated by #8" note in each affected section.

## Consequences carried into follow-on tickets

- **#7 (canonical row primitive)** — must serve the sheet-row shape (PickRoutine "Empty start" + routine rows; Add-a-drill; Session menu and Routine menu action rows including danger-styled), the stack-push list row shape (fused planned-slots + ad-hoc entries on InSession-picker; routine list on Routines tab-root), and the drill card shape (Drills library annex).
- **Future feature tickets** — Home dashboard content spec (what "See recent practice" actually renders); drill creation flow on the Add-a-drill sheet (deferred from #5).
- **Icon set decision (map #1 "Icon set" gap)** — this convention names Material Symbols (filled 500+) or Lucide filled as candidates but doesn't lock one; the tab bar, header three-dot, chevron-back, and Sheet drill/routine icons all inherit whatever the icon-set ticket decides.

## Known tensions (out of scope for this convention)

- **Home dashboard content.** *What* Home shows (last session recap? streak? suggested routine?) is a feature question; parent map #1 says "no new features." Interim: Home renders Chrome mark + a "no recent practice" empty state until a future feature ticket specs the dashboard.
- **Drill creation feature.** Still deferred from #5. If built, lives exclusively on the Add-a-drill sheet.
- **Tab-bar center action + 3 nav tabs = 4 slots.** The visual balance of "3 nav tabs + 1 raised center action" is common (Strava, Nike Run Club) but non-trivial to lay out; #7's row-primitive and the tabBar component itself will need to prove the layout at build time. If the balance fails on real devices, the fallback is to re-open Q4 with the (d) bottom-anchored-buttons option.

## Rejected alternatives

- **Keep RN Navigation's default tab bar unchanged.** Wouldn't hit the Zwift-HUD aesthetic without heavy override. Rejected in favour of custom Tamagui tabBar hosted by RN Navigation.
- **Adopt `react-native-paper` (Material 3) as the nav surface.** Layers a second component library on top of Tamagui — clashes with #6's "one library" decision.
- **Bottom-anchored full-width buttons on Home for Start Session + Start from Routine (my original recommendation).** Passed over in favour of the tab-bar center action because a persistent, muscle-memory Start location beats a per-screen button; and because Home's dashboard role (see above) benefits from the space the buttons would occupy.
- **FAB (single floating action button).** Can't cleanly represent two actions (Start Session + Start from Routine, before the redesign); needs speed-dial which adds a tap and hides the secondary path. Rejected in favour of the labeled center tab-bar action.
- **Center action only on Home, absent on Routines / Stats.** Would make the tab bar visually reshape between tabs (jarring) and force the player to tab-back-to-Home before starting a session (erases the ergonomic win). Rejected in favour of persistent center action on every tab.
- **Center action long-press → "start options" sheet.** Double-tap on the primary at-the-court path. Rejected in favour of tap = PickRoutine sheet (with Empty start inside).
- **Icon-only tab bar.** Forces the player to guess icon meaning at-the-court. Rejected in favour of icon + label.
- **Label-only tab bar (current).** Loses the fast at-glance affordance from thumb distance. Rejected in favour of icon + label.
- **Underline / tint-only active indicator.** Doesn't match Zwift-HUD chunkiness. Rejected in favour of M3 active-pill.
- **RN header on every screen.** Would double-chrome tab-roots (in-content hero + RN title fighting for space). Rejected in favour of stack-push-only headers.
- **No RN header anywhere; every screen self-titles.** Loses the two functional slots (back, three-dot) that stack pushes need. Rejected in favour of RN header on stack pushes.
- **Kill in-content EntryHeader on InSession; RN title alone carries drill context.** RN title is small/quiet Chrome for orientation, not room for `WALL · IN PLAY` + drill name. Rejected in favour of keeping both (they answer different questions).
- **Contextual back label ("< Session").** Label width varies, breaks the muscle-memory pixel location. Rejected in favour of icon-only chevron.
- **Modal tap-outside dismisses.** Mis-tap silently cancels the End Session action. Rejected in favour of hardware-back-only-as-Cancel.
- **Stack push for header-icon menus (#5's default rung).** Over-engineered for 1–3 item menus. Rejected in favour of bottom-sheet override.
- **Native contextual popup menu from the three-dot icon.** Default OS chrome bleeds through the custom aesthetic. Rejected in favour of bottom sheet.
- **Header-icon always visible even when annex is empty.** Invites a wasted tap that returns an empty sheet. Rejected in favour of visibility-when-≥1-action.
