import { tabBarSlideInterpolation } from './tab-bar';

// The tab bar slides down in lockstep with the session sheet: as the sheet
// rises from PEEK (translateY = peekTranslate) to FULL (translateY = 0), the
// bar travels from its resting position down and off the bottom edge. The
// mapping is expressed as an Animated interpolation config fed to the sheet's
// JS-driven translateY; this pure function is the only testable seam (RNTL
// can't exercise the animation itself — see TabBar.tsx).
describe('tabBarSlideInterpolation', () => {
  it('maps the sheet FULL endpoint (translateY 0) to a fully slid-out bar', () => {
    const { inputRange, outputRange } = tabBarSlideInterpolation({
      peekTranslate: 500,
      tabBarTravel: 90,
    });
    // input 0 (sheet FULL) is the first knot; its paired output is the full
    // travel — the bar is pushed down by its whole height, off screen.
    const i = inputRange.indexOf(0);
    expect(i).toBeGreaterThanOrEqual(0);
    expect(outputRange[i]).toBe(90);
  });

  it('maps the sheet PEEK endpoint (translateY peekTranslate) to the bar at rest', () => {
    const { inputRange, outputRange } = tabBarSlideInterpolation({
      peekTranslate: 500,
      tabBarTravel: 90,
    });
    // input peekTranslate (sheet PEEK) pairs with output 0 — identity
    // transform, so the bar settles exactly at its layout position and its
    // Android hit area stays valid.
    const i = inputRange.indexOf(500);
    expect(i).toBeGreaterThanOrEqual(0);
    expect(outputRange[i]).toBe(0);
  });

  it('clamps past both endpoints so an overshooting spring never inverts the bar', () => {
    const config = tabBarSlideInterpolation({ peekTranslate: 500, tabBarTravel: 90 });
    expect(config.extrapolate).toBe('clamp');
  });

  it('is monotonic: input ascends, output descends (sheet up ⇒ bar down)', () => {
    const { inputRange, outputRange } = tabBarSlideInterpolation({
      peekTranslate: 500,
      tabBarTravel: 90,
    });
    for (let k = 1; k < inputRange.length; k++) {
      expect(inputRange[k]).toBeGreaterThan(inputRange[k - 1]);
      expect(outputRange[k]).toBeLessThan(outputRange[k - 1]);
    }
  });
});
