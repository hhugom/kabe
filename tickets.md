# Tickets: apply v1 standards + decisions to the codebase

Vertical slices to bring the mobile app into compliance with the four convention docs in `docs/conventions/` (aesthetic-direction, ergonomic-minima, primary-vs-annex, navigation-surface). ADRs `0001` (v1 solo scope) and `0002` (Expo + SQLite + Drizzle) are already implemented and yield no tickets.

Work the **frontier**: any ticket whose blockers are all done. For a purely linear chain that means top to bottom.

## Migrate InSession from stack-push to persistent workout sheet (ADR-0004)

**What to build:** Retire InSession as a stack-push route (archetype 2). Introduce archetype 5 — a persistent bottom sheet with PEEK (compact header: elapsed timer + current-drill label + drag handle) and FULL (screen-filling) snap points, rooted at the top of the app tree. The sheet is non-modal — underlying surfaces stay interactive at PEEK. The sheet mounts when a session is active and unmounts when the session ends. Reference: Strong's in-workout view. Backing spec: `docs/adr/0004-insession-persistent-workout-sheet.md`, `docs/conventions/navigation-surface.md` § Archetype 5, `docs/conventions/primary-vs-annex.md` § InSession.

Supersedes the following earlier tickets in this file (all previously shipped):

- **ActiveSessionPill component** — retired; peek covers the "surface an active session" job. Component + tests deleted.
- **Session menu bottom sheet (End Session as danger row)** — behaviour preserved, but the three-dot now lives on the in-sheet header row (not the RN header). No `navigation.setOptions({ onMenuPress })` indirection.
- **Stack-push header: chevron-back + quiet title + three-dot slot** — the InSession clause of "applied to every current stack-push route (InSession, RoutineEditor)" is retired. RoutineEditor + Drills remain.
- **Fused planned-slot list on InSession-picker** — preserved, but now rendered inside the sheet body as UpNextStrip (unfilled chips) + DoneList (filled, split into PLANNED and AD-HOC sections). The per-slot Delete on filled rows requires a confirm-tap modal (archetype 4), not `Alert.alert`.
- **InSession entry modes: hero panel + progress track + state-driven accent** — preserved, rendered as FocusHero inside the sheet body.

**Blocked by:** None — this is a rearchitecture that supersedes the prior InSession tickets.

- [ ] `InSession` is removed from `RootStackParamList`
- [ ] `SessionSheetProvider` mounts at app root above `RootStack.Navigator` and renders the peek/full sheet when `sessionActive`
- [ ] PEEK sits above the tab bar on tab-root routes and above the bottom safe-area on stack-push routes; the peek anchor updates when the top-level route changes
- [ ] `useSessionSheetInset()` hook returns the peek footprint so stack-push footers (RoutineEditor) reserve bottom padding when a session is active
- [ ] Drag gesture is continuous; release snaps to nearest with a velocity/position rule; spring animation
- [ ] Hardware back at FULL collapses to PEEK; at PEEK, hardware back falls through to the underlying surface
- [ ] In-sheet header row renders drag handle + Session title + three-dot; three-dot opens Session menu (End Session danger row)
- [ ] `ActiveSessionPill.tsx` + tests deleted; `PillHeader` no longer accepts `sessionActive` / `onResumePress` props
- [ ] Callers that used to `navigate('InSession')` call `useSessionSheet().openFull()` instead (App.tsx tab bar Resume; PickRoutine start-completion)
- [ ] Mid-timer save-and-switch prompt is a `ModalLayout`, not `Alert.alert`
- [ ] Per-slot Delete on filled slots (focus-delete, edit-remove) opens a confirm-tap modal
- [ ] DoneList splits its rows into a PLANNED section and a distinct AD-HOC section (per `primary-vs-annex.md`)
- [ ] Peek shows a live elapsed timer that resumes correctly when the app returns from background and re-hydrates when a session starts after the peek mounted
- [ ] Peek does not occlude RoutineEditor's Save button (verified via `useSessionSheetInset()` on RoutineEditor's footer)


## Purge legacy `theme.mono`; mirror full type ramp into Tamagui theme

