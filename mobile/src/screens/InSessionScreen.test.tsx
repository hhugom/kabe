// RN Modal is proven in ModalLayout.test.tsx; here we render children inline
// when `visible` is true so modal actions (unfilled-slots, switch-timer,
// delete-slot) become queryable. Also capture onRequestClose so tests can
// simulate hardware back on Android.
const modalProps: any[] = [];
jest.mock('react-native/Libraries/Modal/Modal', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: function MockModal(props: any) {
      modalProps.push(props);
      return props.visible ? React.createElement(React.Fragment, null, props.children) : null;
    },
  };
});

import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react-native';
import { AppState } from 'react-native';
import { TamaguiProvider } from 'tamagui';
import tamaguiConfig from '../../tamagui.config';
import { colors } from '../theme';
import type { Drill } from '../use-cases/drills';
import { listDrills } from '../use-cases/drills';
import { getRoutine } from '../use-cases/routines';
import type { DrillEntry, Session } from '../use-cases/sessions';
import {
  deleteEntry,
  endSession,
  getActiveSession,
  logEntry,
  updateEntry,
} from '../use-cases/sessions';
import { InSessionScreen } from './InSessionScreen';

// Tamagui Sheet is proven in SheetLayout tests; here we render children inline
// when `open` is true so SessionMenuSheet + EditEntrySheet content becomes queryable.
jest.mock('tamagui', () => {
  const actual = jest.requireActual('tamagui');
  function MockSheet(props: any) {
    return props.open ? props.children : null;
  }
  MockSheet.Overlay = (_: any) => null;
  MockSheet.Handle = (_: any) => null;
  MockSheet.Frame = ({ children }: any) => children;
  return { ...actual, Sheet: MockSheet };
});

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
  updateEntry: jest.fn(),
  deleteEntry: jest.fn(),
}));
jest.mock('../db/client', () => ({
  getAppDb: jest.fn(() => null),
}));
jest.mock('expo-keep-awake', () => ({
  activateKeepAwakeAsync: jest.fn(() => Promise.resolve()),
  deactivateKeepAwake: jest.fn(),
}));

// Stand in for the AddADrillSheet — its own contract lives in AddADrillSheet.test.tsx.
// Here we only care that InSessionScreen wires it up (open state + onPick handler).
const mockAddADrillSheetProps: any[] = [];
jest.mock('../components/AddADrillSheet', () => {
  const React = require('react');
  const { Pressable, Text } = require('react-native');
  return {
    AddADrillSheet: (props: any) => {
      mockAddADrillSheetProps.push(props);
      if (!props.open) return null;
      return React.createElement(
        React.Fragment,
        null,
        (props.drills as Array<{ id: string; name: string }>).map((d) =>
          React.createElement(
            Pressable,
            {
              key: d.id,
              testID: `add-a-drill-row-${d.id}`,
              onPress: () => props.onPick(d),
            },
            React.createElement(Text, null, d.name)
          )
        )
      );
    },
  };
});

import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
const mockActivateKeepAwake = activateKeepAwakeAsync as jest.MockedFunction<
  typeof activateKeepAwakeAsync
>;
const mockDeactivateKeepAwake = deactivateKeepAwake as jest.MockedFunction<
  typeof deactivateKeepAwake
>;

const mockListDrills = listDrills as jest.MockedFunction<typeof listDrills>;
const mockGetActiveSession = getActiveSession as jest.MockedFunction<typeof getActiveSession>;
const mockLogEntry = logEntry as jest.MockedFunction<typeof logEntry>;
const mockGetRoutine = getRoutine as jest.MockedFunction<typeof getRoutine>;
const mockEndSession = endSession as jest.MockedFunction<typeof endSession>;
const mockUpdateEntry = updateEntry as jest.MockedFunction<typeof updateEntry>;
const mockDeleteEntry = deleteEntry as jest.MockedFunction<typeof deleteEntry>;

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

// InSession's onClose is the sheet controller's `close` (session-ended
// signal). Tests spy on it to assert the "end session" path fired.
let onCloseSpy: jest.Mock;

async function renderScreen(opts: { clock?: () => Date } = {}) {
  onCloseSpy = jest.fn();
  let result: ReturnType<typeof render>;
  await act(async () => {
    result = render(
      <TamaguiProvider config={tamaguiConfig} defaultTheme="kabe_dark">
        <InSessionScreen clock={opts.clock} onClose={onCloseSpy} />
      </TamaguiProvider>
    );
  });
  return result!;
}

