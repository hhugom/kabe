# Aesthetic direction

Resolved in issue #3 (part of map #1).

Kabe's visual language is **Zwift-HUD**: dark-blue chrome, data-dense telemetry panels, state-driven multi-hue accents, chunky bold display digits. The mock lives in `mobile/src/screens/AestheticPrototype.tsx` (variant C) until the library-decision ticket (#6) rebuilds the real screens.

Rejected alternatives:

- **Keep-and-sharpen (light-green).** Too calm for a sporty court app; the reference apps in #1 (Strava / Apple Fitness) are all dark or high-contrast.
- **Strava-minimal (near-black, orange).** Right direction on chrome but too editorial-brutal; the black-on-orange primary tested aggressive rather than motivating.

## Locked palette

| Token | Hex | Role |
|---|---|---|
| `bg` | `#0A0F14` | Screen background — dark blue-black. |
| `surface` | `#151E27` | Elevated panels (hero timer card, stat chips). |
| `surfaceHi` | `#1D2A36` | Panel borders, secondary elevation, progress-track fill. |
| `textPrimary` | `#FFFFFF` | Content text. |
| `textSecondary` | `#8FA4B8` | Labels, metadata (hits AAA on `bg`, barely — verify with tooling before using at any smaller size than currently drawn). |
| `textMuted` | `#5A6E82` | Placeholders and decorative only — not usable for content per #2. |
| `accentCyan` | `#00E5FF` | Primary "on-target" state (under 90 % of target). |
| `accentAmber` | `#FFC933` | "Approaching" state (90–100 % of target). |
| `accentMagenta` | `#FF3D71` | "At-or-over" state (≥ 100 % of target). |
| `accentCyanPressed` | `#00B8CC` | Pressed state for cyan primary. |
| `danger` | `#FF6B6B` | Destructive actions (End Session, delete). |
| `onAccent` | `#000000` | Text on any of the three saturated accents — black hits AAA on all of them; white does not. |

Contrast notes (verified against #2's AAA-text-both-tiers floor):

- Black on cyan `#00E5FF` ≈ 13:1 (AAA).
- Black on amber `#FFC933` ≈ 11:1 (AAA).
- Black on magenta `#FF3D71` ≈ 7.5:1 (AAA, just).
- White text on `bg` ≈ 18:1 (AAA).
- `textSecondary` on `bg` ≈ 7.3:1 (AAA, tight — do not lighten `bg` or darken `textSecondary`).

## State-driven accent rule

For any surface that represents "progress toward a target" (timer elapsed, reps done vs planned, session duration vs goal), the primary accent is chosen by state:

- `< 90 %` of target → **cyan** (on-track).
- `90–100 %` → **amber** (approaching).
- `≥ 100 %` → **magenta** (over).

Surfaces without a target (session-picker rows, drill list) use **cyan** as the neutral primary.

## Type-scale sketch

Sizes are the *floor*; #2 minima still apply. Weights are the aesthetic intent (chunky bold, tabular-nums for anything numeric).

| Token | Size / Line-height | Weight | Notes |
|---|---|---|---|
| `heroDigits` | 112 / 116 sp | 800 | Timer readout, rep counter, hero numeric. `tabular-nums`, `letterSpacing -1`. |
| `display` | 44 / 48 sp | 800 | Secondary hero (percent, target readouts). `tabular-nums`. |
| `title` | 24 / 30 sp | 700 | Drill name, screen title. |
| `body` | 16 / 22 sp | 500 | Content text. |
| `caption` | 13 / 18 sp | 500 | Metadata within panels. |
| `label` | 12 sp | 800 | Uppercase structural labels, `letterSpacing 2–3`. |

Notes:

- `heroDigits` is bold (800), not thin — the calm-thin stopwatch aesthetic is dropped.
- Numeric readouts always use `fontVariant: ['tabular-nums']` so digits don't jitter as they tick.
- The current `theme.mono` (light 300, 64 sp) is superseded and will be removed when #6 rebuilds.

## HUD conventions

- **Hero panel** encloses the primary readout on a `surface` rounded card with a `surfaceHi` border. Not full-bleed. This is what makes it feel "HUD" rather than "big number on blank canvas".
- **Progress track** under the hero digits when a target exists: 10 dp height, `surfaceHi` background, filled with the current state accent.
- **Stat chips** (target, remaining, rate) sit below the hero panel as flex-1 side-by-side cards on the same `surface`/`surfaceHi` combo.
- **Primary action** uses the current state accent as a solid fill with black text.
- **Ghost / cancel** stays label-only in `textSecondary`; no border.

## Consequences carried into follow-on tickets

- The library chosen in #6 must permit deep custom theming — light/near-default themes (default Material 3 for RN, default iOS blueprint) won't reach this palette without heavy override. Prefer libraries that expose theme tokens explicitly.
- `theme.ts` becomes disposable: its whole palette and type ramp are replaced by the tokens above when screens are rebuilt on the chosen library.
- `expo-linear-gradient` is likely wanted for subtle panel gradients (`surface → surfaceHi`) — the prototype fakes this with solid panels + border; when rebuilding, evaluate whether to add the dep.
- Icons: HUD language wants filled, chunky glyphs — favour Material Symbols (filled, weight 500+) or Lucide's filled set over line icons. Locked separately once the library is picked.

## Visual mock

`mobile/src/screens/AestheticPrototype.tsx` (variant C). Reachable in dev builds via the "dev · aesthetic prototype (#3)" link at the bottom of Home. Kept until #6 folds a chosen library into the real In-Session screen.
