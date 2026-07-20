# Ergonomic minima

Resolved in issue #2 (part of map #1).

The design system enforces two tiers of minima. Every UI surface is classified into one of them.

**At-the-court** — the critical path from "start a session" to "end a session": Home (Start Session CTA and its immediate context), the In-Session drill picker, the entry screens (reps, accuracy, timer), and End Session. Player has one hand, sweaty thumb, sunlight, standing ~1–2m from the phone.

**Annex** — everything else: Drills list, Routine editor, Pick Routine, Stats. Player has both hands, phone close, indoor lighting.

## Numeric floor

Breach one and the surface is non-compliant — bump the value, don't argue.

| Property | At-the-court | Annex |
|---|---|---|
| Visible tap-target size | ≥ 56 dp | ≥ 48 dp |
| Body text | ≥ 16 sp | ≥ 16 sp |
| Text read mid-drill (timer, target label, current-drill name, picker rows) | ≥ 24 sp | — |
| Uppercase structural labels (`SECTION`, `PLANNED`) | ≥ 12 sp | ≥ 12 sp |
| Text-vs-background contrast | 7:1 (WCAG AAA), 4.5:1 for text ≥ 24 sp | 7:1 (WCAG AAA), 4.5:1 for text ≥ 24 sp |
| Button-vs-surface contrast (non-text UI) | ≥ 3:1 | ≥ 3:1 |
| Edge-to-edge gap between adjacent tap targets | ≥ 12 dp | ≥ 8 dp |
| Gap when destructive is adjacent to primary | ≥ 24 dp OR destructive in a visually distinct region | ≥ 24 dp OR destructive in a visually distinct region |

## Why these

- **Hit targets.** Material's 48 dp is the ecosystem floor (Android-first stance from #1). At-the-court gets +8 dp because sunlight glare erodes edge visibility and a sweaty thumb pad wobbles ~13 dp under strain. Reference: Strava / Apple Fitness primary actions land at 56–60 dp.
- **Text.** 16 sp is Apple/Material's default; going smaller regresses accessibility for no gain. 24 sp is the smallest that still reads at a glance from 1–2 m in direct sun.
- **Contrast.** WCAG's 4.5:1 is measured on indoor screens; sunlight cuts effective contrast by 30–50%, so AA on paper becomes sub-AA on court. AAA gives the needed headroom. 3:1 for non-text UI is WCAG 2.1 SC 1.4.11.
- **Spacing.** 12 dp gives a ~13 dp thumb-wobble buffer on top of a 56 dp target. 24 dp for destructive-adjacent guards specifically against "End Session" mis-tap during entry save.

## Consequences carried into follow-on tickets

- `accent` (#2F7A56) must darken until white-on-accent hits 7:1 for at-the-court button labels.
- `textSecondary` restricted to structural labels; not usable for body content on any surface.
- `textMuted` restricted to placeholders and decorative use; not usable for content anywhere.
- Timer target-label (currently 15 px) must rise to ≥ 24 sp when the timer is rebuilt.
- Drill-picker row primary text (currently 17 sp) must rise to ≥ 24 sp when the picker is rebuilt.