**What to build:** The full type-ramp tokens from `docs/conventions/aesthetic-direction.md` § Type-scale sketch (`heroDigits`, `display`, `title`, `body`, `caption`, `label`) exist once in `mobile/src/theme.ts` and are reachable from Tamagui-styled components via `tamagui.config.ts`. The superseded `theme.mono` token is removed everywhere. No visual regression on any currently rendered screen.

**Blocked by:** None — can start immediately.

- [ ] Every type-ramp token from aesthetic-direction is present, exact size / line-height / weight / letter-spacing
- [ ] Numeric tokens (`heroDigits`, `display`) carry `fontVariant: ['tabular-nums']`
- [ ] `theme.mono` no longer exists in `theme.ts` and no import references it
- [ ] Tamagui-styled components can read the type ramp (via config exposure)
- [ ] All existing screens still render without regression on Android

## Pick icon set + ship `<Icon>` primitive

**What to build:** Resolve the "Icon set" gap flagged in aesthetic-direction and navigation-surface. Pick one library — Material Symbols filled (weight 500+) or Lucide filled — install it, and provide a thin `<Icon>` wrapper the rest of the app uses. A short ADR records the pick and why.

**Blocked by:** None — can start immediately.

- [ ] One icon library installed as a project dep
- [ ] `<Icon>` primitive exposes `name`, `size` (defaults ≥ 24 sp), and `color` (default `textPrimary`)
- [ ] Icons render as filled/chunky glyphs, not line icons
- [ ] Rendering smoke check on a demo screen at ≥ 24 sp
- [ ] New ADR under `docs/adr/` documents the pick and the rejected alternative

## Canonical `Row` primitive

**What to build:** One Tamagui-based `<Row>` component that serves every row shape the four archetypes need: sheet-row (PickRoutine "Empty start", routine rows, Add-a-drill drill rows, Session menu / Routine menu action rows), stack-push list-row (fused planned-slot rows on InSession-picker, routine list on Routines tab), and drill-card row (Drills annex). Supports `variant="danger"` for destructive rows.

**Blocked by:** None — can start immediately.

- [ ] Props for leading icon, title, meta / subtitle, trailing affordance, `onPress`, `variant`
- [ ] Every rendered variant hits ≥ 48 dp tap target (annex minimum from ergonomic-minima)
- [ ] `variant="danger"` renders with `danger` colour token and passes AAA contrast on `surface`
- [ ] Demo screen exercises every shape (sheet row, list row, drill card, danger row)

## Screen archetype layouts (Tab-root, Stack-push, Sheet, Modal)

**What to build:** Four layout components matching the four sketches in navigation-surface.md § Four screen archetypes. Each layout owns the archetype's non-negotiable structure — Chrome mark on tab-root, EntryHeader slot on stack-push, drag-handle + backdrop-dismiss on sheet, tap-outside-disabled on modal — and exposes slots for the screen-specific content. A demo screen shows all four in isolation.

**Blocked by:** None — can start immediately.

- [ ] `TabRootLayout` — Chrome mark + in-content hero slot + tab bar footprint respected
- [ ] `StackPushLayout` — RN header aware + EntryHeader slot + bottom-anchored full-width primary button slot + optional ghost Cancel slot beneath primary
- [ ] `SheetLayout` — Tamagui `Sheet` primitive with drag handle, backdrop dimming, drag-down / tap-outside / hardware-back dismissal
- [ ] `ModalLayout` — dimmed backdrop that **ignores** tap-outside; hardware-back mapped to the modal's Cancel action
- [ ] Demo screen renders one of each

## `ActiveSessionPill` component

**What to build:** The amber active-session pill described in primary-vs-annex.md § allow-list and narrowed by navigation-surface.md § Active-session pill. Full-width, `accentAmber`, sits at the top of screen above the RN header on stack-push-with-header when a session is active; tap navigates to InSession. Component only — wiring to specific surfaces happens as each surface migrates.

**Blocked by:** None — can start immediately.

- [ ] Renders full-width, immediately below the status bar, `accentAmber` fill
- [ ] Label / hit-slop meets at-the-court tap-target minimum (≥ 56 dp)
- [ ] Text contrast on amber hits AAA (black text, per aesthetic-direction)
- [ ] Accepts an `onPress` that the parent wires to navigate to InSession
- [ ] Documented render rule (present on stack-push-with-header only; absent on tab-roots, sheets, modals, InSession itself)

