import { act, fireEvent, render } from '@testing-library/react-native';
import { Keyboard, StyleSheet } from 'react-native';
import { TabBar } from './TabBar';
import type { TabBarProps } from './TabBar';
import { colors } from '../theme';

function flatStyle(node: any): Record<string, any> {
  return StyleSheet.flatten(node.props.style) ?? {};
}

// Fabricates a minimal BottomTabBarProps-shaped object for tests.
// TabBar's public interface *is* BottomTabBarProps, so we drive it exactly
// the way React Navigation would in production.
function makeProps(overrides: Partial<TabBarProps> = {}): TabBarProps {
  const routes = [
    { key: 'Home-1', name: 'Home' },
    { key: 'Drills-1', name: 'Drills' },
    { key: 'Stats-1', name: 'Stats' },
  ];
  const descriptors = Object.fromEntries(
    routes.map((r) => [
      r.key,
      { options: { title: r.name }, route: r, navigation: {} },
    ])
  );
  return {
    state: { index: 0, routes, key: 'tab-1', routeNames: routes.map((r) => r.name) },
    descriptors,
    navigation: {
      emit: jest.fn(() => ({ defaultPrevented: false })),
      navigate: jest.fn(),
    },
    insets: { top: 0, right: 0, bottom: 0, left: 0 },
    onStartPress: jest.fn(),
    ...overrides,
  } as unknown as TabBarProps;
}

