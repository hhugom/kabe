// Archetype 5 — Persistent workout sheet (see docs/adr/0004 and
// navigation-surface.md § Archetype 5). Modeled on Strong's in-workout view.
//
// One always-mounted sheet, anchored just above the tab bar (or bottom
// safe-area on push routes). Two snap points:
//   - PEEK — only a compact header (elapsed / current-drill label) visible.
//   - FULL — sheet extends to the top of the screen; full session content.
//
// Drag is continuous; snap on release is spring-based on velocity + position.
// Non-modal — no overlay, no dimming; the tab bar and any pushed screen below
// stay interactive when the sheet is peeked. Hardware-back at FULL collapses
// to PEEK; at PEEK it falls through to the underlying surface.
//
// Implementation notes:
//   - The sheet is a fixed-height Animated.View at bottom = TAB_BAR_HEIGHT +
//     safe-area (or just safe-area on push routes). Its translateY animates
//     between 0 (FULL) and (sheetH - peekH) (PEEK). Content order: peek
//     header at the TOP of the sheet, so when translated down that header is
//     what remains visible.
//   - InSessionScreen is mounted the whole time; scroll-to-top / focus state
//     survives peek↔full transitions.
//   - useSessionSheetInset() exposes PEEK_HEIGHT (or 0 when no active session)
//     so stack-push footers reserve bottom padding to avoid peek overlap.

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Animated,
  AppState,
  BackHandler,
  Dimensions,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { XStack } from 'tamagui';
import { getAppDb } from '../db/client';
import { formatMmSs } from '../lib/format';
import { InSessionScreen } from '../screens/InSessionScreen';
import { colors, radius, spacing } from '../theme';
import {
  ActiveSessionState,
  drillFor,
  hydrate,
  plannedSlots,
} from '../use-cases/active-session';

// TabBar minHeight (56) + paddingTop (8) + hairline. Kept in sync with
// TabBar.tsx — the tab bar itself pads for the safe area, so we add
// insets.bottom separately at the render site.
const TAB_BAR_HEIGHT = 65;
// Peek header height — grabber + single-line bar (title + timer).
const PEEK_HEIGHT = 56;

type SessionSheetController = {
  openFull: () => void;
  collapse: () => void;
  close: () => void;
};

const Ctx = createContext<SessionSheetController | null>(null);
// Exposed separately so screens that need the peek footprint (RoutineEditor
// footer) don't have to consume the controller.
const InsetCtx = createContext<number>(0);

export function useSessionSheet(): SessionSheetController {
  const v = useContext(Ctx);
  if (!v) throw new Error('useSessionSheet: SessionSheetProvider missing');
  return v;
}

// Pixels of vertical space the peek occupies at rest. 0 when no active
// session. Consume via `paddingBottom` on any bottom-anchored footer that
// would otherwise be occluded by the peek.
export function useSessionSheetInset(): number {
  return useContext(InsetCtx);
}

type Props = {
  sessionActive: boolean;
  onSessionEnded: () => void;
  // True when the current top-level route is Tabs (tab bar is visible).
  // App.tsx tracks this via NavigationContainer.onStateChange because
  // useNavigationState can't be called from here (we're outside a Navigator).
  tabBarVisible: boolean;
  children: ReactNode;
};