## Custom Tamagui tab bar (3 tabs, M3 active pill, no center yet)

**What to build:** Keep React Navigation's `createBottomTabNavigator` state machine; replace its default `tabBar` with a hand-authored Tamagui component. Tabs still render as Home / Drills / Stats at this ticket (rename happens in the Routines tab ticket). Active tab wears an M3-style cyan filled pill wrapping icon + label; inactive tabs render icon + label plain. No center button yet — that's the next ticket.

**Blocked by:** `Pick icon set + ship <Icon> primitive`, `Screen archetype layouts (Tab-root, Stack-push, Sheet, Modal)`.

- [ ] Custom `tabBar` prop supplies the entire bar; RN Navigation still owns state
- [ ] Active-tab pill uses `accentCyan` fill with black text and black icon (AAA)
- [ ] Inactive tabs render icon + label with `textSecondary`
- [ ] Every tab hits ≥ 56 dp tap target
- [ ] Safe-area + keyboard-hide behaviour preserved

## Center Start button + PickRoutine bottom sheet

**What to build:** The tab bar gains a fourth, centered slot rendering a filled cyan START button (icon + label, or icon-only if space forces it). Tap opens a bottom sheet containing an "Empty start" affordance at the top followed by the routine list — both paths land the player in InSession. The current `PickRoutine` stack destination is removed and replaced by this sheet.

**Blocked by:** `Screen archetype layouts (Tab-root, Stack-push, Sheet, Modal)`, `Custom Tamagui tab bar (3 tabs, M3 active pill, no center yet)`.

- [ ] Center slot present on every tab-root at the same pixel location
- [ ] Tap opens the PickRoutine sheet (uses `SheetLayout`)
- [ ] Sheet's first row is "Empty start" → starts a session with no routine
- [ ] Remaining sheet rows list all routines → each starts a session with that routine
- [ ] `PickRoutineScreen` (stack destination) is removed; the `PickRoutine` route in `RootStack` is gone

## Center button morphs to RESUME (amber) when session active

**What to build:** When an active session exists, the center tab-bar button morphs: same location and shape, label becomes RESUME, fill becomes `accentAmber`. Tap navigates to InSession. Because the center button now covers the "resume" job, the amber `ActiveSessionPill` is suppressed on tab-root screens (per the narrowed render rule in navigation-surface). Pill still appears on stack-push-with-header.

**Blocked by:** `ActiveSessionPill component`, `Center Start button + PickRoutine bottom sheet`.

- [ ] Active session → center button label = RESUME, fill = `accentAmber`, text = black (AAA)
- [ ] Idle → center button label = START, fill = `accentCyan`
- [ ] Tap in resume state navigates to InSession
- [ ] No `ActiveSessionPill` renders on tab-root screens while a session is active
- [ ] `ActiveSessionPill` still renders on RoutineEditor above its RN header while a session is active

## Rename tabs to Home / Routines / Stats; make Drills an annex of Routines

**What to build:** Tabs become Home, Routines, Stats. A new `RoutinesScreen` (tab-root) with the goal *Manage Routines* — lists routines, links into `RoutineEditor` (both create and edit), and links to a `Drills` annex screen reached via a subtle affordance from within Routines. `DrillsScreen` becomes a stack-push annex reached from Routines, not a top-level tab.

**Blocked by:** `Custom Tamagui tab bar (3 tabs, M3 active pill, no center yet)`.

- [ ] Three tabs read Home, Routines, Stats
- [ ] `RoutinesScreen` is the Routines tab-root; lists routines with tap-into-edit and a "New routine" affordance
- [ ] A visible affordance on `RoutinesScreen` opens the Drills annex (stack push)
- [ ] `DrillsScreen` is reachable only from Routines (no tab entry, no other entry)
- [ ] Hardware-back on Drills annex returns to Routines

## Stack-push header: chevron-back + quiet title + three-dot slot

**What to build:** All stack-push screens configure the RN header with icon-only chevron-back (56 dp via hit-slop), a quiet Chrome title, and a right-side three-dot slot that renders **only when the screen declares ≥ 1 annex action**. Header background matches screen background — no elevation line, no separator — so the RN title reads as continuous with the in-content EntryHeader below it.

