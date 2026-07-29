# Navigation surface + primary action

Resolved in issue #8 (part of map #1). **Revised post-#8**: the tab-bar center Start action is retired; Start-a-Session moves back to a hero card at the top of Home. Trigger was a prototype-A/B (see `mobile/src/prototypes/start-session-affordance/README.md` in git history) showing the center-overhang felt visually noisy against the flat Zwift-HUD strip. Sections marked with **Post-#8 revision** below carry the new spec; the retired center-action spec is preserved as a rejected alternative.

**Revised post-ADR-0004**: InSession is no longer a stack-push destination. It's a persistent bottom sheet with PEEK (compact header) and FULL (screen-filling) snap points, rooted at the top of the app tree. See `docs/adr/0004-insession-persistent-workout-sheet.md`. The four screen archetypes below become five; the active-session pill and its RoutineEditor mounting are retired. Sections marked **Post-ADR-0004** carry the new spec.

Where the player's thumb goes for the top actions. This convention decides the tab set, tab implementation, header stance, primary-action placement, back/dismiss behavior, and the four screen archetypes every future screen builds on. Together with #5 (primary vs annex), it settles the "what belongs where" question for the whole app.

## Tab set

Three bottom tabs: **Home / Routines / Stats.**

Drills is no longer a top-level tab. Per #5, Drills becomes an annex screen reachable from Routines (a library the player consults occasionally). Routines takes the top-level slot because it's the composition layer players use most.

Tab-root goals:

| Tab | Goal (per #5's rule) |
|---|---|
| Home | Start a Session. |
| Routines | Manage Routines. |
| Stats | Review progress. |

**Post-#8 revision.** Home's goal reverts to *Start a Session* (the #5 lock). The hero card at the top of Home is the primary affordance; a "Recent practice" section sits below as dashboard content. Full spec below (§ Home Start hero).

**Routines is a new tab-root goal**, distinct from PickRoutine's goal (see below). *Manage Routines* = the tab-root that lists routines and links to RoutineEditor and to the Drills library annex. *Start a Session* (formerly *Pick a Routine*) = the bottom-sheet picker triggered by the Home Start hero.

## Tab implementation

Keep React Navigation's `createBottomTabNavigator`; replace its default `tabBar` with a hand-authored Tamagui component.

Rationale: reimplementing tab navigation from scratch trades a small aesthetic win for a large maintenance surface (safe area, keyboard hide, tab-root reset behavior, back-button routing). The `tabBar` prop gives full visual freedom without touching the state machine.

Visual treatment:

- **Active-tab indicator** — M3-style active pill: a rounded filled shape wrapping the active tab's icon + label. Fill = `accentCyan`, icon + label = black (per #3's "black on cyan hits AAA" contrast note). Matches Zwift-HUD chunkiness and gives the active tab a strong visual claim.
- **Content per tab** — icon + label together inside the pill (icon-only forces guessing; label-only loses at-glance scannability). Icons: filled/chunky per #3's HUD glyph rule (Material Symbols filled weight 500+ or Lucide filled). Final icon-set choice deferred (map #1 "Icon set" gap).

## Home Start hero

**Post-#8 revision.** The tab bar is a strict three-cell flat strip (no center action). Start-a-Session is a **hero card at the top of the Home content region** — full-width, accent-cyan fill, icon + title + eyebrow. Tab bar chrome stays flat and identical across Home / Routines / Stats.

- **Placement.** Top of Home's content region, above the "Recent practice" section. Not bottom-anchored: the hero is at-a-glance from the moment the app opens.
- **Default state.** Accent-cyan fill, "Ready when you are" overline + "Start a session" title, play icon in a rounded well on the right. Tap → opens PickRoutine as a **bottom sheet** overlaying Home.
- **PickRoutine sheet content.** An "Empty start" affordance at the top (starts a session with no routine), followed by the routine list. Both paths land the player in InSession.
- **Active-session state.** When a session is active, the hero morphs in place: fill becomes `accentAmber`, overline becomes "Session in progress", title becomes "Resume session". Tap → navigates to InSession. Black text on amber preserves AAA contrast.
- **Reachability from other tab-roots.** Routines and Stats have no in-content Start affordance; the amber active-session pill (see below) covers the resume path from those tabs. To *start* a new session from Routines/Stats, tap the Home tab first — Start is a Home-scoped affordance by design.

Retired center-action alternative (and other rejected shapes) captured at the bottom of this doc.

## Header stance