describe('TabBar', () => {
  it('renders one label per route in state.routes', async () => {
    const { findByText } = await render(<TabBar {...makeProps()} />);
    expect(await findByText('Home')).toBeTruthy();
    expect(await findByText('Drills')).toBeTruthy();
    expect(await findByText('Stats')).toBeTruthy();
  });

  it('renders an icon glyph alongside every tab label', async () => {
    const { findByTestId } = await render(<TabBar {...makeProps()} />);
    for (const name of ['Home', 'Drills', 'Stats']) {
      expect(await findByTestId(`tab-icon-${name}`)).toBeTruthy();
    }
  });

  it('pressing an inactive tab emits tabPress and navigates to the route', async () => {
    const emit = jest.fn(() => ({ defaultPrevented: false }));
    const navigate = jest.fn();
    const props = makeProps({ navigation: { emit, navigate } as any });
    const { findByTestId } = await render(<TabBar {...props} />);
    fireEvent.press(await findByTestId('tab-touch-Drills'));
    expect(emit).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'tabPress', target: 'Drills-1', canPreventDefault: true })
    );
    expect(navigate).toHaveBeenCalledWith('Drills');
  });

  it('pressing the already-focused tab does not navigate', async () => {
    const emit = jest.fn(() => ({ defaultPrevented: false }));
    const navigate = jest.fn();
    // state.index = 0 → Home is focused
    const props = makeProps({ navigation: { emit, navigate } as any });
    const { findByTestId } = await render(<TabBar {...props} />);
    fireEvent.press(await findByTestId('tab-touch-Home'));
    expect(navigate).not.toHaveBeenCalled();
  });

  it('does not navigate when the tabPress event is default-prevented', async () => {
    const emit = jest.fn(() => ({ defaultPrevented: true }));
    const navigate = jest.fn();
    const props = makeProps({ navigation: { emit, navigate } as any });
    const { findByTestId } = await render(<TabBar {...props} />);
    fireEvent.press(await findByTestId('tab-touch-Drills'));
    expect(navigate).not.toHaveBeenCalled();
  });

  it('hides while the keyboard is visible and returns when it dismisses', async () => {
    // Capture handlers registered via Keyboard.addListener — the public API
    // the component uses. Firing them directly matches how the RN Keyboard
    // dispatcher invokes subscribers in production.
    const handlers: Record<string, ((e: any) => void)[]> = {};
    const spy = jest.spyOn(Keyboard, 'addListener').mockImplementation((event: any, cb: any) => {
      handlers[event] = handlers[event] ?? [];
      handlers[event].push(cb);
      return { remove: () => {
        handlers[event] = (handlers[event] ?? []).filter((h) => h !== cb);
      } } as any;
    });

    try {
      const { findByTestId, queryByTestId } = await render(<TabBar {...makeProps()} />);
      expect(await findByTestId('tab-bar')).toBeTruthy();

      await act(async () => {
        handlers['keyboardDidShow']?.forEach((cb) => cb({}));
      });
      expect(queryByTestId('tab-bar')).toBeNull();

      await act(async () => {
        handlers['keyboardDidHide']?.forEach((cb) => cb({}));
      });
      expect(queryByTestId('tab-bar')).toBeTruthy();
    } finally {
      spy.mockRestore();
    }
  });

  it('reserves the safe-area bottom inset as paddingBottom on the bar', async () => {
    const props = makeProps({ insets: { top: 0, right: 0, bottom: 34, left: 0 } as any });
    const { findByTestId } = await render(<TabBar {...props} />);
    const style = flatStyle(await findByTestId('tab-bar'));
    expect(style.paddingBottom).toBe(34);
  });

  it('every tab exposes a ≥56 dp tap target', async () => {
    const { findByTestId } = await render(<TabBar {...makeProps()} />);
    for (const name of ['Home', 'Drills', 'Stats']) {
      const style = flatStyle(await findByTestId(`tab-touch-${name}`));
      expect(style.minHeight).toBeGreaterThanOrEqual(56);
    }
  });

  it('renders inactive tab labels in textSecondary', async () => {
    // state.index = 0 → Home active, Drills + Stats inactive
    const { findByText } = await render(<TabBar {...makeProps()} />);
    expect(flatStyle(await findByText('Drills')).color).toBe(colors.textSecondary);
    expect(flatStyle(await findByText('Stats')).color).toBe(colors.textSecondary);
  });

  it('renders a centered START slot as a fourth, raised action', async () => {
    // Center action per docs/conventions/navigation-surface.md § Tab-bar center action.
    // Raised circular button, icon-only.
    const { findByTestId } = await render(<TabBar {...makeProps()} />);
    expect(await findByTestId('tab-touch-Start')).toBeTruthy();
  });

  it('renders the START button as a circle (borderRadius = size / 2) with accent-cyan fill', async () => {
    const { findByTestId } = await render(<TabBar {...makeProps()} />);
    const style = flatStyle(await findByTestId('tab-touch-Start'));
    expect(style.backgroundColor).toBe(colors.accent);
    expect(typeof style.width).toBe('number');
    expect(style.height).toBe(style.width);
    expect(style.borderRadius).toBe(style.width / 2);
  });

  it('anchors the START button to protrude 1/3 above the tab bar', async () => {
    const { findByTestId } = await render(<TabBar {...makeProps()} />);
    const buttonStyle = flatStyle(await findByTestId('tab-touch-Start'));
    // The anchor wraps the button. Verify the anchor's top offset is -size/3
    // so the top third of the circle overflows the bar.
    const anchor = (await findByTestId('tab-touch-Start')).parent!;
    const anchorStyle = flatStyle(anchor);
    expect(anchorStyle.top).toBe(-buttonStyle.height / 3);
    expect(anchorStyle.position).toBe('absolute');
    expect(anchorStyle.alignItems).toBe('center');
  });

  it('pressing START calls onStartPress (does not navigate)', async () => {
    const onStartPress = jest.fn();
    const emit = jest.fn(() => ({ defaultPrevented: false }));
    const navigate = jest.fn();
    const props = makeProps({
      navigation: { emit, navigate } as any,
      onStartPress,
    });
    const { findByTestId } = await render(<TabBar {...props} />);
    fireEvent.press(await findByTestId('tab-touch-Start'));
    expect(onStartPress).toHaveBeenCalledTimes(1);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('idle: renders a visible "START" label on the center button with accentCyan fill', async () => {
    // Idle state per docs/conventions/navigation-surface.md § Tab-bar center action.
    const { findByText, findByTestId } = await render(<TabBar {...makeProps()} />);
    expect(await findByText('START')).toBeTruthy();
    expect(flatStyle(await findByTestId('tab-touch-Start')).backgroundColor).toBe(colors.accent);
  });

  it('morphs the center button to RESUME with accentAmber fill when sessionActive', async () => {
    // Active-session state per navigation-surface.md § Tab-bar center action § Active-session state
    // and issue #16: label RESUME, fill accentAmber, text black (AAA).
    const { findByText, findByTestId } = await render(
      <TabBar {...makeProps({ sessionActive: true } as any)} />
    );
    expect(await findByText('RESUME')).toBeTruthy();
    const button = await findByTestId('tab-touch-Start');
    expect(flatStyle(button).backgroundColor).toBe(colors.accentAmber);
    // RESUME text uses onAmber (black) for AAA contrast on amber.
    expect(flatStyle(await findByText('RESUME')).color).toBe(colors.onAmber);
  });

  it('pressing the center button in resume state calls onResumePress, not onStartPress', async () => {
    const onStartPress = jest.fn();
    const onResumePress = jest.fn();
    const { findByTestId } = await render(
      <TabBar {...makeProps({ sessionActive: true, onStartPress, onResumePress } as any)} />
    );
    fireEvent.press(await findByTestId('tab-touch-Start'));
    expect(onResumePress).toHaveBeenCalledTimes(1);
    expect(onStartPress).not.toHaveBeenCalled();
  });

  it('wraps the active tab in an M3 pill: accentCyan fill + onAccent label', async () => {
    // state.index = 1 → Drills is active
    const { findByTestId, findByText } = await render(
      <TabBar {...makeProps({ state: {
        index: 1,
        routes: [
          { key: 'Home-1', name: 'Home' },
          { key: 'Drills-1', name: 'Drills' },
          { key: 'Stats-1', name: 'Stats' },
        ],
        key: 'tab-1',
        routeNames: ['Home', 'Drills', 'Stats'],
      } as any })} />
    );
    const activePill = await findByTestId('tab-pill-Drills');
    expect(flatStyle(activePill).backgroundColor).toBe(colors.accent);
    expect(flatStyle(await findByText('Drills')).color).toBe(colors.onAccent);
  });
});
