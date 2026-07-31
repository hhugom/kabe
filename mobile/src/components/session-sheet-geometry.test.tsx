import { TAB_BAR_HEIGHT } from '../layout/tab-bar';
import { computeSheetLayout, PEEK_HEIGHT } from './session-sheet-geometry';

// Worked-example insets: a typical notched phone (top 44 / bottom 34) in an
// 800pt window. Expected values are reasoned from the spec, not recomputed the
// way the function does.
const BASE = { screenHeight: 800, insetTop: 44, insetBottom: 34 } as const;

describe('computeSheetLayout — tab-route sheet fills the vacated tab-bar space when full', () => {
  const layout = computeSheetLayout({ ...BASE, tabBarVisible: true });

  it('the FULL mask endpoint drops to the bottom safe-area (fills the vacated tab-bar strip)', () => {
    // Tab bar has slid away — the sheet should reach all the way down to the
    // safe-area inset, leaving no gap.
    expect(layout.clipBottomFull).toBe(34);
  });

  it('the PEEK mask endpoint stops above the tab bar (reserves its footprint)', () => {
    expect(layout.clipBottomPeek).toBe(34 + TAB_BAR_HEIGHT);
  });

  it('the peek header lands exactly on the tab-bar top line', () => {
    // Peek header (height PEEK_HEIGHT) sits at the sheet top, shifted down by
    // peekTranslate; its bottom must meet the reserved tab-bar line.
    const peekHeaderBottom = layout.sheetTop + layout.peekTranslate + PEEK_HEIGHT;
    expect(peekHeaderBottom).toBe(800 - (34 + TAB_BAR_HEIGHT));
  });

  it('at FULL the sheet spans from the top inset down to the safe-area', () => {
    expect(layout.sheetTop).toBe(44);
    expect(layout.sheetTop + layout.sheetHeight).toBe(800 - 34);
  });
});

describe('computeSheetLayout — push route has no tab bar to vacate', () => {
  const layout = computeSheetLayout({ ...BASE, tabBarVisible: false });

  it('both mask endpoints sit at the safe-area (nothing to reserve or reveal)', () => {
    expect(layout.clipBottomFull).toBe(34);
    expect(layout.clipBottomPeek).toBe(34);
  });

  it('the peek header lands on the safe-area line (nothing reserved below it)', () => {
    const peekHeaderBottom = layout.sheetTop + layout.peekTranslate + PEEK_HEIGHT;
    expect(peekHeaderBottom).toBe(800 - 34);
  });
});
