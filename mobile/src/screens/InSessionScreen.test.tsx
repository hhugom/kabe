import { act, fireEvent, render } from '@testing-library/react-native';
import { AppState } from 'react-native';
import type { Drill } from '../use-cases/drills';
import { listDrills } from '../use-cases/drills';
import type { Routine, RoutineItem } from '../use-cases/routines';
import { getRoutine } from '../use-cases/routines';
import type { DrillEntry, Session } from '../use-cases/sessions';
import { getActiveSession, logEntry } from '../use-cases/sessions';
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

const NOW = '2026-06-30T12:00:00.000Z';

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

function makeRoutineItem(over: Partial<RoutineItem>): RoutineItem {
  return {
    id: over.id ?? 'ri-id',
    routineId: over.routineId ?? 'r-1',
    drillId: over.drillId ?? 'd-a',
    plannedSets: over.plannedSets ?? null,
    position: over.position ?? 0,
    createdAt: NOW,
    updatedAt: NOW,
    deletedAt: null,
  };
}

function makeRoutine(over: Partial<Routine> = {}): Routine {
  return {
    id: over.id ?? 'r-1',
    name: over.name ?? 'Wall warmup',
    createdAt: NOW,
    updatedAt: NOW,
    deletedAt: null,
  };
}

async function renderScreen(opts: { clock?: () => Date } = {}) {
  const navigation = { goBack: jest.fn(), navigate: jest.fn() } as any;
  const route = { key: 'k', name: 'InSession' } as any;
  return render(<InSessionScreen navigation={navigation} route={route} clock={opts.clock} />);
}