// Explicit cleanup after every test in the file — without this, React 19's
// batching leaves the previous test's tree mounted long enough that the next
// test's InSessionScreen sees stale state and renders empty.
afterEach(() => {
  cleanup();
});

// Common test fixtures — routine with N planned sets of a single drill.
function seedRoutine({
  plannedSets = 3 as number | null,
  drillTarget = null as number | null,
  drillMetric = 'reps' as Drill['metric'],
  entries = [] as DrillEntry[],
  itemId = 'ri-1',
  drillId = 'd-1',
  drillName = 'Wall rally',
} = {}) {
  const drill = makeDrill({
    id: drillId,
    name: drillName,
    metric: drillMetric,
    target: drillTarget,
  });
  mockListDrills.mockResolvedValue([drill]);
  mockGetActiveSession.mockResolvedValue({
    session: makeSession({ id: 'session-1', routineId: 'r-1' }),
    entries,
  });
  mockGetRoutine.mockResolvedValue({
    routine: { id: 'r-1', name: 'R', createdAt: NOW, updatedAt: NOW, deletedAt: null } as any,
    items: [
      {
        id: itemId,
        routineId: 'r-1',
        drillId,
        plannedSets,
        position: 0,
        createdAt: NOW,
        updatedAt: NOW,
        deletedAt: null,
      } as any,
    ],
  });
  return drill;
}

function resetMocks() {
  mockListDrills.mockReset();
  mockGetActiveSession.mockReset();
  mockLogEntry.mockReset();
  mockGetRoutine.mockReset();
  mockEndSession.mockReset();
  mockUpdateEntry.mockReset();
  mockUpdateEntry.mockResolvedValue(undefined as any);
  mockDeleteEntry.mockReset();
  mockDeleteEntry.mockResolvedValue(undefined as any);
  mockActivateKeepAwake.mockReset();
  mockActivateKeepAwake.mockResolvedValue(undefined);
  mockDeactivateKeepAwake.mockReset();
  mockGetActiveSession.mockResolvedValue({ session: makeSession(), entries: [] });
  mockLogEntry.mockResolvedValue(makeEntry());
  mockGetRoutine.mockResolvedValue(null);
  mockEndSession.mockResolvedValue(undefined as any);
  mockAddADrillSheetProps.length = 0;
  modalProps.length = 0;
}

describe('InSessionScreen — hydration + auto-focus', () => {
  beforeEach(resetMocks);

  it('signals close (session-ended) when no session is active', async () => {
    mockGetActiveSession.mockResolvedValue(null);
    mockListDrills.mockResolvedValue([]);

    await renderScreen();
    await act(async () => {});

    expect(onCloseSpy).toHaveBeenCalled();
  });

  it('auto-focuses the first unfilled planned slot on hydrate', async () => {
    seedRoutine({ plannedSets: 3, drillMetric: 'reps' });

    const { findByTestId } = await renderScreen();

    expect(await findByTestId('focus-hero')).toBeTruthy();
    expect(await findByTestId('reps-hero-readout')).toBeTruthy();
  });

  it('renders the empty hero when the session has neither planned nor ad-hoc entries', async () => {
    mockGetActiveSession.mockResolvedValue({ session: makeSession(), entries: [] });
    mockGetRoutine.mockResolvedValue(null);
    mockListDrills.mockResolvedValue([]);

    const { findByTestId } = await renderScreen();

    expect(await findByTestId('empty-hero')).toBeTruthy();
  });
});

