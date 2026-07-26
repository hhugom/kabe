// RN Modal is proven in ModalLayout.test.tsx; here we render children inline
// when `visible` is true so the unfilled-slots modal's actions become queryable.
// Also capture onRequestClose so tests can simulate hardware back on Android.
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

import { act, fireEvent, render } from '@testing-library/react-native';
import { AppState } from 'react-native';
import { TamaguiProvider } from 'tamagui';
import tamaguiConfig from '../../tamagui.config';
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
// when `open` is true so the SessionMenuSheet content becomes queryable.
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

let currentNavigation: {
  goBack: jest.Mock;
  navigate: jest.Mock;
  setOptions: jest.Mock;
} | null = null;

// Reads the last `onMenuPress` handler registered via navigation.setOptions.
// This mirrors what App.tsx#renderPillHeader does with the header's three-dot.
async function pressHeaderMenu() {
  if (!currentNavigation) throw new Error('renderScreen not called');
  for (let i = currentNavigation.setOptions.mock.calls.length - 1; i >= 0; i--) {
    const opts = currentNavigation.setOptions.mock.calls[i][0];
    if (opts && typeof opts.onMenuPress === 'function') {
      await act(async () => {
        opts.onMenuPress();
      });
      return;
    }
  }
  throw new Error('no onMenuPress registered via setOptions');
}

async function renderScreen(opts: { clock?: () => Date } = {}) {
  const navigation = {
    goBack: jest.fn(),
    navigate: jest.fn(),
    setOptions: jest.fn(),
  } as any;
  currentNavigation = navigation;
  const route = { key: 'k', name: 'InSession' } as any;
  let result: ReturnType<typeof render>;
  await act(async () => {
    result = render(
      <TamaguiProvider config={tamaguiConfig} defaultTheme="kabe_dark">
        <InSessionScreen navigation={navigation} route={route} clock={opts.clock} />
      </TamaguiProvider>
    );
  });
  return result!;
}