RN header renders on **stack pushes only.** Tab-roots have no RN header and self-title via in-content Chrome (per #5's vocabulary). InSession is not a stack push (see § Archetype 5 — Persistent workout sheet) and has no RN header; it self-owns a compact in-sheet header row at the top of the sheet body carrying its own three-dot.

Stack-push headers carry three functional slots:

- **Left:** back button (icon-only chevron-left, per Back / dismiss below).
- **Middle:** title — small/quiet Chrome for orientation, never the goal statement itself. Always present so the player always knows they can back out.
- **Right:** header-icon affordance (three-dot menu, per Header-icon affordance below), rendered only when the annex has ≥1 action.

**Post-ADR-0004.** The stack-push routes that carry this header are RoutineEditor and Drills. InSession is retired from the stack.

**Header background matches screen background** on modes with strong in-content hero content — no elevation line, no separator. This keeps the double-title stack (RN title above in-content eyebrow) reading as continuous instead of stacked-and-heavy.

## Header-icon affordance (three-dot menu)

Right side of every stack-push header, and right side of InSession's in-sheet header row. Icon = **three-dot menu** (universal "more actions" affordance, filled/chunky per #3). Tapping opens the associated annex as a **bottom sheet** (Tamagui `Sheet` primitive).

**This is a #8 override of #5's default disposal rung** for header-icon menus specifically. #5's default is "annex screen" (a full stack push). Header-icon menus are quick-tap surfaces with 1–3 items (Session menu = End Session; Routine menu = Archive) — a full stack push is over-engineered. Bottom sheet is the right shape: quick in, quick out, preserves context, uses a primitive Tamagui already ships. Not native contextual popup (default OS chrome bleeds through the custom aesthetic).

**Visibility rule.** Icon renders only when the annex has ≥1 action. RoutineEditor in create mode → no icon (nothing to archive yet). RoutineEditor in edit mode → icon appears. InSession → always shows it on the in-sheet header (End Session always available). An empty header icon that opens an empty sheet is worse than no icon — it invites a wasted tap.

**Post-ADR-0004.** InSession's three-dot lives on the in-sheet header row at the top of the sheet body, not on an RN header. The Session menu behaviour is identical.

## Primary action pattern

On every **stack-push mode-screen** and inside the **InSession sheet** (archetype 5), the primary commit action is a single bottom-anchored, full-width, filled button. If the goal has a canonical exit that isn't the back button (e.g. Cancel), that exit renders as a ghost-variant button *directly below* the primary. All other actions live in the header-icon affordance or in the annex.

Applied per mode-screen with a discrete commit action:

| Mode-screen | Bottom primary | Bottom cancel |
|---|---|---|
| InSession-reps (FocusHero inside the sheet) | Save (colour follows #3's state-driven accent) | Cancel (ghost) |
| InSession-accuracy (FocusHero inside the sheet) | Save (colour follows #3's state-driven accent) | Cancel (ghost) |
| InSession-duration (FocusHero inside the sheet) | Start / Stop (morphs on state, colour follows #3's state-driven accent) | Cancel (ghost) |
| RoutineEditor | Save | — |
| PickRoutine (sheet) | — (list rows are the action) | — |
| Add-a-drill (sheet) | — (list rows are the action) | — |
| Session menu (sheet) | — (rows; End Session is a danger row) | — |
| Routine menu (sheet) | — (rows; Archive is a danger row) | — |

The FocusHero primary + Cancel row lives *inside the InSession sheet body*, near-bottom of the FocusHero panel — the "bottom-anchored" rule applies within the sheet surface, not the app frame (the sheet fills the surface at FULL).

Two hard rules the pattern enforces:

- **Cancel is kept as a ghost button below primary on entry modes.** Cancel and back are semantically different (Cancel = "throw away this entry's draft", back = "leave the screen"). Merging into just the header back button loses the clean-cancel affordance. Ghost variant keeps it visually secondary.
- **Danger actions never sit as bottom-anchored primary buttons.** Bottom-anchored primary is the muscle-memory location for "commit the goal"; putting danger there is the exact mis-tap risk #5 warned about. End Session, Archive, per-slot Delete, and any future destructive action live only as **danger-styled rows inside an annex sheet** — two-step by design. Per-slot Delete for a filled slot requires a confirm-tap; empty-slot Delete is a silent one-tap remove (nothing to lose).

## Back / dismiss convention

Android hardware back is authoritative on every surface. Top-left back on stack pushes is icon-only chevron-left (RN default on Android), 56dp tap target via hit-slop even though the icon itself is smaller.

| Surface | Top-left back | Hardware back | Other dismiss |
|---|---|---|---|
| Tab-root (Home, Routines, Stats) | No | Exits app (standard Android) | — |
| Stack push (RoutineEditor, Drills) | Yes — chevron-left | Pops stack | — |
| Bottom sheet (PickRoutine, Add-a-drill, Session menu, Routine menu) | No | Dismisses the sheet | Drag-down; tap-outside backdrop |
| Modal (unfilled-slots at End Session, mid-timer switch prompt, delete-filled confirm) | No | Dismisses = Cancel | Explicit action button only |
| Persistent workout sheet (InSession) | No | Collapses FULL → PEEK; at PEEK, hardware back falls through to the underlying surface | Drag; tap peek (both toggle PEEK ↔ FULL). No user-driven dismissal — only End Session ends the session. |

**Modals ignore tap-outside.** The unfilled-slots modal requires an explicit choice (complete-to-target or skip). Tap-outside would silently cancel the End Session action if the player mis-taps. Hardware back is the only implicit dismiss, treated as equivalent to Cancel (return to the previous screen; don't end the session).

## Active-session pill (RETIRED — see ADR-0004)

The pill (top of screen, `accentAmber`, tap → InSession) is retired. Its job — "surface an active session from any surface, one tap to resume" — is now covered by the persistent InSession sheet PEEK header (archetype 5), which is always visible when a session is active. The pill component is deleted. The Home Start hero's active-session amber morph is redundant with the peek but is out of scope for ADR-0004 — a future ticket may collapse it.

## Five screen archetypes

Every future screen fits one of these five shapes. Sketches show placement of thumb-actions.

### Archetype 1 — Tab-root
Home, Routines, Stats.

```
┌──────────────────────────┐
│ [status bar]             │
├──────────────────────────┤
│  Kabe                    │  ← Chrome mark (small)
│  [ ▶  Start a session ]  │  ← Home Start hero (Home only; morphs to RESUME amber)
│                          │
│  RECENT PRACTICE         │  ← section label (Home; dashboard content)
│  <content …>             │
│                          │
├──────────────────────────┤
│  ⌂        ≡        ▤     │  ← flat 3-cell tab bar w/ M3 active-pill
│ HOME    ROUTINES  STATS  │    Routines / Stats — no in-content start affordance
└──────────────────────────┘
```

### Archetype 2 — Stack push
RoutineEditor, Drills.

```
┌──────────────────────────┐
│ [status bar]             │
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
└──────────────────────────┘
```

Screens that render bottom-anchored primary actions must reserve `useSessionSheetInset()` pixels of extra bottom padding so the InSession sheet peek doesn't occlude the primary when a session is active. See § Archetype 5.

### Archetype 3 — Sheet
PickRoutine (from the Home Start hero), Add-a-drill (from InSession picker), Session menu (from InSession header-icon), Routine menu (from RoutineEditor header-icon).

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
Currently: unfilled-slots modal at End Session, mid-timer save-and-switch prompt (when tapping a different slot while a duration timer is running), delete-filled-slot confirm prompt. Alert/confirm dialogs use this archetype — **not** native `Alert.alert` (OS chrome bleeds through the aesthetic).

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

### Archetype 5 — Persistent workout sheet
Currently only InSession. Rooted at the top of the app tree; two snap points (PEEK, FULL); non-modal (underlying surface stays interactive when PEEKed). Mounts when a session is active; unmounts when the session ends. Dismissal is not user-driven — hardware back at FULL collapses to PEEK; only the in-sheet three-dot → End Session ends the session.

```
                                    (PEEK)
┌──────────────────────────┐   ┌──────────────────────────┐
│ [status bar]             │   │ [status bar]             │
├──────────────────────────┤   ├──────────────────────────┤
│  ── (drag handle)        │   │  (underlying screen)     │
│  [∙∙∙] Session   [∙∙∙]   │   │                          │
│                          │   │                          │
│  EYEBROW                 │   │                          │
│  <FocusHero>             │   │                          │
│  [ Save ]  Cancel        │   ├──────────────────────────┤
│  UP NEXT: [chip][chip]…  │   │  ── (drag handle)        │
│  DONE (PLANNED)          │   │  • Wall rally    0:42    │
│  • rally    12 reps      │   ├──────────────────────────┤
│  AD-HOC                  │   │  (tab bar if tab-root)   │
│  • serve    3/5          │   └──────────────────────────┘
├──────────────────────────┤       tap peek → expand to FULL
│  (tab bar if tab-root)   │       drag / tap peek → collapse to PEEK
└──────────────────────────┘
```

- PEEK sits directly above the tab bar on tab-root routes, and directly above the bottom safe-area on stack-push routes. Bottom-anchored primaries on those routes reserve `useSessionSheetInset()` bottom padding to avoid overlap.
- The in-sheet header row at the top of the sheet body carries the drag handle + Session title + right-side three-dot menu (opens the Session menu bottom sheet — End Session danger row).
- FocusHero owns the "one goal per mode-screen" surface (reps / accuracy / duration entry for the currently focused slot). UpNextStrip + DoneList are same-goal peripheral content in the sheet body (see `primary-vs-annex.md` § InSession).
- The sheet is non-modal by construction — no backdrop dimming, no overlay. Underlying screens stay interactive at PEEK. This is the property that lets the peek surface an active session from every route.

## Consequences for #5 (updates to primary-vs-annex.md)

Narrowings resolved by #8 (and revised post-#8) that #5 didn't (couldn't) settle:

- **Amber active-session pill.** Absent on Home (Home Start hero morphs to Resume and covers the same job). Absent on Routines / Stats in v1 (candidate follow-up — see Known tensions). Still appears on stack-push-with-header (RoutineEditor).
- **Header-icon menus (Session menu, Routine menu) use bottom sheet, not annex screen.** This is a #8 override of #5's default disposal rung for this specific pattern (quick-tap 1–3 item menus).
- **PickRoutine's goal broadens** from *Pick a Routine* to *Start a Session* (subsumes Empty start). Home's goal reverts to *Start a Session* under the post-#8 revision (i.e. #5's original lock stands).

`docs/conventions/primary-vs-annex.md` gets small "Updated by #8" / "Post-#8 revision" notes in each affected section.

## Consequences carried into follow-on tickets

- **#7 (canonical row primitive)** — must serve the sheet-row shape (PickRoutine "Empty start" + routine rows; Add-a-drill; Session menu and Routine menu action rows including danger-styled), the stack-push list row shape (fused planned-slots + ad-hoc entries on InSession-picker; routine list on Routines tab-root), and the drill card shape (Drills library annex).
- **Future feature tickets** — Home dashboard content spec (what "See recent practice" actually renders); drill creation flow on the Add-a-drill sheet (deferred from #5).
- **Icon set decision (map #1 "Icon set" gap)** — this convention names Material Symbols (filled 500+) or Lucide filled as candidates but doesn't lock one; the tab bar, header three-dot, chevron-back, and Sheet drill/routine icons all inherit whatever the icon-set ticket decides.

## Known tensions (out of scope for this convention)

- **Home dashboard content.** *What* Home's "Recent practice" section shows (last session recap? streak? suggested routine?) is a feature question; parent map #1 says "no new features." Interim: Home renders Chrome mark + hero + a "no recent practice" empty state until a future feature ticket specs the dashboard.
- **Drill creation feature.** Still deferred from #5. If built, lives exclusively on the Add-a-drill sheet.
- **Resume affordance on Routines / Stats.** Post-#8 revision removed the persistent-anywhere resume from the tab-bar center. In v1, players resume by tapping the Home tab. Follow-up candidate: mount the amber pill on Routines / Stats when a session is active. Not done in the fold-back because it enlarges scope; flag for the next tab-root pass.

## Rejected alternatives (persistent workout sheet)

See `docs/adr/0004-insession-persistent-workout-sheet.md` for the alternatives considered before landing on the persistent sheet archetype (modal sheet with backdrop, full-screen overlay, dedicated tab, FAB, tab-bar-attached peek).

## Rejected alternatives

- **Keep RN Navigation's default tab bar unchanged.** Wouldn't hit the Zwift-HUD aesthetic without heavy override. Rejected in favour of custom Tamagui tabBar hosted by RN Navigation.
- **Adopt `react-native-paper` (Material 3) as the nav surface.** Layers a second component library on top of Tamagui — clashes with #6's "one library" decision.
- **Tab-bar center Start action (the original #8 pick, retired post-#8).** A raised fourth cell in the middle of the tab strip, morphing to Resume when a session is active. Rejected on visual grounds after a prototype-A/B: the overhanging circle broke the flat Zwift-HUD strip and read as noisy chrome rather than a primary action. Replaced by the Home Start hero. The center-action's stated wins (persistent muscle-memory location, resume-anywhere) partially trade off — see the "Resume affordance on Routines / Stats" tension.
- **Corner FAB (floating action button anchored bottom-right, above the flat tab bar).** Considered in the prototype-A/B alongside the Home hero and a 4-cell in-line tab. Rejected in favour of the Home hero because a hero card carries a title + eyebrow at-a-glance (an icon-only FAB doesn't), and because Home's dashboard role wants a titled affordance up top, not a floating icon down-right.
- **4-cell in-line tab (Home / Routines / Stats / Start as flat siblings).** Considered in the prototype-A/B. Rejected because it dilutes the tab set's meaning (three navigation destinations + one action) and produces a Start cell that reads as a fourth destination.
- **Bottom-anchored full-width buttons on Home for Start Session + Start from Routine (#5's original shape).** Rejected in favour of a single hero card that morphs between Start and Resume — one primary affordance rather than two side-by-side buttons; Start-from-Routine is folded into the PickRoutine sheet the hero opens.
- **Home Start action reachable from Routines / Stats.** Considered as a mini-pill or FAB duplicated across all tab-roots. Rejected in favour of Home-scoped: duplicating the affordance dilutes it and adds chrome to Routines / Stats. Resume-from-Routines/Stats is deferred to a follow-up (see Known tensions).
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
