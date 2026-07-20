# Aesthetic prototype — notes

**Question (issue #3):** What should Kabe's in-session timer screen look like? Feeds the library-decision ticket (#6).

**Three variants live in `AestheticPrototype.tsx`. Cycle with the floating switcher at the bottom of the screen.**

- **A — Keep-and-sharpen.** Light bg `#F4F6F4`, darker/more-saturated green accent `#1F5A3A` (white-on-accent hits AAA), 128 sp thin mono digits, minimal chrome. The current theme.ts sharpened, not replaced.
- **B — Strava-minimal.** Near-black bg `#0B0D0C`, saturated Strava-orange accent `#FC4C02` with **black** text on it (white-on-orange fails AAA — noted deviation from Strava's real usage). 128 sp heavy digits, sharp corners (4 dp radius), uppercase treatment, brutal.
- **C — Zwift-HUD.** Dark blue bg `#0A0F14`, state-driven multi-hue accent (cyan under 90 %, amber 90–100 %, magenta at/over). Data-dense: 112 sp digits + progress bar + `%` panel + target/remaining chips. Gamey HUD feel.

**All three respect the #2 ergonomic minima** (56 dp targets, ≥24 sp mid-drill text, AAA text contrast, 24 dp gap between primary and Cancel).

## Reaching it

Dev-only link at the bottom of `HomeScreen` ("dev · aesthetic prototype (#3)") gated on `__DEV__`. The route is only registered in `RootStack` when `__DEV__` is true.

## Verdict

**Winner: C — Zwift-HUD.** Locked palette + type ramp published at `docs/conventions/aesthetic-direction.md`. Variant C stays live in this file as the visual mock referenced by the library-decision ticket (#6).

## Cleanup

The prototype is kept until #6 rebuilds real screens on top of the chosen library. Once that lands:

- Delete `AestheticPrototype.tsx` and this file.
- Remove the `AestheticPrototype` entry from `RootStackParamList`, the `RootStack.Screen` in `App.tsx`, and the dev link + styles in `HomeScreen.tsx`.
- Variants A and B are captured in git history if needed later.