describe('InSessionScreen — duration timer, wake-lock, and app-state resume', () => {
  beforeEach(resetMocks);

  it('duration Start → Stop persists elapsed seconds via logEntry', async () => {
    seedRoutine({ plannedSets: 1, drillMetric: 'duration', drillId: 'dur-1' });

    let ticks = 0;
    const t0 = Date.parse(NOW);
    const clock = () => new Date(t0 + ticks);

    const { findByLabelText } = await renderScreen({ clock });

    fireEvent.press(await findByLabelText('Start'));
    ticks = 600_000;
    fireEvent.press(await findByLabelText('Stop'));

    await waitFor(() => expect(mockLogEntry).toHaveBeenCalled());
    expect(mockLogEntry.mock.calls[0][1]).toEqual(
      expect.objectContaining({
        sessionId: 'session-1',
        drillId: 'dur-1',
        value: 600,
      })
    );
    expect(mockLogEntry.mock.calls[0][1].attempted ?? null).toBeNull();
  });

  it('displayed elapsed at Stop agrees with wall-clock difference between Start and Stop', async () => {
    seedRoutine({ plannedSets: 1, drillMetric: 'duration', drillId: 'dur-disp' });

    let ticks = 0;
    const t0 = Date.parse(NOW);
    const clock = () => new Date(t0 + ticks);

    const { findByText, findByLabelText } = await renderScreen({ clock });

    fireEvent.press(await findByLabelText('Start'));
    ticks = 187_000;
    expect(await findByText('3:07')).toBeTruthy();

    fireEvent.press(await findByLabelText('Stop'));
    await waitFor(() => expect(mockLogEntry).toHaveBeenCalled());
    expect(mockLogEntry.mock.calls[0][1].value).toBe(187);
  });

  it('duration timer shows the drill target as a stat chip', async () => {
    seedRoutine({
      plannedSets: 1,
      drillMetric: 'duration',
      drillId: 'dur-t',
      drillTarget: 600,
    });

    const { findByTestId } = await renderScreen();

    const targetChip = await findByTestId('duration-target-chip-value');
    expect(JSON.stringify(targetChip.props)).toMatch(/10:00/);
  });

  it('duration timer with no target does not render the progress track or stat chips', async () => {
    seedRoutine({
      plannedSets: 1,
      drillMetric: 'duration',
      drillId: 'dur-nt',
      drillTarget: null,
    });

    const { findByLabelText, queryByTestId } = await renderScreen();
    await findByLabelText('Start');

    expect(queryByTestId('duration-progress-track')).toBeNull();
    expect(queryByTestId('duration-target-chip-value')).toBeNull();
  });

  it('activates keep-awake only while the timer is running', async () => {
    seedRoutine({ plannedSets: 1, drillMetric: 'duration', drillId: 'dur-k' });

    let ticks = 0;
    const clock = () => new Date(Date.parse(NOW) + ticks);

    const { findByLabelText } = await renderScreen({ clock });

    expect(mockActivateKeepAwake).not.toHaveBeenCalled();

    fireEvent.press(await findByLabelText('Start'));
    expect(mockActivateKeepAwake).toHaveBeenCalledTimes(1);
    expect(mockDeactivateKeepAwake).not.toHaveBeenCalled();

    ticks = 5000;
    fireEvent.press(await findByLabelText('Stop'));
    expect(mockDeactivateKeepAwake).toHaveBeenCalledTimes(1);
  });

  it('recomputes elapsed from startedAt when the app returns to foreground', async () => {
    seedRoutine({ plannedSets: 1, drillMetric: 'duration', drillId: 'dur-fg' });

    let ticks = 0;
    const clock = () => new Date(Date.parse(NOW) + ticks);

    const listeners: Array<(state: string) => void> = [];
    const addListenerSpy = jest.spyOn(AppState, 'addEventListener').mockImplementation(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ((event: string, cb: (state: string) => void) => {
        if (event === 'change') listeners.push(cb);
        return { remove: jest.fn() } as any;
      }) as any
    );

    try {
      const { findByText, findByLabelText } = await renderScreen({ clock });
      fireEvent.press(await findByLabelText('Start'));

      ticks = 30_000;
      act(() => {
        listeners.forEach((l) => l('active'));
      });

      expect(await findByText('0:30')).toBeTruthy();
    } finally {
      addListenerSpy.mockRestore();
    }
  });
});

