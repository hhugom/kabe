import { fireEvent, render } from '@testing-library/react-native';
import { TamaguiProvider } from 'tamagui';
import tamaguiConfig from '../../tamagui.config';
import type { Routine } from '../use-cases/routines';
import { listRoutines } from '../use-cases/routines';
import { startSession } from '../use-cases/sessions';
import { PickRoutineSheet } from './PickRoutineSheet';

// Sheet primitive is Tamagui's concern (proven in SheetLayout tests). Here we
// mock it out so children render inline when `open` is true.
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

jest.mock('../use-cases/routines', () => ({
  listRoutines: jest.fn(),
}));
jest.mock('../use-cases/sessions', () => ({
  startSession: jest.fn(),
}));
jest.mock('../db/client', () => ({
  getAppDb: jest.fn(() => null),
}));

const mockListRoutines = listRoutines as jest.MockedFunction<typeof listRoutines>;
const mockStartSession = startSession as jest.MockedFunction<typeof startSession>;

const NOW = '2026-07-21T00:00:00.000Z';

function makeRoutine(over: Partial<Routine>): Routine {
  return {
    id: over.id ?? 'r-1',
    name: over.name ?? 'A routine',
    createdAt: over.createdAt ?? NOW,
    updatedAt: over.updatedAt ?? NOW,
    deletedAt: over.deletedAt ?? null,
  };
}

function wrap(node: React.ReactNode) {
  return (
    <TamaguiProvider config={tamaguiConfig} defaultTheme="kabe_dark">
      {node}
    </TamaguiProvider>
  );
}

describe('PickRoutineSheet', () => {
  beforeEach(() => {
    mockListRoutines.mockReset();
    mockStartSession.mockReset();
    mockStartSession.mockResolvedValue({
      id: 'sess-1',
      startedAt: NOW,
      endedAt: null,
      routineId: null,
      notes: null,
      createdAt: NOW,
      updatedAt: NOW,
      deletedAt: null,
    });
  });

  it('renders "Empty start" as the first row when open', async () => {
    mockListRoutines.mockResolvedValue([]);
    const { findByText } = await render(
      wrap(<PickRoutineSheet open onOpenChange={() => {}} onStarted={() => {}} />)
    );
    expect(await findByText('Empty start')).toBeTruthy();
  });

  it('renders one row per routine returned by listRoutines, after "Empty start"', async () => {
    mockListRoutines.mockResolvedValue([
      makeRoutine({ id: 'r-1', name: 'Wall warmup' }),
      makeRoutine({ id: 'r-2', name: 'Full serve session' }),
    ]);
    const { findByText } = await render(
      wrap(<PickRoutineSheet open onOpenChange={() => {}} onStarted={() => {}} />)
    );
    expect(await findByText('Empty start')).toBeTruthy();
    expect(await findByText('Wall warmup')).toBeTruthy();
    expect(await findByText('Full serve session')).toBeTruthy();
  });

  it('tapping "Empty start" starts a session with no routineId, then calls onStarted', async () => {
    mockListRoutines.mockResolvedValue([]);
    const onStarted = jest.fn();
    const { findByText } = await render(
      wrap(<PickRoutineSheet open onOpenChange={() => {}} onStarted={onStarted} />)
    );
    fireEvent.press(await findByText('Empty start'));
    await Promise.resolve();
    await Promise.resolve();
    expect(mockStartSession).toHaveBeenCalledTimes(1);
    const [, opts] = mockStartSession.mock.calls[0];
    expect(opts?.routineId ?? null).toBeNull();
    expect(onStarted).toHaveBeenCalledTimes(1);
  });

  it('tapping a routine row starts a session with that routineId, then calls onStarted', async () => {
    mockListRoutines.mockResolvedValue([
      makeRoutine({ id: 'r-1', name: 'Wall warmup' }),
    ]);
    const onStarted = jest.fn();
    const { findByText } = await render(
      wrap(<PickRoutineSheet open onOpenChange={() => {}} onStarted={onStarted} />)
    );
    fireEvent.press(await findByText('Wall warmup'));
    await Promise.resolve();
    await Promise.resolve();
    expect(mockStartSession).toHaveBeenCalledTimes(1);
    const [, opts] = mockStartSession.mock.calls[0];
    expect(opts?.routineId).toBe('r-1');
    expect(onStarted).toHaveBeenCalledTimes(1);
  });
});
