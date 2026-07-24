// Tests for the entry-mode redesign (issue #25):
//   Reps, accuracy, and duration modes each render on a `surface` hero card
//   with `surfaceHi` border enclosing a `heroDigits`-tier readout, a 10 dp
//   `surfaceHi` progress track under the digits when a target exists, and
//   stat chips below. Primary action fill follows the state-driven accent
//   rule from docs/conventions/aesthetic-direction.md § State-driven accent:
//     < 90 %  → cyan     (on-track)
//     90–100 % → amber   (approaching)
//     ≥ 100 % → magenta  (over)
//
// Split out from InSessionScreen.test.tsx so the module-scoped RN AppState /
// keep-awake / timer mocks from the timer suite don't leak into these
// re-render-heavy assertions.
import { fireEvent, render } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { TamaguiProvider } from 'tamagui';
import tamaguiConfig from '../../tamagui.config';
import { colors } from '../theme';
import type { Drill } from '../use-cases/drills';
import { listDrills } from '../use-cases/drills';
import { getRoutine } from '../use-cases/routines';
import type { DrillEntry, Session } from '../use-cases/sessions';
import { endSession, getActiveSession, logEntry } from '../use-cases/sessions';
import { InSessionScreen } from './InSessionScreen';

jest.mock('../use-cases/drills', () => ({
  listDrills: jest.fn(),
}));
jest.mock('../use-cases/routines', () => ({
  getRoutine: jest.fn(),
}));
jest.mock('../use-cases/sessions', () => ({
  getActiveSession: jest.fn(),
  logEntry: jest.fn(),
  endSession: jest.fn(),
}));
jest.mock('../db/client', () => ({
  getAppDb: jest.fn(() => null),
}));
jest.mock('expo-keep-awake', () => ({
  activateKeepAwakeAsync: jest.fn(() => Promise.resolve()),
  deactivateKeepAwake: jest.fn(),
}));

const mockListDrills = listDrills as jest.MockedFunction<typeof listDrills>;
const mockGetActiveSession = getActiveSession as jest.MockedFunction<typeof getActiveSession>;
const mockLogEntry = logEntry as jest.MockedFunction<typeof logEntry>;
const mockGetRoutine = getRoutine as jest.MockedFunction<typeof getRoutine>;
const mockEndSession = endSession as jest.MockedFunction<typeof endSession>;

const NOW = '2026-07-09T12:00:00.000Z';

function makeDrill(over: Partial<Drill>): Drill {
  return {
    id: over.id ?? 'id',
    name: over.name ?? 'Drill',
    category: over.category ?? 'wall',
    metric: over.metric ?? 'reps',
    target: over.target ?? null,
    notes: over.notes ?? null,
    createdAt: NOW,
    updatedAt: NOW,
    deletedAt: null,
  };
}

function makeSession(over: Partial<Session> = {}): Session {
  return {
    id: over.id ?? 'session-1',
    startedAt: over.startedAt ?? NOW,
    endedAt: over.endedAt ?? null,
    routineId: over.routineId ?? null,
    notes: over.notes ?? null,
    createdAt: NOW,
    updatedAt: NOW,
    deletedAt: null,
  };
}

function makeEntry(over: Partial<DrillEntry> = {}): DrillEntry {
  return {
    id: over.id ?? 'entry-1',
    sessionId: over.sessionId ?? 'session-1',
    drillId: over.drillId ?? 'drill-1',
    value: over.value ?? 0,
    attempted: over.attempted ?? null,
    notes: over.notes ?? null,
    performedAt: over.performedAt ?? NOW,
    createdAt: NOW,
    updatedAt: NOW,
    deletedAt: null,
  };
}

function flatStyle(node: any): Record<string, any> {
  return StyleSheet.flatten(node.props.style) ?? {};
}

// Tamagui expands `borderColor` into per-side border colors on RN, so this
// helper picks whichever side is populated (they're identical when
// `borderColor` is set uniformly).
function borderColorOf(style: Record<string, any>): string | undefined {
  return (
    style.borderColor ??
    style.borderTopColor ??
    style.borderRightColor ??
    style.borderBottomColor ??
    style.borderLeftColor
  );
}