describe('InSessionScreen — add-a-drill from the up-next strip', () => {
  beforeEach(resetMocks);

  it('the "Add drill" chip in the up-next strip opens the AddADrillSheet', async () => {
    seedRoutine({ plannedSets: 1, drillMetric: 'reps', drillId: 'w1', drillName: 'Wall rally' });

    const { findByTestId } = await renderScreen();
    await findByTestId('focus-hero');

    await act(async () => {
      fireEvent.press(await findByTestId('up-next-add-drill'));
    });

    expect(await findByTestId('add-a-drill-row-w1')).toBeTruthy();

    const props = mockAddADrillSheetProps[mockAddADrillSheetProps.length - 1];
    expect(props.open).toBe(true);
  });

  it('the empty-hero "Add a drill" button also opens the AddADrillSheet', async () => {
    const drill = makeDrill({ id: 'w1', name: 'Wall rally' });
    mockListDrills.mockResolvedValue([drill]);
    mockGetActiveSession.mockResolvedValue({ session: makeSession(), entries: [] });
    mockGetRoutine.mockResolvedValue(null);

    const { findByText, findByTestId } = await renderScreen();
    await findByTestId('empty-hero');

    fireEvent.press(await findByText('Add a drill'));

    expect(await findByTestId('add-a-drill-row-w1')).toBeTruthy();
  });

  it('picking a drill from the sheet enters that drill\'s inline entry mode', async () => {
    const drill = makeDrill({ id: 'w1', name: 'Wall rally', metric: 'reps' });
    mockListDrills.mockResolvedValue([drill]);
    mockGetActiveSession.mockResolvedValue({ session: makeSession(), entries: [] });
    mockGetRoutine.mockResolvedValue(null);

    const { findByText, findByTestId, findByLabelText } = await renderScreen();
    await findByTestId('empty-hero');

    fireEvent.press(await findByText('Add a drill'));
    fireEvent.press(await findByTestId('add-a-drill-row-w1'));

    expect(await findByLabelText('reps-input')).toBeTruthy();
    expect(await findByTestId('focus-hero')).toBeTruthy();
  });
});

