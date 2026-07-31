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
import { formatMmSs } from '../lib/format';
import { InSessionScreen } from '../screens/InSessionScreen';
import { colors, radius, spacing } from '../theme';
import { computeSheetLayout, PEEK_HEIGHT } from './session-sheet-geometry';
import {
  PeekMetaCtx,
  PeekPublisherCtx,
  useSessionPeekMeta,
  type PeekMeta,
  type PeekPublisher,
} from './session-peek';

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
  const [peekMeta, setPeekMeta] = useState<PeekMeta>({
    label: null,
    startedAtMs: null,
  });
  const publishPeekMeta = useCallback<PeekPublisher>((next) => {
    setPeekMeta((prev) =>
      prev.label === next.label && prev.startedAtMs === next.startedAtMs ? prev : next
    );
  }, []);
  // Reset when the session ends so the next session's peek starts clean.
  useEffect(() => {
    if (!sessionActive) setPeekMeta({ label: null, startedAtMs: null });
  }, [sessionActive]);

  const [expanded, setExpanded] = useState(false);
  const { sheetTop, sheetHeight, peekTranslate, clipBottom } = computeSheetLayout({
    screenHeight: screenH,
    insetTop: insets.top,
    insetBottom: insets.bottom,
    tabBarVisible,
    expanded,
  });

  const translateY = useRef(new Animated.Value(peekTranslate)).current;
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
        <PeekPublisherCtx.Provider value={publishPeekMeta}>
          <PeekMetaCtx.Provider value={peekMeta}>
            {children}
            {sessionActive ? (
              // Clip region masks the sheet body. At PEEK its bottom sits at the
              // top of the tab bar (or bottom safe-area on push routes) so the
              // tab bar shows through; at FULL it drops to the safe-area to
              // reveal the sheet filling the space the tab bar vacates. See
              // computeSheetLayout.clipBottom. overflow: 'hidden' does the mask;
              // pointerEvents: 'box-none' lets taps pass through to the underlying
              // content in the empty top area.
              <View
                pointerEvents="box-none"
                style={[styles.clipRegion, { bottom: clipBottom }]}
              >
                <Animated.View
                  // box-none: the sheet frame is full-height and overhangs the
                  // tab-bar zone, so it must never be a touch target itself —
                  // only its children (peek header, and the body when full) are.
                  // On Android an overlapping auto view swallows taps meant for
                  // the tab bar underneath instead of letting them fall through.
                  pointerEvents="box-none"
                  style={[
                    styles.sheet,
                    {
                      top: sheetTop,
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
                      expanded={expanded}
                      onExpandPress={openFull}
                      onCollapsePress={collapse}
                    />
                  </View>
                  {/* The body overhangs the tab bar (clipped when peeked). Make
                      it touch-transparent unless FULL, so the tab bar below
                      keeps receiving taps right through a collapse. */}
                  <View
                    testID="session-full-body"
                    pointerEvents={expanded ? 'auto' : 'none'}
                    style={styles.fullBody}
                  >
                    <InSessionScreen onClose={controller.close} />
                  </View>
                </Animated.View>
              </View>
            ) : null}
          </PeekMetaCtx.Provider>
        </PeekPublisherCtx.Provider>
      </InsetCtx.Provider>
    </Ctx.Provider>
  );
}

// -------------------------------------------------------------- peek head --

function PeekContent({
  expanded,
  onExpandPress,
  onCollapsePress,
}: {
  expanded: boolean;
  onExpandPress: () => void;
  onCollapsePress: () => void;
}) {
  const { label, startedAtMs } = useSessionPeekMeta();
  const [elapsedSec, setElapsedSec] = useState(0);

  useEffect(() => {
    if (startedAtMs == null) {
      setElapsedSec(0);
      return;
    }
    const compute = () => Math.max(0, Math.floor((Date.now() - startedAtMs) / 1000));
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
  }, [startedAtMs]);

  return (
    <Pressable
      onPress={expanded ? onCollapsePress : onExpandPress}
      style={styles.peekPressable}
      testID="session-peek"
    >
      <View style={styles.grabber} />
      <XStack alignItems="center" gap={spacing.sm} paddingHorizontal={spacing.md}>
        <View style={styles.dot} />
        <Text style={styles.peekTitle} numberOfLines={1} testID="session-peek-label">
          {label ?? 'Loading…'}
        </Text>
        <Text style={styles.peekTime} testID="session-peek-time">
          {formatMmSs(elapsedSec)}
        </Text>
      </XStack>
    </Pressable>
  );
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
    // Top-anchored: `top` is supplied inline (= top safe-area inset). The sheet
    // spans the full usable height and slides via translateY; see
    // computeSheetLayout for why the endpoints are expansion-independent.
    position: 'absolute',
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
