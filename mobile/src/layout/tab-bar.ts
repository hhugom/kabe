// Shared tab-bar height so SessionSheet (which anchors above the tab bar)
// stays in sync with TabBar's own styles. TabBar renders `paddingTop` +
// `tab.minHeight` + hairline; the safe-area bottom is added by the caller.
import { StyleSheet } from 'react-native';
import { spacing } from '../theme';

const TAB_MIN_HEIGHT = 56;
const TAB_TOP_PADDING = spacing.sm; // matches TabBar styles.bar.paddingTop

export const TAB_BAR_HEIGHT = TAB_MIN_HEIGHT + TAB_TOP_PADDING + StyleSheet.hairlineWidth;

export type TabBarSlideInput = {
  // The sheet's translateY at its PEEK snap point (FULL is always 0). This is
  // the input domain of the interpolation.
  peekTranslate: number;
  // How far the bar must move down to clear the screen — its rendered height
  // plus the bottom safe-area (see tabBarTravel).
  tabBarTravel: number;
};

export type TabBarSlideConfig = {
  inputRange: number[];
  outputRange: number[];
  extrapolate: 'clamp';
};

// Interpolation config that slides the tab bar in lockstep with the session
// sheet. The sheet's translateY runs from 0 (FULL) to peekTranslate (PEEK);
// the bar mirrors it inverted — fully slid out (tabBarTravel) at FULL, at rest
// (0, identity transform) at PEEK. Clamped so an overshooting spring can't push
// the bar above its resting line or below the screen. Feed the result to the
// sheet's (JS-driven) translateY.interpolate() — see session-sheet-slide for
// why the driver is JS, not native.
export function tabBarSlideInterpolation({
  peekTranslate,
  tabBarTravel,
}: TabBarSlideInput): TabBarSlideConfig {
  return {
    inputRange: [0, peekTranslate],
    outputRange: [tabBarTravel, 0],
    extrapolate: 'clamp',
  };
}

// The distance the bar travels to clear the bottom edge: its own rendered
// height plus the safe-area padding the caller adds below it.
export function tabBarTravel(insetBottom: number): number {
  return TAB_BAR_HEIGHT + insetBottom;
}