async function renderScreen() {
  const navigation = { goBack: jest.fn(), navigate: jest.fn() } as any;
  const route = { key: 'k', name: 'InSession' } as any;
  return render(
    <TamaguiProvider config={tamaguiConfig} defaultTheme="kabe_dark">
      <InSessionScreen navigation={navigation} route={route} />
    </TamaguiProvider>
  );
}

beforeEach(() => {
  mockListDrills.mockReset();
  mockGetActiveSession.mockReset();
  mockLogEntry.mockReset();
  mockGetRoutine.mockReset();
  mockEndSession.mockReset();
  mockGetActiveSession.mockResolvedValue({ session: makeSession(), entries: [] });
  mockLogEntry.mockResolvedValue(makeEntry());
  mockGetRoutine.mockResolvedValue(null);
});

describe('InSessionScreen — reps mode hero panel', () => {
  it('renders the readout on a hero panel: surface bg, surfaceHi border', async () => {
    const drill = makeDrill({ id: 'reps-h', name: 'Wall hit', metric: 'reps', target: 20 });
    mockListDrills.mockResolvedValue([drill]);

    const { findByTestId } = await renderScreen();
    fireEvent.press(await findByTestId('pick-drill-reps-h'));

    const hero = await findByTestId('entry-hero-panel');
    const s = flatStyle(hero);
    expect(s.backgroundColor).toBe(colors.surface);
    expect(borderColorOf(s)).toBe(colors.surfaceHi);
    expect(s.borderWidth).toBeGreaterThanOrEqual(1);
  });

  it('renders the rep count as heroDigits-tier readout with tabular-nums', async () => {
    // typography.heroDigits is 112 sp / 800 weight per docs/conventions/aesthetic-direction.md § Type-scale.
    const drill = makeDrill({ id: 'reps-d', name: 'Wall hit', metric: 'reps', target: 20 });
    mockListDrills.mockResolvedValue([drill]);

    const { findByTestId } = await renderScreen();
    fireEvent.press(await findByTestId('pick-drill-reps-d'));

    const readout = await findByTestId('reps-hero-readout');
    const s = flatStyle(readout);
    expect(s.fontSize).toBeGreaterThanOrEqual(100);
    expect(s.fontWeight).toBe('800');
    expect(s.fontVariant).toEqual(expect.arrayContaining(['tabular-nums']));
  });

  it('renders a 10 dp surfaceHi progress track when a target exists', async () => {
    // docs/conventions/aesthetic-direction.md § HUD conventions: 10 dp height,
    // `surfaceHi` background, filled with the current state accent.
    const drill = makeDrill({ id: 'reps-p', name: 'Wall hit', metric: 'reps', target: 20 });
    mockListDrills.mockResolvedValue([drill]);

    const { findByTestId } = await renderScreen();
    fireEvent.press(await findByTestId('pick-drill-reps-p'));

    const track = await findByTestId('entry-progress-track');
    const s = flatStyle(track);
    expect(s.height).toBe(10);
    expect(s.backgroundColor).toBe(colors.surfaceHi);
  });

  it('does not render a progress track when the drill has no target', async () => {
    const drill = makeDrill({ id: 'reps-nt', name: 'Wall hit', metric: 'reps', target: null });
    mockListDrills.mockResolvedValue([drill]);

    const { findByTestId, queryByTestId } = await renderScreen();
    fireEvent.press(await findByTestId('pick-drill-reps-nt'));
    // The hero panel still renders; only the progress track is gated by target.
    await findByTestId('entry-hero-panel');
    expect(queryByTestId('entry-progress-track')).toBeNull();
  });

  it('renders target and remaining stat chips below the hero when a target exists', async () => {
    // docs/conventions/aesthetic-direction.md § HUD conventions: stat chips
    // (target / remaining) sit below the hero panel on the same `surface`
    // combo. For reps the values are just integers.
    const drill = makeDrill({ id: 'reps-c', name: 'Wall hit', metric: 'reps', target: 20 });
    mockListDrills.mockResolvedValue([drill]);

    const { findByTestId, findByText } = await renderScreen();
    fireEvent.press(await findByTestId('pick-drill-reps-c'));

    // default draft.value is String(target) = "20", so remaining is 0.
    expect(await findByText('TARGET')).toBeTruthy();
    expect(await findByText('REMAINING')).toBeTruthy();
  });

  it('primary button fill follows the state-driven accent (magenta at ≥100 %) with black text', async () => {
    // docs/conventions/aesthetic-direction.md § State-driven accent:
    // ≥ 100 % of target → magenta. Default draft.value is String(target), so
    // opening a reps drill with target 20 shows 20 reps → 100 % → magenta.
    // § Locked palette: `onAccent` (#000) is the AAA text on all three accents.
    const drill = makeDrill({ id: 'reps-b', name: 'Wall hit', metric: 'reps', target: 20 });
    mockListDrills.mockResolvedValue([drill]);

    const { findByTestId, findByText } = await renderScreen();
    fireEvent.press(await findByTestId('pick-drill-reps-b'));

    const saveButton = await findByText('Save');
    // The parent Pressable carries the background style.
    const buttonRoot = saveButton.parent;
    const bgStyle = flatStyle(buttonRoot);
    expect(bgStyle.backgroundColor).toBe(colors.accentMagenta);
    // Text is black on the accent.
    expect(flatStyle(saveButton).color).toBe(colors.onAccent);
  });

  it('primary button fill is amber when count is in the 90–100 % approaching band', async () => {
    // 18 / 20 = 90 % → amber per docs/conventions/aesthetic-direction.md § State-driven accent.
    const drill = makeDrill({ id: 'reps-a', name: 'Wall hit', metric: 'reps', target: 20 });
    mockListDrills.mockResolvedValue([drill]);

    const { findByTestId, findByText, findByLabelText } = await renderScreen();
    fireEvent.press(await findByTestId('pick-drill-reps-a'));
    fireEvent.changeText(await findByLabelText('reps-input'), '18');

    const buttonRoot = (await findByText('Save')).parent;
    expect(flatStyle(buttonRoot).backgroundColor).toBe(colors.accentAmber);
  });

  it('primary button fill is cyan when count is under 90 % of the target', async () => {
    // 5 / 20 = 25 % → cyan per docs/conventions/aesthetic-direction.md § State-driven accent.
    const drill = makeDrill({ id: 'reps-y', name: 'Wall hit', metric: 'reps', target: 20 });
    mockListDrills.mockResolvedValue([drill]);

    const { findByTestId, findByText, findByLabelText } = await renderScreen();
    fireEvent.press(await findByTestId('pick-drill-reps-y'));
    fireEvent.changeText(await findByLabelText('reps-input'), '5');

    const buttonRoot = (await findByText('Save')).parent;
    expect(flatStyle(buttonRoot).backgroundColor).toBe(colors.accent);
  });

  it('target-label value text is at least 24 sp', async () => {
    // docs/conventions/aesthetic-direction.md ticket #25: target-label text
    // rises to ≥ 24 sp on every entry mode. The value in the TARGET stat
    // chip is the surface that renders the target.
    const drill = makeDrill({ id: 'reps-t', name: 'Wall hit', metric: 'reps', target: 20 });
    mockListDrills.mockResolvedValue([drill]);

    const { findByTestId, findByText } = await renderScreen();
    fireEvent.press(await findByTestId('pick-drill-reps-t'));

    const targetValue = await findByText('20');
    expect(flatStyle(targetValue).fontSize).toBeGreaterThanOrEqual(24);
  });
});

