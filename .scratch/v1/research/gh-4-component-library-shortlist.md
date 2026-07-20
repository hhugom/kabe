# Research — hhugom/kabe#4: Component library shortlist

This ticket feeds #6 (library decision), which blocks #7 and #8. Job here: cut five candidates down to two finalists to prototype. The dominant risk is Expo SDK 56 currency — Kabe pins a very recent SDK, so any candidate whose latest release lags SDK 56 / React 19.2 / RN 0.85 is out.

**Sandbox caveat.** This run had no outbound web access (`WebFetch`, `WebSearch`, `npm view`, and `curl` were all denied). Every capability claim below is either (a) sourced from files on the local machine — Kabe's own docs and Kabe's installed `mobile/node_modules/expo/` — or (b) marked **[UNVERIFIED]** and echoed in Open questions. Nothing was invented from recall. #6 must not start until Open questions are primary-sourced.

## Kabe's hard constraints (recap)

- **Stack.** `expo ~56.0.12`, `react 19.2.3`, `react-native 0.85.3`, `jest-expo ^56.0.5`, `@testing-library/react-native ^14.0.1`, TypeScript `~6.0.3`, managed workflow (no `expo prebuild` in the repo). Source: `mobile/package.json`.
- **Compatibility oracle.** `mobile/node_modules/expo/bundledNativeModules.json` pins RN 0.85.3, React 19.2.3, Reanimated **4.3.1** (major rewrite from 3.x), gesture-handler 2.31.1, screens 4.25.2, safe-area-context ~5.7.0, svg 15.15.4, Skia 2.6.2, FlashList 2.0.2.
- **Also in the bundle: `@expo/ui` at ~56.0.18** — an official Expo primitives package not on #4's list. Flagged in Open questions.
- **Android-first, iOS follows.** "Feel native on Android (Material-ish is fine)" — issue #1 Notes.
- **Zwift-HUD palette locked.** `bg #0A0F14`, `surface #151E27`, `surfaceHi #1D2A36`, state accents `#00E5FF`/`#FFC933`/`#FF3D71`, black-on-accent. "Libraries with a rigid default theme won't reach this palette without heavy override — prefer libraries that expose theme tokens explicitly." Source: `docs/conventions/aesthetic-direction.md`.
- **Type ramp.** `heroDigits` 112 sp / 800 / `tabular-nums` / `letterSpacing -1`; `display` 44 sp / 800; `title` 24 sp / 700. Digits must not jitter. Any `Text` primitive that blocks arbitrary size/weight/`fontVariant` is disqualifying. Source: same file.
- **Ergonomic floor.** At-the-court tap targets ≥ 56 dp, body ≥ 16 sp, mid-drill text ≥ 24 sp, AAA contrast (7:1) under 24 sp, ≥ 12 dp between adjacent targets. Source: `docs/conventions/ergonomic-minima.md`.
- **Primitive shopping list.** Bottom sheet / modal, list-item row, big-number `Text`. All hard.

## Candidates

Capability claims are drawn from long-standing library architecture and marked **[verify]** for the current release. Version / peerDependency claims are marked **[UNVERIFIED]**.

### react-native-paper

