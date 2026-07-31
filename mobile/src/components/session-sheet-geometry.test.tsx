import { TAB_BAR_HEIGHT } from '../layout/tab-bar';
import { computeSheetLayout, PEEK_HEIGHT } from './session-sheet-geometry';

// Worked-example insets: a typical notched phone (top 44 / bottom 34) in an
// 800pt window. Expected values are reasoned from the spec, not recomputed the
// way the function does.
const BASE = { screenHeight: 800, insetTop: 44, insetBottom: 34 } as const;

describe('computeSheetLayout — tab-route sheet fills the vacated tab-bar space when full', () => {
  const peek = computeSheetLayout({ ...BASE, tabBarVisible: true, expanded: false });
  const full = computeSheetLayout({ ...BASE, tabBarVisible: true, expanded: true });

  it('at FULL the mask drops to the bottom safe-area (fills the vacated tab-bar strip)', () => {
    // Tab bar has slid away — the sheet should reach all the way down to the
    // safe-area inset, leaving no gap.
    expect(full.clipBottom).toBe(34);
  });

  it('at PEEK the mask stops above the tab bar (reserves its footprint)', () => {
    expect(peek.clipBottom).toBe(34 + TAB_BAR_HEIGHT);
  });

  it('the peek/full animation endpoints do not depend on expanded (slide stays smooth)', () => {
    // peekTranslate is the PEEK snap point; if it moved when `expanded` flipped,
    // the realign effect would snap mid-animation. It must be invariant.
    expect(full.peekTranslate).toBe(peek.peekTranslate);
    expect(full.sheetHeight).toBe(peek.sheetHeight);
    expect(full.sheetTop).toBe(peek.sheetTop);
  });

  it('the peek header lands exactly on the tab-bar top line', () => {
    // Peek header (height PEEK_HEIGHT) sits at the sheet top, shifted down by
    // peekTranslate; its bottom must meet the reserved tab-bar line.
    const peekHeaderBottom = peek.sheetTop + peek.peekTranslate + PEEK_HEIGHT;
    expect(peekHeaderBottom).toBe(800 - (34 + TAB_BAR_HEIGHT));
  });

  it('at FULL the sheet spans from the top inset down to the safe-area', () => {
    expect(full.sheetTop).toBe(44);
    expect(full.sheetTop + full.sheetHeight).toBe(800 - 34);
  });
});

describe('computeSheetLayout — push route has no tab bar to vacate', () => {
  const peek = computeSheetLayout({ ...BASE, tabBarVisible: false, expanded: false });
  const full = computeSheetLayout({ ...BASE, tabBarVisible: false, expanded: true });

  it('the mask sits at the safe-area whether peeked or full', () => {
    expect(peek.clipBottom).toBe(34);
    expect(full.clipBottom).toBe(34);
  });

  it('the peek header lands on the safe-area line (nothing reserved below it)', () => {
    const peekHeaderBottom = peek.sheetTop + peek.peekTranslate + PEEK_HEIGHT;
    expect(peekHeaderBottom).toBe(800 - 34);
  });
});