describe('InSessionScreen — accuracy mode hero panel', () => {
  it('renders the readout on a hero panel: surface bg, surfaceHi border', async () => {
    const drill = makeDrill({ id: 'acc-h', name: 'Serve', metric: 'accuracy', target: 10 });
    mockListDrills.mockResolvedValue([drill]);

    const { findByTestId } = await renderScreen();
    fireEvent.press(await findByTestId('pick-drill-acc-h'));

    const hero = await findByTestId('entry-hero-panel');
    const s = flatStyle(hero);
    expect(s.backgroundColor).toBe(colors.surface);
    expect(borderColorOf(s)).toBe(colors.surfaceHi);
    expect(s.borderWidth).toBeGreaterThanOrEqual(1);
  });

  it('renders the accuracy percent as heroDigits-tier readout with tabular-nums', async () => {
    // 0 successes out of 10 attempted = 0 % on load.
    const drill = makeDrill({ id: 'acc-d', name: 'Serve', metric: 'accuracy', target: 10 });
    mockListDrills.mockResolvedValue([drill]);

    const { findByTestId } = await renderScreen();
    fireEvent.press(await findByTestId('pick-drill-acc-d'));

    const readout = await findByTestId('accuracy-hero-readout');
    const s = flatStyle(readout);
    expect(s.fontSize).toBeGreaterThanOrEqual(100);
    expect(s.fontWeight).toBe('800');
    expect(s.fontVariant).toEqual(expect.arrayContaining(['tabular-nums']));
  });

  it('renders a 10 dp surfaceHi progress track when a target exists', async () => {
    const drill = makeDrill({ id: 'acc-p', name: 'Serve', metric: 'accuracy', target: 10 });
    mockListDrills.mockResolvedValue([drill]);

    const { findByTestId } = await renderScreen();
    fireEvent.press(await findByTestId('pick-drill-acc-p'));

    const track = await findByTestId('entry-progress-track');
    const s = flatStyle(track);
    expect(s.height).toBe(10);
    expect(s.backgroundColor).toBe(colors.surfaceHi);
  });

  it('does not render a progress track when the drill has no target', async () => {
    const drill = makeDrill({ id: 'acc-nt', name: 'Serve', metric: 'accuracy', target: null });
    mockListDrills.mockResolvedValue([drill]);

    const { findByTestId, queryByTestId } = await renderScreen();
    fireEvent.press(await findByTestId('pick-drill-acc-nt'));
    await findByTestId('entry-hero-panel');
    expect(queryByTestId('entry-progress-track')).toBeNull();
  });

  it('renders target and remaining stat chips below the hero when a target exists', async () => {
    const drill = makeDrill({ id: 'acc-c', name: 'Serve', metric: 'accuracy', target: 10 });
    mockListDrills.mockResolvedValue([drill]);

    const { findByTestId, findByText } = await renderScreen();
    fireEvent.press(await findByTestId('pick-drill-acc-c'));

    expect(await findByText('TARGET')).toBeTruthy();
    expect(await findByText('REMAINING')).toBeTruthy();
  });

  it('primary button fill follows the state-driven accent with black text', async () => {
    // 9 / 10 = 90 % → amber per docs/conventions/aesthetic-direction.md § State-driven accent.
    const drill = makeDrill({ id: 'acc-b', name: 'Serve', metric: 'accuracy', target: 10 });
    mockListDrills.mockResolvedValue([drill]);

    const { findByTestId, findByText, findByLabelText } = await renderScreen();
    fireEvent.press(await findByTestId('pick-drill-acc-b'));
    fireEvent.changeText(await findByLabelText('accuracy-value-input'), '9');

    const saveButton = await findByText('Save');
    const buttonRoot = saveButton.parent;
    expect(flatStyle(buttonRoot).backgroundColor).toBe(colors.accentAmber);
    expect(flatStyle(saveButton).color).toBe(colors.onAccent);
  });

  it('target-label value text is at least 24 sp', async () => {
    const drill = makeDrill({ id: 'acc-t', name: 'Serve', metric: 'accuracy', target: 10 });
    mockListDrills.mockResolvedValue([drill]);

    const { findByTestId, findByText } = await renderScreen();
    fireEvent.press(await findByTestId('pick-drill-acc-t'));

    const targetValue = await findByText('10');
    expect(flatStyle(targetValue).fontSize).toBeGreaterThanOrEqual(24);
  });
});
