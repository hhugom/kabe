import { act, fireEvent, render } from '@testing-library/react-native';
import { AppState } from 'react-native';
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

let currentNavigation: { goBack: jest.Mock; navigate: jest.Mock } | null = null;

async function renderScreen(opts: { clock?: () => Date } = {}) {
  const navigation = { goBack: jest.fn(), navigate: jest.fn() } as any;
  currentNavigation = navigation;
  const route = { key: 'k', name: 'InSession' } as any;
  return render(<InSessionScreen navigation={navigation} route={route} clock={opts.clock} />);
}

describe('InSessionScreen — timer, wake-lock, and navigation', () => {
  beforeEach(() => {
    mockListDrills.mockReset();
    mockGetActiveSession.mockReset();
    mockLogEntry.mockReset();
    mockGetRoutine.mockReset();
    mockEndSession.mockReset();
    mockActivateKeepAwake.mockReset();
    mockActivateKeepAwake.mockResolvedValue(undefined);
    mockDeactivateKeepAwake.mockReset();
    mockGetActiveSession.mockResolvedValue({ session: makeSession(), entries: [] });
    mockLogEntry.mockResolvedValue(makeEntry());
    mockGetRoutine.mockResolvedValue(null);
  });

  it('navigates back when no session is active', async () => {
    mockGetActiveSession.mockResolvedValue(null);
    mockListDrills.mockResolvedValue([]);

    await renderScreen();

    await act(async () => {});

    expect(currentNavigation!.goBack).toHaveBeenCalled();
  });

  it('duration Start → Stop persists elapsed seconds via logEntry', async () => {
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

  it('duration timer with no target does not show a target label', async () => {
    const drill = makeDrill({ id: 'dur-nt', name: 'Wall rally', metric: 'duration', target: null });
    mockListDrills.mockResolvedValue([drill]);

    const { findByTestId, queryByText } = await renderScreen();
    fireEvent.press(await findByTestId('pick-drill-dur-nt'));

    expect(queryByText(/target/i)).toBeNull();
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

  it('End Session calls endSession and navigates back', async () => {
    mockListDrills.mockResolvedValue([]);

    const { findByText } = await renderScreen();

    fireEvent.press(await findByText('End Session'));
    await act(async () => {});

    expect(mockEndSession).toHaveBeenCalledWith(
      null,
      'session-1',
      expect.anything()
    );
    expect(currentNavigation!.goBack).toHaveBeenCalled();
  });
});