export function SessionSheetProvider({
  sessionActive,
  onSessionEnded,
  tabBarVisible,
  children,
}: Props) {
  const insets = useSafeAreaInsets();
  const screenH = Dimensions.get('window').height;

  const sheetBottom = insets.bottom + (tabBarVisible ? TAB_BAR_HEIGHT : 0);
  const sheetHeight = screenH - sheetBottom - insets.top;
  const peekTranslate = sheetHeight - PEEK_HEIGHT;

  const translateY = useRef(new Animated.Value(peekTranslate)).current;
  const [expanded, setExpanded] = useState(false);
  // Ref mirror so pan handlers (which capture at creation time) always see
  // the latest value without recreating the responder.
  const expandedRef = useRef(false);

  const springTo = useCallback(
    (toValue: number, velocity = 0) => {
      Animated.spring(translateY, {
        toValue,
        velocity,
        useNativeDriver: true,
        bounciness: 4,
        speed: 16,
      }).start();
    },
    [translateY]
  );

  const openFull = useCallback(() => {
    expandedRef.current = true;
    setExpanded(true);
    springTo(0);
  }, [springTo]);

  const collapse = useCallback(() => {
    expandedRef.current = false;
    setExpanded(false);
    springTo(peekTranslate);
  }, [springTo, peekTranslate]);

  // If the peek anchor shifts (route change moves the tab bar in/out), realign
  // the current snap point so the sheet doesn't jump.
  useEffect(() => {
    translateY.setValue(expandedRef.current ? 0 : peekTranslate);
  }, [peekTranslate, translateY]);

  const controller = useMemo<SessionSheetController>(
    () => ({
      openFull,
      collapse,
      close: () => {
        expandedRef.current = false;
        setExpanded(false);
        translateY.setValue(peekTranslate);
        onSessionEnded();
      },
    }),
    [openFull, collapse, translateY, peekTranslate, onSessionEnded]
  );

  // Hardware back at FULL → collapse (don't exit the app). At PEEK we do NOT
  // consume the event; it falls through so the OS default (back-navigate the
  // underlying stack, or exit at tab-root) still fires.
  useEffect(() => {
    if (!expanded) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      collapse();
      return true;
    });
    return () => sub.remove();
  }, [expanded, collapse]);

  const dragStart = useRef(0);
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_e, g) =>
          Math.abs(g.dy) > 6 && Math.abs(g.dy) > Math.abs(g.dx),
        onPanResponderGrant: () => {
          dragStart.current = expandedRef.current ? 0 : peekTranslate;
          translateY.stopAnimation();
        },
        onPanResponderMove: (_e, g) => {
          const next = Math.max(0, Math.min(peekTranslate, dragStart.current + g.dy));
          translateY.setValue(next);
        },
        onPanResponderRelease: (_e, g) => {
          const current = dragStart.current + g.dy;
          const swipedUp = g.vy < -0.5;
          const swipedDown = g.vy > 0.5;
          const pastMidpoint = current < peekTranslate / 2;
          if (swipedUp || (!swipedDown && pastMidpoint)) openFull();
          else collapse();
        },
        onPanResponderTerminate: () => {
          if (expandedRef.current) springTo(0);
          else springTo(peekTranslate);
        },
      }),
    [peekTranslate, translateY, openFull, collapse, springTo]
  );

  const inset = sessionActive ? PEEK_HEIGHT + insets.bottom : 0;

  return (
    <Ctx.Provider value={controller}>
      <InsetCtx.Provider value={inset}>
        {children}
        {sessionActive ? (
          // Clip region spans from screen top down to the top of the tab bar
          // (or bottom safe-area on push routes). overflow: 'hidden' masks the
          // sheet body when peeked so it never bleeds over the nav.
          // pointerEvents: 'box-none' lets taps pass through to the underlying
          // content in the empty top area.
          <View
            pointerEvents="box-none"
            style={[styles.clipRegion, { bottom: sheetBottom }]}
          >
            <Animated.View
              style={[
                styles.sheet,
                {
                  height: sheetHeight,
                  transform: [{ translateY }],
                },
              ]}
            >
              <View
                style={[styles.peekHeader, { height: PEEK_HEIGHT }]}
                {...panResponder.panHandlers}
              >
                <PeekContent
                  sessionActive={sessionActive}
                  expanded={expanded}
                  onExpandPress={openFull}
                  onCollapsePress={collapse}
                />
              </View>
              <View style={styles.fullBody}>
                <InSessionScreen onClose={controller.close} />
              </View>
            </Animated.View>
          </View>
        ) : null}
      </InsetCtx.Provider>
    </Ctx.Provider>
  );
}

// -------------------------------------------------------------- peek head --

function PeekContent({
  sessionActive,
  expanded,
  onExpandPress,
  onCollapsePress,
}: {
  sessionActive: boolean;
  expanded: boolean;
  onExpandPress: () => void;
  onCollapsePress: () => void;
}) {
  const [state, setState] = useState<ActiveSessionState | null>(null);
  const [elapsedSec, setElapsedSec] = useState(0);
  const startedAtRef = useRef<number | null>(null);

  // Re-hydrate every time sessionActive flips true (or on mount if already
  // true). Without the `sessionActive` dep the peek would stay on `Loading…`
  // forever when a session starts after the peek first mounted.
  useEffect(() => {
    if (!sessionActive) {
      setState(null);
      startedAtRef.current = null;
      setElapsedSec(0);
      return;
    }
    let cancelled = false;
    (async () => {
      const next = await hydrate(getAppDb());
      if (cancelled) return;
      setState(next);
      startedAtRef.current = next ? Date.parse(next.session.startedAt) : null;
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionActive]);

  useEffect(() => {
    if (startedAtRef.current == null) return;
    const compute = () =>
      Math.max(0, Math.floor((Date.now() - (startedAtRef.current ?? 0)) / 1000));
    setElapsedSec(compute());
    if (process.env.NODE_ENV === 'test') return;
    const id = setInterval(() => setElapsedSec(compute()), 1000);
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') setElapsedSec(compute());
    });
    return () => {
      clearInterval(id);
      sub?.remove();
    };
  }, [state]);

  const label = pickCurrentDrillLabel(state);

  return (
    <Pressable
      onPress={expanded ? onCollapsePress : onExpandPress}
      style={styles.peekPressable}
      testID="session-peek"
    >
      <View style={styles.grabber} />
      <XStack alignItems="center" gap={spacing.sm} paddingHorizontal={spacing.md}>
        <View style={styles.dot} />
        <Text style={styles.peekTitle} numberOfLines={1}>
          {label}
        </Text>
        <Text style={styles.peekTime} testID="session-peek-time">
          {formatMmSs(elapsedSec)}
        </Text>
      </XStack>
    </Pressable>
  );
}

function pickCurrentDrillLabel(state: ActiveSessionState | null): string {
  if (!state) return 'Loading…';
  if (state.pickedDrill) return state.pickedDrill.name;
  const slots = plannedSlots(state);
  const nextSlot = slots.find((s) => !s.entry);
  if (nextSlot) {
    return drillFor(state, nextSlot.drillId)?.name ?? 'Session';
  }
  return 'Session';
}

// -------------------------------------------------------------- styles --

const styles = StyleSheet.create({
  clipRegion: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    overflow: 'hidden',
    zIndex: 100_000,
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: colors.surfaceHi,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: -6 },
    elevation: 12,
    overflow: 'hidden',
  },
  peekHeader: {
    justifyContent: 'center',
  },
  peekPressable: {
    paddingTop: 4,
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.surfaceHi,
    marginBottom: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
  },
  peekTitle: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '700',
  },
  peekTime: {
    color: colors.textPrimary,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  fullBody: {
    flex: 1,
  },
});