describe('InSessionScreen — fused planned-slot list and up-next', () => {
  beforeEach(resetMocks);

  it('tapping an up-next chip shifts focus to that slot', async () => {
    seedRoutine({
      plannedSets: 2,
      drillMetric: 'reps',
      drillTarget: 50,
    });

    const { findByTestId, findByLabelText, queryByTestId } = await renderScreen();
    await findByTestId('up-next-ri-1-1');

    await act(async () => {
      fireEvent.press(await findByTestId('up-next-ri-1-1'));
    });

    expect(await findByLabelText('reps-input')).toBeTruthy();
    expect(queryByTestId('up-next-ri-1-1')).toBeNull();
    expect(await findByTestId('up-next-ri-1-0')).toBeTruthy();
  });

  it('saving an entry auto-advances focus to the next unfilled slot', async () => {
    seedRoutine({ plannedSets: 2, drillMetric: 'reps', drillTarget: 50 });

    mockGetActiveSession
      .mockResolvedValueOnce({
        session: makeSession({ id: 'session-1', routineId: 'r-1' }),
        entries: [],
      })
      .mockResolvedValue({
        session: makeSession({ id: 'session-1', routineId: 'r-1' }),
        entries: [makeEntry({ id: 'e-new', drillId: 'd-1', value: 50 })],
      });

    const { findByTestId, findByLabelText } = await renderScreen();
    await findByTestId('focus-hero');
    await findByTestId('up-next-ri-1-1');

    await act(async () => {
      fireEvent.press(await findByLabelText('Save'));
      await new Promise((res) => setImmediate(res));
    });

    expect(mockLogEntry).toHaveBeenCalledWith(
      null,
      expect.objectContaining({ sessionId: 'session-1', drillId: 'd-1', value: 50 })
    );

    await waitFor(async () => {
      expect(await findByTestId('done-planned-ri-1-0')).toBeTruthy();
    });
  });

  it('tapping a done row opens the edit sheet for that entry', async () => {
    seedRoutine({
      plannedSets: 2,
      drillMetric: 'reps',
      entries: [makeEntry({ id: 'e-1', drillId: 'd-1', value: 42 })],
    });

    const { findByTestId, findByLabelText } = await renderScreen();
    await findByTestId('done-planned-ri-1-0');

    await act(async () => {
      fireEvent.press(await findByTestId('done-planned-ri-1-0'));
    });

    const input = await findByLabelText('edit-value-input');
    expect(input.props.value).toBe('42');
  });

  it('the edit sheet Save button updates the entry in place (updateEntry, not logEntry)', async () => {
    seedRoutine({
      plannedSets: 1,
      drillMetric: 'reps',
      entries: [makeEntry({ id: 'e-1', drillId: 'd-1', value: 42 })],
    });

    const { findByTestId, findByLabelText } = await renderScreen();
    await findByTestId('done-planned-ri-1-0');

    await act(async () => {
      fireEvent.press(await findByTestId('done-planned-ri-1-0'));
    });

    const input = await findByLabelText('edit-value-input');
    await act(async () => {
      fireEvent.changeText(input, '99');
    });

    await act(async () => {
      fireEvent.press(await findByTestId('edit-save'));
      await new Promise((res) => setImmediate(res));
    });

    expect(mockLogEntry).not.toHaveBeenCalled();
    expect(mockUpdateEntry).toHaveBeenCalledWith(
      null,
      'e-1',
      expect.objectContaining({ value: 99 })
    );
  });

  it('the edit sheet Remove button asks for confirmation before deleting', async () => {
    seedRoutine({
      plannedSets: 1,
      drillMetric: 'reps',
      entries: [makeEntry({ id: 'e-1', drillId: 'd-1', value: 42 })],
    });

    const { findByTestId, queryByTestId } = await renderScreen();
    await findByTestId('done-planned-ri-1-0');

    await act(async () => {
      fireEvent.press(await findByTestId('done-planned-ri-1-0'));
    });

    await act(async () => {
      fireEvent.press(await findByTestId('edit-remove'));
    });

    // Tapping "Remove" arms the DeleteSlotConfirm modal; no delete yet.
    expect(mockDeleteEntry).not.toHaveBeenCalled();
    expect(await findByTestId('delete-slot-confirm')).toBeTruthy();

    // Cancel the confirm — entry is still there.
    await act(async () => {
      fireEvent.press(await findByTestId('delete-slot-cancel'));
    });
    expect(mockDeleteEntry).not.toHaveBeenCalled();
    expect(queryByTestId('delete-slot-confirm')).toBeNull();

    // Re-open, confirm — now delete fires.
    await act(async () => {
      fireEvent.press(await findByTestId('done-planned-ri-1-0'));
    });
    await act(async () => {
      fireEvent.press(await findByTestId('edit-remove'));
    });
    await act(async () => {
      fireEvent.press(await findByTestId('delete-slot-confirm'));
      await new Promise((res) => setImmediate(res));
    });
    expect(mockDeleteEntry).toHaveBeenCalledWith(null, 'e-1', expect.anything());
  });

  it('ad-hoc entries render in the AD-HOC section with distinct testIDs', async () => {
    const routineDrill = makeDrill({ id: 'd-1', name: 'Wall rally' });
    const unplanned = makeDrill({ id: 'd-2', name: 'Slice serve' });
    mockListDrills.mockResolvedValue([routineDrill, unplanned]);
    mockGetActiveSession.mockResolvedValue({
      session: makeSession({ id: 'session-1', routineId: 'r-1' }),
      entries: [
        makeEntry({ id: 'e-1', drillId: 'd-1', value: 7 }),
        makeEntry({ id: 'e-2', drillId: 'd-2', value: 33 }),
      ],
    });
    mockGetRoutine.mockResolvedValue({
      routine: { id: 'r-1', name: 'R', createdAt: NOW, updatedAt: NOW, deletedAt: null } as any,
      items: [
        {
          id: 'ri-1',
          routineId: 'r-1',
          drillId: 'd-1',
          plannedSets: 1,
          position: 0,
          createdAt: NOW,
          updatedAt: NOW,
          deletedAt: null,
        } as any,
      ],
    });

    const { findByTestId, findByText } = await renderScreen();

    expect(await findByTestId('done-planned-ri-1-0')).toBeTruthy();
    expect(await findByTestId('done-adhoc-e-2')).toBeTruthy();
    // Labeled section headers per primary-vs-annex.md § InSession fusion detail.
    expect(await findByText('DONE — PLANNED')).toBeTruthy();
    expect(await findByText('AD-HOC')).toBeTruthy();
  });

  it('filled slot displays the logged reps value in tabular-nums', async () => {
    seedRoutine({
      plannedSets: 2,
      drillMetric: 'reps',
      entries: [makeEntry({ id: 'e-1', drillId: 'd-1', value: 42 })],
    });

    const { findByTestId } = await renderScreen();

    const value = await findByTestId('done-planned-ri-1-0-value');
    expect(value).toBeTruthy();
    const flat = JSON.stringify(value.props);
    expect(flat).toMatch(/42/);
    const flatFonts = JSON.stringify(value.props.style);
    expect(flatFonts).toMatch(/tabular-nums/);
  });
});

function resolveButtonBackground(pressable: any): string | undefined {
  const raw =
    typeof pressable.props.style === 'function'
      ? pressable.props.style({ pressed: false })
      : pressable.props.style;
  const merged = Object.assign({}, ...[].concat(raw).flat().filter(Boolean));
  return merged.backgroundColor;
}