**Blocked by:** `Pick icon set + ship <Icon> primitive`.

- [ ] Chevron-left icon (from `<Icon>`) as left slot on every stack push, 56 dp hit-slop
- [ ] Title uses the `caption`-tier Chrome sizing (small/quiet), never the goal statement
- [ ] Three-dot right slot renders only if the screen passes an actions descriptor; otherwise absent
- [ ] Header `backgroundColor` = screen `bg`; `headerShadowVisible: false`; no border separator
- [ ] Applied to every current stack-push route (InSession, RoutineEditor)

## Session menu bottom sheet (End Session as danger row)

**What to build:** Tapping the three-dot on the InSession header opens a bottom sheet containing an End Session danger row. The current footer End Session button is removed from InSession. End Session's behaviour (confirm and exit) stays as it is today — the unfilled-slots modal is a separate ticket.

**Blocked by:** `Canonical Row primitive`, `Screen archetype layouts (Tab-root, Stack-push, Sheet, Modal)`, `Stack-push header: chevron-back + quiet title + three-dot slot`.

- [ ] Three-dot on every InSession mode-screen opens the Session menu sheet
- [ ] Sheet contains an End Session row using `<Row variant="danger">`
- [ ] End Session tap performs today's end-session behaviour (no new modal yet)
- [ ] Footer End Session button removed from InSession
- [ ] Sheet dismisses on drag-down, tap-outside, hardware back

## Add-a-drill bottom sheet (from InSession-picker CTA)

**What to build:** "Add a drill" CTA on the InSession-picker opens a bottom sheet listing every drill in the library. Picking a drill inserts it as an ad-hoc entry into the current session and navigates directly to its entry mode. Replaces whatever inline add flow exists on the picker today.

**Blocked by:** `Canonical Row primitive`, `Screen archetype layouts (Tab-root, Stack-push, Sheet, Modal)`.

- [ ] "Add a drill" CTA on the InSession-picker (also the empty state for no-routine sessions)
- [ ] Sheet lists every drill grouped by category (wall / service)
- [ ] Selecting a drill creates an ad-hoc `DrillEntry` on the active session and navigates to the drill's entry mode
- [ ] Sheet dismisses on drag-down, tap-outside, hardware back
- [ ] Old inline add path removed from the picker

## Fused planned-slot list on InSession-picker

**What to build:** The picker collapses PLANNED + LOGGED SO FAR into one list where each planned *set* is its own row. A routine item with `plannedSets: 3` becomes three rows — each either an empty slot (tap → drill entry mode) or a filled slot (shows logged value; tap → view/edit that entry). Ad-hoc entries render in a distinct second section below the planned list. Per-row Delete replaces Skip: on empty rows it removes the planned slot; on filled rows it erases the entry and reverts the row to empty, requiring confirm-tap to prevent data loss.

**Blocked by:** `Canonical Row primitive`, `Add-a-drill bottom sheet (from InSession-picker CTA)`.

- [ ] A planned routine item with `plannedSets: N` renders N distinct rows
- [ ] Empty planned rows tap into the drill's entry mode
- [ ] Filled planned rows display the logged value in tabular-nums and tap into view/edit
- [ ] Ad-hoc entries render in a labeled second section below the planned list
- [ ] Per-row Delete on empty rows removes the planned slot silently
- [ ] Per-row Delete on filled rows requires a confirm-tap; on confirm, erases the entry and reverts the row to empty
- [ ] LOGGED SO FAR block from the current picker is removed

## Unfilled-slots modal at End Session

**What to build:** Ending a session with any planned slot still empty opens a modal (archetype 4) asking the player to either "Complete-to-target" (bulk-mark remaining slots as target-met) or "Skip all". A supporting use-case `bulk-resolve-unfilled-slots` implements the two branches. Tap-outside is disabled; hardware back = Cancel = return to the session (do not end).

**Blocked by:** `Screen archetype layouts (Tab-root, Stack-push, Sheet, Modal)`, `Session menu bottom sheet (End Session as danger row)`, `Fused planned-slot list on InSession-picker`.

