// Shared tab-bar height so SessionSheet (which anchors above the tab bar)
// stays in sync with TabBar's own styles. TabBar renders `paddingTop` +
// `tab.minHeight` + hairline; the safe-area bottom is added by the caller.
import { StyleSheet } from 'react-native';
import { spacing } from '../theme';

const TAB_MIN_HEIGHT = 56;
const TAB_TOP_PADDING = spacing.sm; // matches TabBar styles.bar.paddingTop

export const TAB_BAR_HEIGHT = TAB_MIN_HEIGHT + TAB_TOP_PADDING + StyleSheet.hairlineWidth;