describe('InSessionScreen — timer, wake-lock, and navigation', () => {
  beforeEach(() => {
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
    fireEvent.press(await findByText('Add a drill'));
    fireEvent.press(await findByTestId('add-a-drill-row-dur-1'));

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
    fireEvent.press(await findByText('Add a drill'));
    fireEvent.press(await findByTestId('add-a-drill-row-dur-disp'));

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

    const { findByTestId, findByText, findAllByText } = await renderScreen();
    fireEvent.press(await findByText('Add a drill'));
    fireEvent.press(await findByTestId('add-a-drill-row-dur-t'));

    // Zwift-HUD layout splits target label and value: a "TARGET" chip labels the 10:00 value.
    expect(await findByText(/target/i)).toBeTruthy();
    const tens = await findAllByText('10:00');
    expect(tens.length).toBeGreaterThan(0);
  });

  it('duration timer with no target does not show a target label', async () => {
    const drill = makeDrill({ id: 'dur-nt', name: 'Wall rally', metric: 'duration', target: null });
    mockListDrills.mockResolvedValue([drill]);

    const { findByTestId, findByText, queryByText } = await renderScreen();
    fireEvent.press(await findByText('Add a drill'));
    fireEvent.press(await findByTestId('add-a-drill-row-dur-nt'));

    expect(queryByText(/target/i)).toBeNull();
  });

  it('activates keep-awake only while the timer is running', async () => {
    const drill = makeDrill({ id: 'dur-k', name: 'Wall rally', metric: 'duration' });
    mockListDrills.mockResolvedValue([drill]);

    let ticks = 0;
    const clock = () => new Date(Date.parse(NOW) + ticks);

    const { findByTestId, findByText } = await renderScreen({ clock });
    fireEvent.press(await findByText('Add a drill'));
    fireEvent.press(await findByTestId('add-a-drill-row-dur-k'));

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
      fireEvent.press(await findByText('Add a drill'));
      fireEvent.press(await findByTestId('add-a-drill-row-dur-fg'));
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

  it('picker branch renders no footer End Session button (end lives in the sheet)', async () => {
    mockListDrills.mockResolvedValue([]);

    const { findByText, queryByText } = await renderScreen();
    // Wait for the picker to hydrate.
    await findByText('What are you working on?');
    // The only "End Session" affordance now lives inside the Session menu sheet,
    // which starts closed — so no such text should be present on the picker itself.
    expect(queryByText('End Session')).toBeNull();
  });

  it('pressing the header three-dot on the picker branch opens the Session menu sheet', async () => {
    mockListDrills.mockResolvedValue([]);

    const { findByText, findByTestId, queryByTestId } = await renderScreen();
    // The picker renders the "What are you working on?" prompt; assert we're on it,
    // and that the sheet's End Session row (testID) is not present until the menu opens.
    await findByText('What are you working on?');
    expect(queryByTestId('session-menu-end-session')).toBeNull();

    await pressHeaderMenu();

    expect(await findByTestId('session-menu-end-session')).toBeTruthy();
  });

  it('reps branch: three-dot opens the Session menu sheet', async () => {
    const drill = makeDrill({ id: 'reps-m', name: 'Serve reps', metric: 'reps' });
    mockListDrills.mockResolvedValue([drill]);

    const { findByTestId, findByText, findByLabelText, queryByTestId } = await renderScreen();
    fireEvent.press(await findByText('Add a drill'));
    fireEvent.press(await findByTestId('add-a-drill-row-reps-m'));
    // Reps entry screen surfaces the REPS number field.
    await findByLabelText('reps-input');
    expect(queryByTestId('session-menu-end-session')).toBeNull();

    await pressHeaderMenu();

    expect(await findByTestId('session-menu-end-session')).toBeTruthy();
  });

  it('accuracy branch: three-dot opens the Session menu sheet', async () => {
    const drill = makeDrill({ id: 'acc-m', name: 'Serve accuracy', metric: 'accuracy' });
    mockListDrills.mockResolvedValue([drill]);

    const { findByTestId, findByText, findByLabelText, queryByTestId } = await renderScreen();
    fireEvent.press(await findByText('Add a drill'));
    fireEvent.press(await findByTestId('add-a-drill-row-acc-m'));
    await findByLabelText('accuracy-value-input');
    expect(queryByTestId('session-menu-end-session')).toBeNull();

    await pressHeaderMenu();

    expect(await findByTestId('session-menu-end-session')).toBeTruthy();
  });

  it('duration branch: three-dot opens the Session menu sheet', async () => {
    const drill = makeDrill({ id: 'dur-m', name: 'Wall rally', metric: 'duration' });
    mockListDrills.mockResolvedValue([drill]);

    const { findByTestId, findByText, queryByTestId } = await renderScreen();
    fireEvent.press(await findByText('Add a drill'));
    fireEvent.press(await findByTestId('add-a-drill-row-dur-m'));
    await findByText('Start');
    expect(queryByTestId('session-menu-end-session')).toBeNull();

    await pressHeaderMenu();

    expect(await findByTestId('session-menu-end-session')).toBeTruthy();
  });

  it('tapping End Session in the Session menu sheet ends the session and navigates back', async () => {
    mockListDrills.mockResolvedValue([]);

    const { findByText, findByTestId } = await renderScreen();
    await findByText('What are you working on?');

    await pressHeaderMenu();
    await act(async () => {
      fireEvent.press(await findByTestId('session-menu-end-session'));
      // onEndSession fires an async `onEnd` chain (endActiveSession → endSession →
      // navigation.goBack). Wait a tick so the chain settles inside this act scope
      // — otherwise it resolves during the next test and contaminates it.
      await new Promise((res) => setImmediate(res));
    });

    expect(mockEndSession).toHaveBeenCalledWith(
      null,
      'session-1',
      expect.anything()
    );
    expect(currentNavigation!.goBack).toHaveBeenCalled();
  });

  it('"Add a drill" CTA opens the AddADrillSheet with every library drill', async () => {
    const drillA = makeDrill({ id: 'w1', name: 'Wall rally', category: 'wall' });
    const drillB = makeDrill({ id: 's1', name: 'Slice serve', category: 'service' });
    mockListDrills.mockResolvedValue([drillA, drillB]);

    const { findByText, findByTestId } = await renderScreen();

    // findByText waits for hydration; after it resolves the sheet has been
    // rendered at least once with `open: false`.
    fireEvent.press(await findByText('Add a drill'));

    // findByTestId polls until the mock re-renders with `open: true` and
    // emits the row for our drill.
    expect(await findByTestId('add-a-drill-row-w1')).toBeTruthy();

    const props = mockAddADrillSheetProps[mockAddADrillSheetProps.length - 1];
    expect(props.open).toBe(true);
    expect(props.drills.map((d: { id: string }) => d.id).sort()).toEqual(['s1', 'w1']);
  });

  it('picking a drill from the sheet enters that drill\'s entry mode and closes the sheet', async () => {
    // AC: "Selecting a drill creates an ad-hoc DrillEntry on the active session
    //      and navigates to the drill's entry mode".
    // The entry mode is a distinct rendered UI within InSessionScreen (per
    // docs/conventions/primary-vs-annex.md § The unit: mode-screen). Landing on
    // reps input for the picked drill means we've navigated to it.
    const drill = makeDrill({ id: 'w1', name: 'Wall rally', category: 'wall', metric: 'reps' });
    mockListDrills.mockResolvedValue([drill]);

    const { findByText, findByTestId, findByLabelText, queryByText } = await renderScreen();

    fireEvent.press(await findByText('Add a drill'));
    fireEvent.press(await findByTestId('add-a-drill-row-w1'));

    // Entry mode surface for the picked drill is now visible (reps input mode)…
    expect(await findByLabelText('reps-input')).toBeTruthy();
    // …and the picker CTA is gone — entry mode replaces the picker (per
    // docs/conventions/primary-vs-annex.md § The unit: mode-screen).
    expect(queryByText('Add a drill')).toBeNull();
  });

  it('does not render the old inline drill picker on the picker mode-screen', async () => {
    // Per ticket #20: "Old inline add path removed from the picker". The
    // library-of-drills grid used to sit inline; it now lives inside the sheet.
    const drill = makeDrill({ id: 'w1', name: 'Wall rally', category: 'wall' });
    mockListDrills.mockResolvedValue([drill]);

    const { queryByTestId } = await renderScreen();
    await act(async () => {});

    expect(queryByTestId('pick-drill-w1')).toBeNull();
  });
});


describe('InSessionScreen — fused planned-slot list', () => {
  beforeEach(() => {
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
    mockLogEntry.mockResolvedValue(makeEntry());
    mockEndSession.mockResolvedValue(undefined as any);
    mockAddADrillSheetProps.length = 0;
  });

  function seedRoutine({
    plannedSets = 3 as number | null,
    drillTarget = null as number | null,
    entries = [] as DrillEntry[],
    itemId = 'ri-1',
    drillId = 'd-1',
  } = {}) {
    const drill = makeDrill({
      id: drillId,
      name: 'Wall rally',
      metric: 'reps',
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

  it('renders one row per planned set: plannedSets:3 → 3 distinct rows', async () => {
    seedRoutine({ plannedSets: 3 });

    const { findByTestId } = await renderScreen();

    expect(await findByTestId('planned-slot-ri-1-0')).toBeTruthy();
    expect(await findByTestId('planned-slot-ri-1-1')).toBeTruthy();
    expect(await findByTestId('planned-slot-ri-1-2')).toBeTruthy();
  });

  it('tapping an empty slot opens the drill\'s entry mode', async () => {
    seedRoutine({ plannedSets: 2 });

    const { findByTestId, findByLabelText } = await renderScreen();

    fireEvent.press(await findByTestId('planned-slot-ri-1-0'));

    // Reps entry mode surfaces the reps-input.
    expect(await findByLabelText('reps-input')).toBeTruthy();
  });

  it('tapping a filled slot opens entry mode with the logged value prefilled; Save updates in place', async () => {
    seedRoutine({
      plannedSets: 2,
      entries: [makeEntry({ id: 'e-1', drillId: 'd-1', value: 42 })],
    });

    const { findByTestId, findByText, findByLabelText } = await renderScreen();

    const slot = await findByTestId('planned-slot-ri-1-0');
    fireEvent.press(slot);
    const input = await findByLabelText('reps-input');
    expect(input.props.value).toBe('42');

    // Change value + Save must UPDATE, not INSERT — logEntry must not be called;
    // updateEntry MUST be called with the target entry id and the new value.
    fireEvent.changeText(input, '99');
    const saveButton = await findByText('Save');
    await act(async () => {
      fireEvent.press(saveButton);
      await new Promise((res) => setImmediate(res));
    });
    expect(mockLogEntry).not.toHaveBeenCalled();
    expect(mockUpdateEntry).toHaveBeenCalledWith(
      null,
      'e-1',
      expect.objectContaining({ value: 99 })
    );
  });

  it('ad-hoc entries render in a distinct second section below the planned list', async () => {
    // 1 planned slot for the routine drill (d-1), 1 entry filling it, and 1
    // entry for a drill outside the routine — it must appear in the ad-hoc
    // second section under a clearly-different label.
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

    // Planned section still exists and contains slot-0 for the routine drill.
    expect(await findByTestId('planned-slot-ri-1-0')).toBeTruthy();
    // Ad-hoc section header is present.
    expect(await findByText(/ad[- ]hoc/i)).toBeTruthy();
    // The ad-hoc entry has its own row + value display.
    expect(await findByTestId('adhoc-entry-e-2')).toBeTruthy();
    // The planned-slot entry (e-1) is NOT in the ad-hoc section.
    // If it were, we'd have a duplicate testID collision.
  });

  it('Delete on an empty slot silently removes just that slot; siblings intact', async () => {
    seedRoutine({ plannedSets: 3 });

    const { findByTestId, queryByTestId } = await renderScreen();

    // All three slot rows are initially present.
    expect(await findByTestId('planned-slot-ri-1-0')).toBeTruthy();
    expect(await findByTestId('planned-slot-ri-1-1')).toBeTruthy();
    expect(await findByTestId('planned-slot-ri-1-2')).toBeTruthy();

    // Tap Delete on slot 1 — no confirm expected on empty rows.
    await act(async () => {
      fireEvent.press(await findByTestId('planned-slot-ri-1-1-delete'));
    });

    // Slot 1 is gone; 0 and 2 remain.
    expect(queryByTestId('planned-slot-ri-1-1')).toBeNull();
    expect(await findByTestId('planned-slot-ri-1-0')).toBeTruthy();
    expect(await findByTestId('planned-slot-ri-1-2')).toBeTruthy();
  });

  it('Delete on a filled slot requires a confirm-tap; second tap deletes the entry', async () => {
    seedRoutine({
      plannedSets: 1,
      entries: [makeEntry({ id: 'e-1', drillId: 'd-1', value: 42 })],
    });

    const { findByTestId } = await renderScreen();

    // First tap arms the confirm — deleteEntry MUST NOT fire yet.
    const deleteButton = await findByTestId('planned-slot-ri-1-0-delete');
    await act(async () => {
      fireEvent.press(deleteButton);
    });
    expect(mockDeleteEntry).not.toHaveBeenCalled();

    // The armed row exposes a confirm affordance the first tap did not.
    const confirm = await findByTestId('planned-slot-ri-1-0-delete-confirm');
    expect(confirm).toBeTruthy();

    // Second tap on the confirm affordance erases the entry.
    await act(async () => {
      fireEvent.press(confirm);
      await new Promise((res) => setImmediate(res));
    });
    expect(mockDeleteEntry).toHaveBeenCalledWith(null, 'e-1', expect.anything());
  });

  it('the legacy LOGGED SO FAR block is no longer rendered on the picker', async () => {
    // AC: "LOGGED SO FAR block from the current picker is removed".
    seedRoutine({
      plannedSets: 2,
      entries: [makeEntry({ id: 'e-1', drillId: 'd-1', value: 42 })],
    });

    const { findByText, queryByText } = await renderScreen();
    await findByText('What are you working on?');

    expect(queryByText(/logged so far/i)).toBeNull();
  });

  it('filled slot displays the logged reps value in tabular-nums', async () => {
    seedRoutine({
      plannedSets: 2,
      entries: [makeEntry({ id: 'e-1', drillId: 'd-1', value: 42 })],
    });

    const { findByTestId } = await renderScreen();

    const slot0 = await findByTestId('planned-slot-ri-1-0');
    // Filled-row value renders in tabular-nums per AC. The reps unit is included
    // to match how the picker already formats values in the LOGGED SO FAR block.
    const value = await findByTestId('planned-slot-ri-1-0-value');
    expect(value).toBeTruthy();
    // The rendered text must contain the raw number 42 (independent literal).
    const flat = JSON.stringify(value.props);
    expect(flat).toMatch(/42/);
    // And it must be styled with tabular-nums.
    const flatFonts = JSON.stringify(value.props.style);
    expect(flatFonts).toMatch(/tabular-nums/);
    // Slot 1 (empty) has no value node.
    expect(slot0).toBeTruthy();
  });
});

describe('InSessionScreen — unfilled-slots modal at End Session', () => {
  beforeEach(() => {
    mockListDrills.mockReset();
    mockGetActiveSession.mockReset();
    mockLogEntry.mockReset();
    mockGetRoutine.mockReset();
    mockEndSession.mockReset();
    mockActivateKeepAwake.mockReset();
    mockActivateKeepAwake.mockResolvedValue(undefined);
    mockDeactivateKeepAwake.mockReset();
    mockLogEntry.mockResolvedValue(makeEntry());
    mockEndSession.mockResolvedValue(undefined as any);
    mockAddADrillSheetProps.length = 0;
    modalProps.length = 0;
  });

  async function tapEndSessionInSheet(findByTestId: (id: string) => Promise<any>) {
    await pressHeaderMenu();
    await act(async () => {
      fireEvent.press(await findByTestId('session-menu-end-session'));
      // Give the async chain that opens the modal a tick to settle.
      await new Promise((res) => setImmediate(res));
    });
  }

  function seedRoutineWithUnfilled({
    drillTarget = 20 as number | null,
    plannedSets = 2 as number | null,
    entries = [] as DrillEntry[],
  } = {}) {
    const drill = makeDrill({
      id: 'd-1',
      name: 'Wall rally',
      metric: 'reps',
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
          id: 'ri-1',
          routineId: 'r-1',
          drillId: 'd-1',
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

  it('ends the session directly when there are no unfilled planned slots', async () => {
    // No routine → no plannedItems → no unfilled slots.
    mockGetActiveSession.mockResolvedValue({ session: makeSession(), entries: [] });
    mockGetRoutine.mockResolvedValue(null);
    mockListDrills.mockResolvedValue([]);

    const { findByText, findByTestId, queryByText } = await renderScreen();
    await findByText('What are you working on?');

    await tapEndSessionInSheet(findByTestId);

    // Modal must NOT appear; session ends and nav.goBack() fires.
    expect(queryByText(/complete/i)).toBeNull();
    expect(mockEndSession).toHaveBeenCalledWith(null, 'session-1', expect.anything());
    expect(currentNavigation!.goBack).toHaveBeenCalled();
  });

  it('opens the modal instead of ending when at least one planned slot is unfilled', async () => {
    seedRoutineWithUnfilled();

    const { findByText, findByTestId, queryByText } = await renderScreen();
    await findByText('What are you working on?');

    await tapEndSessionInSheet(findByTestId);

    // Both action affordances of the modal are visible.
    expect(await findByText(/complete to target/i)).toBeTruthy();
    expect(await findByText(/skip all/i)).toBeTruthy();
    // Session has NOT been ended yet.
    expect(mockEndSession).not.toHaveBeenCalled();
    expect(currentNavigation!.goBack).not.toHaveBeenCalled();
    expect(queryByText('What are you working on?')).toBeTruthy();
  });

  it('Complete-to-target logs one entry per unfilled slot at the drill target, then ends the session', async () => {
    seedRoutineWithUnfilled({ drillTarget: 20, plannedSets: 2 });

    const { findByText, findByTestId } = await renderScreen();
    await findByText('What are you working on?');
    await tapEndSessionInSheet(findByTestId);

    await act(async () => {
      fireEvent.press(await findByText(/complete to target/i));
      await new Promise((res) => setImmediate(res));
    });

    // 2 unfilled slots × drill.target(20) → 2 logEntry calls, both value=20.
    expect(mockLogEntry).toHaveBeenCalledTimes(2);
    expect(mockLogEntry.mock.calls[0][1]).toEqual(
      expect.objectContaining({ sessionId: 'session-1', drillId: 'd-1', value: 20 })
    );
    expect(mockLogEntry.mock.calls[1][1]).toEqual(
      expect.objectContaining({ sessionId: 'session-1', drillId: 'd-1', value: 20 })
    );
    expect(mockEndSession).toHaveBeenCalledWith(null, 'session-1', expect.anything());
    expect(currentNavigation!.goBack).toHaveBeenCalled();
  });

  it('Skip all ends the session without logging any new entries', async () => {
    seedRoutineWithUnfilled({ drillTarget: 20, plannedSets: 2 });

    const { findByText, findByTestId } = await renderScreen();
    await findByText('What are you working on?');
    await tapEndSessionInSheet(findByTestId);

    await act(async () => {
      fireEvent.press(await findByText(/skip all/i));
      await new Promise((res) => setImmediate(res));
    });

    expect(mockLogEntry).not.toHaveBeenCalled();
    expect(mockEndSession).toHaveBeenCalledWith(null, 'session-1', expect.anything());
    expect(currentNavigation!.goBack).toHaveBeenCalled();
  });

  it('hardware back on the modal cancels: session stays active, still on InSession', async () => {
    seedRoutineWithUnfilled();

    const { findByText, findByTestId } = await renderScreen();
    await findByText('What are you working on?');
    await tapEndSessionInSheet(findByTestId);

    // Simulate Android hardware back — RN Modal fires onRequestClose.
    const props = modalProps[modalProps.length - 1];
    act(() => {
      props.onRequestClose();
    });

    expect(mockEndSession).not.toHaveBeenCalled();
    expect(currentNavigation!.goBack).not.toHaveBeenCalled();
    expect(await findByText('What are you working on?')).toBeTruthy();
  });
});