describe('InSessionScreen', () => {
  beforeEach(() => {
    mockListDrills.mockReset();
    mockGetActiveSession.mockReset();
    mockLogEntry.mockReset();
    mockGetRoutine.mockReset();
    mockActivateKeepAwake.mockReset();
    mockActivateKeepAwake.mockResolvedValue(undefined);
    mockDeactivateKeepAwake.mockReset();
    mockGetActiveSession.mockResolvedValue({ session: makeSession(), entries: [] });
    mockLogEntry.mockResolvedValue(makeEntry());
    mockGetRoutine.mockResolvedValue(null);
  });

  it('lists drills across all metrics, not only reps', async () => {
    mockListDrills.mockResolvedValue([
      makeDrill({ id: '1', name: 'Reps drill', metric: 'reps' }),
      makeDrill({ id: '2', name: 'Duration drill', metric: 'duration' }),
      makeDrill({ id: '3', name: 'Accuracy drill', metric: 'accuracy' }),
    ]);

    const { findByText } = await renderScreen();

    expect(await findByText('Reps drill')).toBeTruthy();
    expect(await findByText('Duration drill')).toBeTruthy();
    expect(await findByText('Accuracy drill')).toBeTruthy();
  });

  it('submits an accuracy entry with value and attempted', async () => {
    const drill = makeDrill({ id: 'acc-1', name: 'Serve accuracy', metric: 'accuracy' });
    mockListDrills.mockResolvedValue([drill]);

    const { findByText, findByTestId, findByLabelText } = await renderScreen();
    fireEvent.press(await findByTestId('pick-drill-acc-1'));

    fireEvent.changeText(await findByLabelText('accuracy-value-input'), '16');
    fireEvent.changeText(await findByLabelText('accuracy-attempted-input'), '20');
    fireEvent.press(await findByText('Save'));

    expect(mockLogEntry.mock.calls[0][1]).toEqual(
      expect.objectContaining({
        sessionId: 'session-1',
        drillId: 'acc-1',
        value: 16,
        attempted: 20,
      })
    );
  });

  it('duration Start → Stop calls logEntry with elapsed seconds', async () => {
    const drill = makeDrill({ id: 'dur-1', name: 'Wall rally', metric: 'duration' });
    mockListDrills.mockResolvedValue([drill]);

    let ticks = 0;
    const t0 = Date.parse(NOW);
    const clock = () => new Date(t0 + ticks);

    const { findByTestId, findByText } = await renderScreen({ clock });
    fireEvent.press(await findByTestId('pick-drill-dur-1'));

    fireEvent.press(await findByText('Start'));
    ticks = 600_000;
    fireEvent.press(await findByText('Stop'));

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
    const drill = makeDrill({ id: 'dur-disp', name: 'Wall rally', metric: 'duration' });
    mockListDrills.mockResolvedValue([drill]);

    let ticks = 0;
    const t0 = Date.parse(NOW);
    const clock = () => new Date(t0 + ticks);

    const { findByTestId, findByText } = await renderScreen({ clock });
    fireEvent.press(await findByTestId('pick-drill-dur-disp'));

    fireEvent.press(await findByText('Start'));
    // 3 minutes 7 seconds after Start
    ticks = 187_000;

    // Elapsed on screen must reflect the wall-clock diff before Stop is pressed.
    expect(await findByText('3:07')).toBeTruthy();

    fireEvent.press(await findByText('Stop'));
    // And the persisted value matches the same wall-clock diff.
    expect(mockLogEntry.mock.calls[0][1].value).toBe(187);
  });

  it('duration timer shows the drill target as a reference label', async () => {
    const drill = makeDrill({
      id: 'dur-t',
      name: 'Wall rally',
      metric: 'duration',
      target: 600,
    });
    mockListDrills.mockResolvedValue([drill]);

    const { findByTestId, findByText } = await renderScreen();
    fireEvent.press(await findByTestId('pick-drill-dur-t'));

    expect(await findByText(/target 10:00/i)).toBeTruthy();
  });

  it('activates keep-awake only while the timer is running', async () => {
    const drill = makeDrill({ id: 'dur-k', name: 'Wall rally', metric: 'duration' });
    mockListDrills.mockResolvedValue([drill]);

    let ticks = 0;
    const clock = () => new Date(Date.parse(NOW) + ticks);

    const { findByTestId, findByText } = await renderScreen({ clock });
    fireEvent.press(await findByTestId('pick-drill-dur-k'));

    expect(mockActivateKeepAwake).not.toHaveBeenCalled();

    fireEvent.press(await findByText('Start'));
    expect(mockActivateKeepAwake).toHaveBeenCalledTimes(1);
    expect(mockDeactivateKeepAwake).not.toHaveBeenCalled();

    ticks = 5000;
    fireEvent.press(await findByText('Stop'));
    expect(mockDeactivateKeepAwake).toHaveBeenCalledTimes(1);
  });

  it('recomputes elapsed from startedAt when the app returns to foreground', async () => {
    const drill = makeDrill({ id: 'dur-fg', name: 'Wall rally', metric: 'duration' });
    mockListDrills.mockResolvedValue([drill]);

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
      const { findByTestId, findByText } = await renderScreen({ clock });
      fireEvent.press(await findByTestId('pick-drill-dur-fg'));
      fireEvent.press(await findByText('Start'));

      // Simulate the OS pausing JS while the app is backgrounded — clock jumps 30s.
      ticks = 30_000;
      act(() => {
        listeners.forEach((l) => l('active'));
      });

      expect(await findByText('0:30')).toBeTruthy();
    } finally {
      addListenerSpy.mockRestore();
    }
  });

  it('duration timer with no target does not show a target label', async () => {
    const drill = makeDrill({ id: 'dur-nt', name: 'Wall rally', metric: 'duration', target: null });
    mockListDrills.mockResolvedValue([drill]);

    const { findByTestId, queryByText } = await renderScreen();
    fireEvent.press(await findByTestId('pick-drill-dur-nt'));

    expect(queryByText(/target/i)).toBeNull();
  });

  it('Skip removes a planned item from the planned list but leaves the drill ad-hoc pickable', async () => {
    const drillA = makeDrill({ id: 'd-a', name: 'Wall rally', metric: 'reps' });
    const drillB = makeDrill({ id: 'd-b', name: 'Backhand', metric: 'reps' });
    mockListDrills.mockResolvedValue([drillA, drillB]);
    mockGetActiveSession.mockResolvedValue({
      session: makeSession({ routineId: 'r-1' }),
      entries: [],
    });
    mockGetRoutine.mockResolvedValue({
      routine: makeRoutine({ id: 'r-1' }),
      items: [
        makeRoutineItem({ id: 'ri-1', drillId: 'd-a', plannedSets: 3, position: 0 }),
        makeRoutineItem({ id: 'ri-2', drillId: 'd-b', plannedSets: 1, position: 1 }),
      ],
    });

    const { findByTestId, queryByTestId } = await renderScreen();

    // Both planned items visible initially
    expect(await findByTestId('planned-item-ri-1')).toBeTruthy();
    expect(await findByTestId('planned-item-ri-2')).toBeTruthy();

    // Skip the first planned item
    await act(async () => {
      fireEvent.press(await findByTestId('skip-ri-1'));
    });

    // First item removed from planned list, second still there
    expect(queryByTestId('planned-item-ri-1')).toBeNull();
    expect(queryByTestId('planned-item-ri-2')).toBeTruthy();

    // Drill for the skipped planned item still available in the ad-hoc picker
    expect(queryByTestId('pick-drill-d-a')).toBeTruthy();
  });

  it('renders "logged: N" for planned items whose plannedSets is null', async () => {
    const drillA = makeDrill({ id: 'd-a', name: 'Wall rally', metric: 'reps' });
    mockListDrills.mockResolvedValue([drillA]);
    mockGetActiveSession.mockResolvedValue({
      session: makeSession({ routineId: 'r-1' }),
      entries: [makeEntry({ drillId: 'd-a', value: 5 })],
    });
    mockGetRoutine.mockResolvedValue({
      routine: makeRoutine({ id: 'r-1' }),
      items: [makeRoutineItem({ id: 'ri-1', drillId: 'd-a', plannedSets: null, position: 0 })],
    });

    const { findByText } = await renderScreen();

    expect(await findByText('logged: 1')).toBeTruthy();
  });

  it('tick-off badge updates as entries are logged against a planned drill', async () => {
    const drillA = makeDrill({ id: 'd-a', name: 'Serve reps', metric: 'reps' });
    mockListDrills.mockResolvedValue([drillA]);
    mockGetRoutine.mockResolvedValue({
      routine: makeRoutine({ id: 'r-1' }),
      items: [makeRoutineItem({ id: 'ri-1', drillId: 'd-a', plannedSets: 3, position: 0 })],
    });

    mockGetActiveSession
      .mockResolvedValueOnce({ session: makeSession({ routineId: 'r-1' }), entries: [] })
      .mockResolvedValue({
        session: makeSession({ routineId: 'r-1' }),
        entries: [makeEntry({ drillId: 'd-a', value: 10 })],
      });
    mockLogEntry.mockResolvedValue(makeEntry({ drillId: 'd-a', value: 10 }));

    const { findByText, findByTestId, findByLabelText } = await renderScreen();

    expect(await findByText('0 / 3')).toBeTruthy();

    fireEvent.press(await findByTestId('planned-item-ri-1'));
    fireEvent.changeText(await findByLabelText('reps-input'), '10');
    fireEvent.press(await findByText('Save'));

    expect(await findByText('1 / 3')).toBeTruthy();
  });

  it('renders planned items with 0 / N badges when session has a routineId', async () => {
    const drillA = makeDrill({ id: 'd-a', name: 'Wall rally', metric: 'duration' });
    const drillB = makeDrill({ id: 'd-b', name: 'Serve', metric: 'accuracy' });
    mockListDrills.mockResolvedValue([drillA, drillB]);
    mockGetActiveSession.mockResolvedValue({
      session: makeSession({ routineId: 'r-1' }),
      entries: [],
    });
    mockGetRoutine.mockResolvedValue({
      routine: makeRoutine({ id: 'r-1', name: 'Wall warmup' }),
      items: [
        makeRoutineItem({ id: 'ri-1', drillId: 'd-a', plannedSets: 3, position: 0 }),
        makeRoutineItem({ id: 'ri-2', drillId: 'd-b', plannedSets: 1, position: 1 }),
      ],
    });

    const { findByText, findByTestId } = await renderScreen();

    const item1 = await findByTestId('planned-item-ri-1');
    const item2 = await findByTestId('planned-item-ri-2');
    expect(item1).toBeTruthy();
    expect(item2).toBeTruthy();
    expect(await findByText('0 / 3')).toBeTruthy();
    expect(await findByText('0 / 1')).toBeTruthy();
  });

  it("defaults the accuracy 'attempted' field to the drill target", async () => {
    const drill = makeDrill({
      id: 'acc-t',
      name: 'Serve accuracy',
      metric: 'accuracy',
      target: 25,
    });
    mockListDrills.mockResolvedValue([drill]);

    const { findByTestId, findByLabelText } = await renderScreen();
    fireEvent.press(await findByTestId('pick-drill-acc-t'));

    const attemptedInput = await findByLabelText('accuracy-attempted-input');
    expect(attemptedInput.props.value).toBe('25');
  });
});