- **Android-first.** M3 implementation; the most Android-native-looking of the five when defaults are kept. `Button`, `FAB`, `Appbar`, `List.Item` render as M3 tokens. [verify]
- **Themeability.** Explicit `PaperProvider theme={MD3DarkTheme extended}`. Tokens `colors.primary/surface/onSurface/background` — overriding to Zwift-HUD is the intended path. **Risk:** M3 spec bakes an *elevation tonal overlay* (accent tint on `surface`) into elevated components; the fixed `#151E27` will drift under elevation. Mitigable by clamping `elevation: 0` on hero panels.
- **Bottom sheet.** Ships `Modal`/`Dialog` but historically **no native bottom sheet** — community pattern is `@gorhom/bottom-sheet` alongside. Caveat, not fail. [verify]
- **Hero typography.** `Text variant="displayLarge"` tops out ~57 sp per M3; `heroDigits` at 112 sp needs raw `<Text style={{ fontSize: 112, fontWeight: '800', fontVariant: ['tabular-nums'] }}>`. Paper forwards style, so this works but leaves the variant system for the hero.
- **List-item.** `List.Item` with `title`/`description`/`left`/`right`/`onPress` matches Drill/Routine/Session rows. Default title 16 sp — must override `titleStyle` for the ≥ 24 sp at-the-court floor.
- **Expo 56 / RN 0.85 / React 19.2.** **[UNVERIFIED]** — verify at `https://registry.npmjs.org/react-native-paper/latest`. Callstack historically tracks RN within one or two SDK cycles; low prior risk, must confirm.
- **Dep weight / managed workflow.** Pure JS + icons via `@expo/vector-icons` (already bundled at ~15.0.2). No native module, no prebuild. Lightest of the five.

### Tamagui

- **Android-first.** Aggressively cross-platform (native + web); default surface is neutral, not Material. Getting Android-native means *building it*, not adopting it. Against "feels native without extra work".
- **Themeability.** Best-in-class. Themes-of-themes (`dark`, `dark_accent`), semantic tokens (`$background`, `$color`, `$accent`), compile-time optimisation. Zwift-HUD maps naturally; state-driven accent swaps land via theme names. [verify]
- **Bottom sheet.** `Sheet` is first-class with snap points, dismiss, animated backdrop. Unambiguous pass. [verify at `https://tamagui.dev/docs/components/sheet`]
- **Hero typography.** `SizableText`/`H1–H6` accept style overrides; `fontVariant` passes through. No fight.
- **List-item.** `ListItem` (title / subtitle / iconAfter / iconBefore). Shape matches. [verify]
- **Expo 56 / RN 0.85 / React 19.2.** **[UNVERIFIED — highest risk of the five.]** Tamagui runs a compile-time optimiser (`@tamagui/babel-plugin`) hooking into Metro/Babel. A matching Tamagui release must exist for `babel-preset-expo ~56.0.15` and `@expo/metro ~56.0.0`. If either lags SDK 56, Tamagui is out. Verify against npm + Tamagui GitHub issues for "Expo SDK 56" / "React 19".
- **Dep weight / managed workflow.** `babel.config.js` change + Metro config extension. Works on managed but adds moving parts. Runtime bundle competitive (compile-time flattening); build time heavier.

### Gluestack UI v2

- **Android-first.** Styled via `nativewind` / Tailwind-flavoured tokens; Radix-influenced neutral defaults, not Material. Same critique as Tamagui.
- **Themeability.** Token-driven via `gluestack.config`, semantic colour tokens, dark-mode ready. Maps to Zwift-HUD cleanly. [verify]
- **Bottom sheet.** `Actionsheet` with `ActionsheetBackdrop`, `ActionsheetDragIndicator`, `ActionsheetItem` — first-class primitive. [verify]
- **Hero typography.** `Text`/`Heading` accept overrides; className sizing via `nativewind`. Works.
- **List-item.** No dedicated `ListItem` — pattern is `HStack` + `Pressable` + `Text`. Wrapper cost, not a fight.
- **Expo 56 / RN 0.85 / React 19.2.** **[UNVERIFIED]** Both Gluestack and its required `nativewind` must peer-support React 19 / RN 0.85; same class of risk as Tamagui's Babel plugin.
- **Dep weight / managed workflow.** `nativewind` + `tailwindcss` + Metro config. Moving parts comparable to Tamagui.

### React Native UI Lib (Wix)

