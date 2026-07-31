import { createContext, useContext } from 'react';
import type { Animated } from 'react-native';

// Bridges the session sheet's live slide position across the React-Navigation
// tabBar boundary so TabBar can move in lockstep with the sheet. The sheet
// (SessionSheetProvider) owns the Animated.Value; TabBar consumes it and
// interpolates it into its own downward slide (see tabBarSlideInterpolation).
//
// Its own module so TabBar can read the value without importing SessionSheet
// (which imports InSessionScreen) — that back-edge would be a require cycle.
// null when no session is active: TabBar then renders a plain static bar.
export type SheetSlide = {
  // The sheet's live translateY: 0 at FULL, peekTranslate at PEEK. JS-driven
  // (useNativeDriver: false) so everything tracking it — the bar transform and
  // the clip fill — stays exactly in step and the bar's touch area follows it.
  translateY: Animated.Value;
  // translateY at the PEEK snap point; the input-domain end of the mapping.
  peekTranslate: number;
};

export const SheetSlideCtx = createContext<SheetSlide | null>(null);

// The live sheet slide, or null when no session is active.
export function useSheetSlide(): SheetSlide | null {
  return useContext(SheetSlideCtx);
}