describe('InSessionScreen — state-driven accent on primary action (issue #25)', () => {
  beforeEach(resetMocks);

  it('reps mode hero shows the draft value and updates as the user edits it', async () => {
    seedRoutine({ plannedSets: 1, drillMetric: 'reps', drillId: 'd-1', drillTarget: 50 });

    const { findByTestId, findByLabelText } = await renderScreen();

    let hero = await findByTestId('reps-hero-readout');
    expect(JSON.stringify(hero.props)).toMatch(/\b50\b/);
    expect(JSON.stringify(hero.props.style)).toMatch(/"fontSize":112/);

    fireEvent.changeText(await findByLabelText('reps-input'), '37');
    hero = await findByTestId('reps-hero-readout');
    expect(JSON.stringify(hero.props)).toMatch(/\b37\b/);
  });

  it('reps mode renders a progress track + TARGET/REMAINING/RATE stat chips when the drill has a target', async () => {
    seedRoutine({ plannedSets: 1, drillMetric: 'reps', drillId: 'd-1', drillTarget: 50 });

    const { findByTestId, findByLabelText, getByText } = await renderScreen();

    expect(await findByTestId('reps-progress-track')).toBeTruthy();
    expect(getByText('TARGET')).toBeTruthy();
    expect(getByText('REMAINING')).toBeTruthy();
    expect(getByText('RATE')).toBeTruthy();

    const targetChip = await findByTestId('reps-target-chip-value');
    expect(JSON.stringify(targetChip.props)).toMatch(/\b50\b/);

    fireEvent.changeText(await findByLabelText('reps-input'), '20');

    const remainingChip = await findByTestId('reps-remaining-chip-value');
    expect(JSON.stringify(remainingChip.props)).toMatch(/\b30\b/);
    const rateChip = await findByTestId('reps-rate-chip-value');
    expect(JSON.stringify(rateChip.props)).toMatch(/40%/);
  });

  it('reps mode omits the progress track and stat chips when the drill has no target', async () => {
    seedRoutine({ plannedSets: 1, drillMetric: 'reps', drillId: 'd-1', drillTarget: null });

    const { findByTestId, queryByTestId, queryByText } = await renderScreen();
    await findByTestId('reps-hero-readout');

    expect(queryByTestId('reps-progress-track')).toBeNull();
    expect(queryByText('TARGET')).toBeNull();
    expect(queryByText('REMAINING')).toBeNull();
  });

  it('reps Save button fill follows the state-driven accent as the draft value crosses target thresholds', async () => {
    seedRoutine({ plannedSets: 1, drillMetric: 'reps', drillId: 'd-1', drillTarget: 100 });

    const { findByTestId, findByLabelText } = await renderScreen();

    const input = await findByLabelText('reps-input');

    fireEvent.changeText(input, '50');
    expect(resolveButtonBackground(await findByTestId('primary-action'))).toBe(colors.accent);

    fireEvent.changeText(input, '95');
    expect(resolveButtonBackground(await findByTestId('primary-action'))).toBe(colors.accentAmber);

    fireEvent.changeText(input, '120');
    expect(resolveButtonBackground(await findByTestId('primary-action'))).toBe(colors.accentMagenta);
  });

  it('state-driven accent boundaries are inclusive at 90% (amber) and 100% (magenta)', async () => {
    seedRoutine({ plannedSets: 1, drillMetric: 'reps', drillId: 'd-1', drillTarget: 100 });

    const { findByTestId, findByLabelText } = await renderScreen();

    const input = await findByLabelText('reps-input');

    fireEvent.changeText(input, '89');
    expect(resolveButtonBackground(await findByTestId('primary-action'))).toBe(colors.accent);

    fireEvent.changeText(input, '90');
    expect(resolveButtonBackground(await findByTestId('primary-action'))).toBe(colors.accentAmber);

    fireEvent.changeText(input, '99');
    expect(resolveButtonBackground(await findByTestId('primary-action'))).toBe(colors.accentAmber);

    fireEvent.changeText(input, '100');
    expect(resolveButtonBackground(await findByTestId('primary-action'))).toBe(colors.accentMagenta);
  });

  it('accuracy mode renders hero pct + progress track + TARGET/REMAINING/RATE chips; Save follows state accent', async () => {
    seedRoutine({
      plannedSets: 1,
      drillMetric: 'accuracy',
      drillId: 'd-1',
      drillTarget: 80,
    });

    const { findByTestId, findByLabelText } = await renderScreen();

    fireEvent.changeText(await findByLabelText('accuracy-value-input'), '17');
    fireEvent.changeText(await findByLabelText('accuracy-attempted-input'), '20');

    const hero = await findByTestId('accuracy-hero-readout');
    expect(JSON.stringify(hero.props)).toMatch(/85%/);
    expect(await findByTestId('accuracy-progress-track')).toBeTruthy();

    const targetChip = await findByTestId('accuracy-target-chip-value');
    expect(JSON.stringify(targetChip.props)).toMatch(/80%/);

    const rateChip = await findByTestId('accuracy-rate-chip-value');
    expect(JSON.stringify(rateChip.props)).toMatch(/106%/);

    const save = await findByTestId('primary-action');
    expect(resolveButtonBackground(save)).toBe(colors.accentMagenta);
  });

  it('accuracy mode omits the progress track and stat chips when the drill has no target', async () => {
    seedRoutine({
      plannedSets: 1,
      drillMetric: 'accuracy',
      drillId: 'd-1',
      drillTarget: null,
    });

    const { findByLabelText, queryByTestId, queryByText } = await renderScreen();
    await findByLabelText('accuracy-value-input');

    expect(queryByTestId('accuracy-progress-track')).toBeNull();
    expect(queryByText('TARGET')).toBeNull();
    expect(queryByText('REMAINING')).toBeNull();
  });

  it('duration Stop button switches to the magenta accent once elapsed ≥ 100% of target', async () => {
    seedRoutine({
      plannedSets: 1,
      drillMetric: 'duration',
      drillId: 'd-1',
      drillTarget: 100,
    });

    let ticks = 0;
    const clock = () => new Date(Date.parse(NOW) + ticks);

    const { findByTestId, findByLabelText } = await renderScreen({ clock });

    fireEvent.press(await findByLabelText('Start'));
    ticks = 120_000;

    await waitFor(async () => {
      const btn = await findByTestId('primary-action');
      expect(resolveButtonBackground(btn)).toBe(colors.accentMagenta);
    });
  });
});