- **Android-first.** Design-system-agnostic defaults — closer to Wix's product than to Android. Native Android feel requires deliberate theming; not a strong fit.
- **Themeability.** Static `Colors`, `Typography`, `Spacings` overridden globally. Coarser than Tamagui/Gluestack tokens; single-theme apps fit fine (Kabe has no light/dark toggle by policy).
- **Bottom sheet.** `Dialog` supports bottom position; a dedicated `BottomSheet` was added in later versions. Meets bar with caveats. [verify at `https://wix.github.io/react-native-ui-lib/`]
- **Hero typography.** `Text` accepts style overrides. Works.
- **List-item.** `ListItem` with `ListItem.Part` (left/middle/right). Matches shape; idiosyncratic API — team ergonomics unclear before prototype.
- **Expo 56 / RN 0.85 / React 19.2.** **[UNVERIFIED — Reanimated 4 risk.]** UI Lib depends on Reanimated + gesture-handler. Kabe pins **Reanimated 4.3.1** via SDK 56; Reanimated 4 is a breaking rewrite from 3.x. Libraries pinning `^3.x` fail here. Verify peers at `https://registry.npmjs.org/react-native-ui-lib/latest`.
- **Dep weight / managed workflow.** Includes native modules for some components (`Picker`, some animations); some paths historically required prebuild. Verify.

### Material 3 primitives (`@react-native-material/core` or bespoke on `expo-router`)

- **Android-first.** By construction — bespoke on M3 tokens matches Android natively. `@react-native-material/core` renders M3-styled buttons, cards, list items.
- **Themeability.** Total (bespoke = whatever you write). `@rnm/core` has a `ThemeProvider` with palette/typography/shapes.
- **Bottom sheet.** `@rnm/core` doesn't ship one; bespoke means shipping `@gorhom/bottom-sheet` yourself.
- **Hero typography.** Trivial — bespoke.
- **List-item.** `@rnm/core` has `ListItem`; bespoke means write it.
- **Expo 56 / RN 0.85 / React 19.2.** **[UNVERIFIED — strong prior FAIL for `@rnm/core`.]** Last significant release was years ago; repo appears abandoned. Unlikely to declare React 19 / RN 0.85. Bespoke has no compat problem by definition but "bespoke" is not a library shortlist entry.
- **Dep weight / managed workflow.** Bespoke: zero library deps, heaviest engineering cost. `@rnm/core`: light but likely dead.

## Scoring matrix

**✓** clear pass, **○** partial / caveats, **✗** clear fail, **?** couldn't primary-source in-sandbox.

| Requirement | Paper | Tamagui | Gluestack | Wix UI Lib | M3 primitives |
|---|---|---|---|---|---|
| Android-first look | ✓ | ✗ | ✗ | ○ | ✓ (bespoke) / ○ (`@rnm`) |
| Themeable to Zwift-HUD | ○ | ✓ | ✓ | ○ | ✓ |
| Bottom sheet / modal | ○ | ✓ | ✓ | ○ | ✗ |
| Big-number / hero type | ✓ | ✓ | ✓ | ✓ | ✓ |
| Row / list-item primitive | ✓ | ✓ | ○ | ✓ | ○ |
| Expo 56 + RN 0.85 + React 19.2 | ? | ? (babel plugin risk) | ? (nativewind risk) | ? (Reanimated 4 risk) | ✗ (`@rnm` likely dead) |
| Dep weight / managed workflow | ✓ | ○ | ○ | ○ | ✓ |

Caveats behind non-**✓** cells:

- **Paper × Zwift-HUD (○).** M3 tonal-elevation overlay tints `surface` toward primary; fixable with `elevation: 0` on hero panels but worth flagging.
- **Paper × bottom sheet (○).** Ships `Modal`/`Dialog`, not a native sheet — expected pairing is `@gorhom/bottom-sheet`.
- **Tamagui / Gluestack × Android-first (✗).** They let you *build* Material rather than shipping it. Constraint is "feels native without extra work".
- **Wix × Android-first (○).** Defaults are design-agnostic; theming lands anywhere but doesn't lean Android.
- **Every Expo-compat cell is `?`.** Web access denied in-sandbox; this row is the single most important thing to primary-source before #6 starts.

