// Pure layout math for the persistent workout sheet (see SessionSheet.tsx and
// docs/adr/0004). Kept free of React/animation so the geometry is unit-testable
// in isolation.
//
// The sheet is TOP-anchored inside a full-height clip region and slides via
// translateY between FULL (0) and PEEK (`peekTranslate`). The tab bar slides
// out of the way at FULL (see TabBar.tsx), so at FULL the sheet must reach the
// bottom safe-area — the clip mask drops to `insetBottom` to reveal it. At PEEK
// the mask stops above the tab bar so the tab bar stays visible.
//
// All four outputs are independent of the snap point: the sheet interpolates
// the mask between the two `clipBottom*` endpoints off translateY (see
// SessionSheet), so the slide has stable endpoints and never snaps mid-flight.

import { TAB_BAR_HEIGHT } from '../layout/tab-bar';

// Peek header height — grabber + single-line bar (title + timer).
export const PEEK_HEIGHT = 56;

export type SheetLayoutInput = {
  screenHeight: number;
  insetTop: number;
  insetBottom: number;
  // True when the tab bar is present (tab-root routes); false on push routes.
  tabBarVisible: boolean;
};

export type SheetLayout = {
  // Absolute top offset of the sheet within the (screen-top-anchored) clip.
  sheetTop: number;
  // Full height of the sheet — spans from `sheetTop` to the bottom safe-area.
  sheetHeight: number;
  // translateY at the PEEK snap point (FULL is always 0).
  peekTranslate: number;
  // Clip-mask bottom offset at FULL — drops to the safe area so the sheet
  // covers the vacated tab-bar zone.
  clipBottomFull: number;
  // Clip-mask bottom offset at PEEK — reserves the tab-bar strip so the bar
  // shows through below the peek header.
  clipBottomPeek: number;
};

export function computeSheetLayout({
  screenHeight,
  insetTop,
  insetBottom,
  tabBarVisible,
}: SheetLayoutInput): SheetLayout {
  const tabReserve = tabBarVisible ? TAB_BAR_HEIGHT : 0;

  // The sheet always spans the full usable height (top inset → bottom safe
  // area); at FULL (translateY 0) it therefore covers the vacated tab-bar zone.
  const sheetTop = insetTop;
  const sheetHeight = screenHeight - insetTop - insetBottom;

  // Slide down far enough that the peek header's bottom meets the tab-bar top
  // line (or the safe-area line on push routes).
  const peekTranslate = sheetHeight - PEEK_HEIGHT - tabReserve;

  // The two snap-point endpoints the mask animates between: FULL reveals down
  // to the safe area (tab bar has slid away); PEEK reserves the tab-bar strip.
  const clipBottomFull = insetBottom;
  const clipBottomPeek = insetBottom + tabReserve;

  return { sheetTop, sheetHeight, peekTranslate, clipBottomFull, clipBottomPeek };
}