describe('InSessionScreen — mid-timer switch confirm modal (replaces Alert.alert)', () => {
  beforeEach(resetMocks);

  it('opens the archetype-4 modal instead of a native alert when tapping a different slot while a timer runs', async () => {
    seedRoutine({
      plannedSets: 2,
      drillMetric: 'duration',
      drillId: 'd-1',
      drillTarget: 60,
    });

    let ticks = 0;
    const t0 = Date.parse(NOW);
    const clock = () => new Date(t0 + ticks);

    const { findByTestId, findByLabelText, findByText } = await renderScreen({ clock });
    await findByTestId('focus-hero');

    await act(async () => {
      fireEvent.press(await findByLabelText('Start'));
    });
    ticks = 42_000;

    await act(async () => {
      fireEvent.press(await findByTestId('up-next-ri-1-1'));
    });

    // Modal is up; message includes the elapsed time.
    expect(await findByText(/Save 0:42 for Wall rally and switch\?/)).toBeTruthy();
    expect(await findByTestId('switch-timer-save')).toBeTruthy();
    expect(await findByTestId('switch-timer-discard')).toBeTruthy();
    expect(await findByTestId('switch-timer-cancel')).toBeTruthy();
  });

  it('Save & switch logs the elapsed time and moves focus to the tapped slot', async () => {
    seedRoutine({
      plannedSets: 2,
      drillMetric: 'duration',
      drillId: 'd-1',
      drillTarget: 60,
    });

    let ticks = 0;
    const t0 = Date.parse(NOW);
    const clock = () => new Date(t0 + ticks);

    const { findByTestId, findByLabelText } = await renderScreen({ clock });
    await findByTestId('focus-hero');

    const startBtn = await findByLabelText('Start');
    await act(async () => {
      fireEvent.press(startBtn);
    });
    ticks = 30_000;

    const upNext = await findByTestId('up-next-ri-1-1');
    await act(async () => {
      fireEvent.press(upNext);
    });

    const saveBtn = await findByTestId('switch-timer-save');
    await act(async () => {
      fireEvent.press(saveBtn);
      await new Promise((res) => setImmediate(res));
    });

    expect(mockLogEntry).toHaveBeenCalledWith(
      null,
      expect.objectContaining({ drillId: 'd-1', value: 30 })
    );
  });

  it('Cancel keeps the timer running and does not log anything', async () => {
    seedRoutine({
      plannedSets: 2,
      drillMetric: 'duration',
      drillId: 'd-1',
      drillTarget: 60,
    });

    let ticks = 0;
    const t0 = Date.parse(NOW);
    const clock = () => new Date(t0 + ticks);

    const { findByTestId, findByLabelText, queryByTestId } = await renderScreen({ clock });
    await findByTestId('focus-hero');

    const startBtn = await findByLabelText('Start');
    await act(async () => {
      fireEvent.press(startBtn);
    });
    ticks = 42_000;

    const upNext = await findByTestId('up-next-ri-1-1');
    await act(async () => {
      fireEvent.press(upNext);
    });

    const cancelBtn = await findByTestId('switch-timer-cancel');
    await act(async () => {
      fireEvent.press(cancelBtn);
    });

    expect(mockLogEntry).not.toHaveBeenCalled();
    expect(queryByTestId('switch-timer-save')).toBeNull();
  });
});