## Finalists — two sentences per finalist

**react-native-paper** — Only candidate that satisfies "feels native on Android without extra work" while also exposing explicit dark-theme token override (`PaperProvider theme={{ colors: { ... } }}`), and it ships `List.Item` matching the Drill/Session row shape. Risk to prototype in #6: whether the M3 tonal-elevation overlay fights the fixed `#151E27` on the hero timer card — if elevation-clamping to 0 loses the "HUD" panel feel from `aesthetic-direction.md`, Paper drops.

**Tamagui** — Theming and bottom-sheet story are unambiguously stronger than Paper (first-class `Sheet`, tokens-of-tokens, state-driven accent swaps via theme names), which matters because Zwift-HUD is the deepest theming demand on this shortlist. Risk to prototype in #6: whether `tamagui@latest` + `@tamagui/babel-plugin@latest` install cleanly on `babel-preset-expo ~56.0.15` and Metro ~56.0.0 without patching — if compat lags SDK 56, Tamagui drops and Wix UI Lib takes the slot.

## Rejected — one sentence per rejection

- **Gluestack UI v2** — Adds a Tailwind/`nativewind` toolchain layer without landing closer to Android-native than Tamagui, which is already the "power-theming" finalist.
- **React Native UI Lib (Wix)** — Design-agnostic defaults don't buy the Android-native feel #1 calls for, and it is the most exposed of the five to a Reanimated 4.x break on SDK 56; kept as fallback if Tamagui fails verification.
- **Material 3 primitives** — `@react-native-material/core` is likely unmaintained (verify), and "bespoke M3" is the opt-out from what #4 exists to answer.

## Open questions

Every item must be primary-sourced before #6 begins.

- **`react-native-paper@latest`** — version, publish date, `peerDependencies.react` / `peerDependencies.react-native`. Registry: `https://registry.npmjs.org/react-native-paper/latest`; source of truth: `https://github.com/callstack/react-native-paper/blob/main/package.json`.
- **`tamagui@latest` + `@tamagui/babel-plugin@latest`** — versions, peers, and whether both list React 19.2 / RN 0.85. Check Tamagui GitHub for "Expo SDK 56" / "React 19". **If it fails, Tamagui drops and Wix UI Lib moves in.**
- **`@gluestack-ui/themed@latest`** + `nativewind@latest` peers on RN 0.85 — only relevant if a finalist falls out.
- **`react-native-ui-lib@latest`** peers — specifically whether it accepts `react-native-reanimated ^4.x`. Kabe pins 4.3.1. Reanimated 4 is a breaking rewrite; `^3.x` pins are hard fails.
- **`@react-native-material/core`** — last publish + last commit dates. Strong prior "abandoned" — confirm.
- **`@gorhom/bottom-sheet@latest`** — Reanimated 4 support on RN 0.85. This is the assumed Paper pairing; if it lags, Paper's sheet story regresses to `Modal` and Paper drops.
- **`@expo/ui` at ~56.0.18** — appears in `bundledNativeModules.json` line 5 but is not one of #4's five candidates. Worth a paragraph in #6: does it already ship sheet / list-item / button primitives, and if so, does that reduce the library-choice stakes?
- **`jest-expo ^56.0.5` compatibility with each finalist.** Verify `jest-preset` guidance against `@testing-library/react-native ^14.0.1`.
- **Icon-set pairing.** `@expo/vector-icons ~15.0.2` is already bundled; Paper defaults to it, Tamagui is agnostic. Aesthetic direction wants filled Material Symbols or Lucide filled — verify each finalist's default and swap cost.

---

File written to: `/Users/hugomartinez/Documents/Dev/kabe/.scratch/v1/research/gh-4-component-library-shortlist.md`