- [ ] Ending a session with zero unfilled planned slots ends without the modal
- [ ] Ending with ≥ 1 unfilled planned slot raises the modal
- [ ] Complete-to-target creates a `DrillEntry` per unfilled slot at the drill's target value
- [ ] Skip all removes the unfilled planned slots from the session
- [ ] Modal tap-outside is ignored; hardware back cancels (session stays active, still on InSession)
- [ ] New `bulk-resolve-unfilled-slots` use-case with tests

## Routine menu bottom sheet on RoutineEditor (Archive as danger row)

**What to build:** In RoutineEditor edit mode, the header three-dot opens a bottom sheet containing an Archive danger row. Create mode shows no three-dot at all (nothing to archive). The current footer Archive button is removed.

**Blocked by:** `Canonical Row primitive`, `Screen archetype layouts (Tab-root, Stack-push, Sheet, Modal)`, `Stack-push header: chevron-back + quiet title + three-dot slot`.

- [ ] RoutineEditor in create mode: no three-dot in the header
- [ ] RoutineEditor in edit mode: three-dot present, opens the Routine menu sheet
- [ ] Sheet contains an Archive row using `<Row variant="danger">`
- [ ] Archive performs today's archive behaviour
- [ ] Footer Archive button removed from RoutineEditor

## Home dashboard: "See recent practice" empty state

**What to build:** Home stops rendering the Start CTA (moved to the tab-bar center button in the earlier tickets) and instead shows the Chrome mark plus a "no recent practice" empty state. The concrete dashboard content spec (last-session recap, streak, suggested routine, etc.) is deliberately out of scope — flagged as a future feature ticket per navigation-surface.md § Known tensions.

**Blocked by:** `Center button morphs to RESUME (amber) when session active`.

- [ ] Home no longer renders a Start CTA or a Start-from-Routine button
- [ ] Home renders Chrome mark ("Kabe") + empty state text
- [ ] Home's goal (per primary-vs-annex, updated) is *See recent practice* — comment or code marker records this
- [ ] Existing `HomeScreen` tests updated to match the new content

## InSession entry modes: hero panel + progress track + state-driven accent

**What to build:** Reps, accuracy, and duration modes each render on a `surface` hero card with `surfaceHi` border (not full-bleed), a `heroDigits`-tier readout in tabular-nums, a 10 dp progress track under the digits when the drill has a target, and stat chips (target / remaining / rate) below the hero. The primary action button's fill follows the state-driven accent from aesthetic-direction: cyan `< 90 %`, amber `90–100 %`, magenta `≥ 100 %`. Target-label text rises to ≥ 24 sp.

**Blocked by:** `Purge legacy theme.mono; mirror full type ramp into Tamagui theme`.

- [ ] Reps mode renders hero panel + digits + progress track (if target) + stat chips
- [ ] Accuracy mode renders hero panel + digits + progress track (if target) + stat chips
- [ ] Duration mode renders hero panel + timer digits + progress track (if target) + stat chips; Start/Stop button follows state-driven accent
- [ ] Progress track uses `surfaceHi` background with a fill in the current state accent
- [ ] Target-label text is ≥ 24 sp on every entry mode
- [ ] Primary action button fill follows the state-driven accent rule; text is black (AAA)

## Ergonomic-minima conformance sweep across annex screens

**What to build:** Drills annex, Routines tab-root, RoutineEditor, PickRoutine sheet, and the Stats stub all pass the annex-tier floor from ergonomic-minima.md: ≥ 48 dp tap targets, ≥ 16 sp body, ≥ 12 sp uppercase structural labels, ≥ 8 dp gaps between adjacent tap targets, ≥ 24 dp for destructive-adjacent (or destructive in a visually distinct region), AAA text contrast (7:1) — or 4.5:1 for text ≥ 24 sp. Ticket includes a per-screen checklist and fixes what fails.

**Blocked by:** `Canonical Row primitive`, `Rename tabs to Home / Routines / Stats; make Drills an annex of Routines`, `Routine menu bottom sheet on RoutineEditor (Archive as danger row)`.

- [ ] Per-screen checklist filled in for each of the five surfaces (pass / fail per row)
- [ ] Every fail is fixed in the same ticket
- [ ] Text contrast verified with a tool, not by eye
- [ ] `textSecondary` is only used for structural labels, `textMuted` only for placeholders / decorative
- [ ] Any surface still failing after fixes is flagged as a follow-up ticket, not left silently non-compliant