describe('InSessionScreen — finish hero appears when all planned slots are filled', () => {
  beforeEach(resetMocks);

  it('renders the FinishHero and tapping "Finish session" ends the session', async () => {
    seedRoutine({
      plannedSets: 1,
      drillMetric: 'reps',
      drillId: 'd-1',
      entries: [makeEntry({ id: 'e-1', drillId: 'd-1', value: 42 })],
    });

    const { findByTestId } = await renderScreen();

    expect(await findByTestId('finish-hero')).toBeTruthy();

    await act(async () => {
      fireEvent.press(await findByTestId('finish-session'));
      await new Promise((res) => setImmediate(res));
    });

    expect(mockEndSession).toHaveBeenCalledWith(null, 'session-1', expect.anything());
    expect(onCloseSpy).toHaveBeenCalled();
  });

  it('"Add another drill" on the finish hero opens the sheet and focuses the picked drill', async () => {
    seedRoutine({
      plannedSets: 1,
      drillMetric: 'reps',
      drillId: 'd-1',
      entries: [makeEntry({ id: 'e-1', drillId: 'd-1', value: 42 })],
    });

    const { findByText, findByTestId, queryByTestId } = await renderScreen();

    expect(await findByTestId('finish-hero')).toBeTruthy();

    await act(async () => {
      fireEvent.press(await findByText('Add another drill'));
    });
    await act(async () => {
      fireEvent.press(await findByTestId('add-a-drill-row-d-1'));
    });

    // Picking an ad-hoc drill must leave the finish hero and drop the user into
    // the focus card so they can log it.
    expect(await findByTestId('focus-hero')).toBeTruthy();
    expect(queryByTestId('finish-hero')).toBeNull();
  });
});

describe('InSessionScreen — streamlined card + up-next', () => {
  beforeEach(resetMocks);

  it('renders no Cancel button on the focus card', async () => {
    seedRoutine({ plannedSets: 1, drillMetric: 'reps' });

    const { findByTestId, queryByTestId } = await renderScreen();
    await findByTestId('focus-hero');

    expect(queryByTestId('focus-cancel')).toBeNull();
  });

  it('renders no Delete affordance on the focus card of a planned slot', async () => {
    seedRoutine({ plannedSets: 1, drillMetric: 'reps' });

    const { findByTestId, queryByTestId } = await renderScreen();
    await findByTestId('focus-hero');

    expect(queryByTestId('focus-delete')).toBeNull();
  });

  it('renders no three-dot session menu affordance', async () => {
    seedRoutine({ plannedSets: 1, drillMetric: 'reps' });

    const { findByTestId, queryByTestId } = await renderScreen();
    await findByTestId('focus-hero');

    expect(queryByTestId('insession-menu')).toBeNull();
  });

  it('up next shows only the single next exercise (plus the add-drill chip)', async () => {
    seedRoutine({ plannedSets: 3, drillMetric: 'reps' });

    const { findByTestId, queryByTestId } = await renderScreen();
    await findByTestId('focus-hero');

    // Focus is ri-1-0; the next unfilled slot is ri-1-1 — and only that one.
    expect(await findByTestId('up-next-ri-1-1')).toBeTruthy();
    expect(queryByTestId('up-next-ri-1-2')).toBeNull();
    expect(await findByTestId('up-next-add-drill')).toBeTruthy();
  });
});
