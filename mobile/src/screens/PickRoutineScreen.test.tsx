import { fireEvent, render } from '@testing-library/react-native';
import type { Routine } from '../use-cases/routines';
import { listRoutines } from '../use-cases/routines';
import { startSession } from '../use-cases/sessions';
import { PickRoutineScreen } from './PickRoutineScreen';

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

const NOW = '2026-07-01T00:00:00.000Z';

function makeRoutine(over: Partial<Routine>): Routine {
  return {
    id: over.id ?? 'r-1',
    name: over.name ?? 'A routine',
    createdAt: over.createdAt ?? NOW,
    updatedAt: over.updatedAt ?? NOW,
    deletedAt: over.deletedAt ?? null,
  };
}

let capturedNavigation: any;
async function renderScreen() {
  const navigation = { replace: jest.fn(), navigate: jest.fn(), goBack: jest.fn() } as any;
  capturedNavigation = navigation;
  const route = { key: 'k', name: 'PickRoutine' } as any;
  return render(<PickRoutineScreen navigation={navigation} route={route} />);
}

describe('PickRoutineScreen', () => {
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

  it('renders one row per routine returned by listRoutines', async () => {
    mockListRoutines.mockResolvedValue([
      makeRoutine({ id: 'r-1', name: 'Wall warmup' }),
      makeRoutine({ id: 'r-2', name: 'Full serve session' }),
    ]);

    const { findByText } = await renderScreen();

    expect(await findByText('Wall warmup')).toBeTruthy();
    expect(await findByText('Full serve session')).toBeTruthy();
  });

  it('tapping a routine starts a session with routineId and replaces to InSession', async () => {
    mockListRoutines.mockResolvedValue([makeRoutine({ id: 'r-1', name: 'Wall warmup' })]);

    const { findByText } = await renderScreen();
    fireEvent.press(await findByText('Wall warmup'));

    await Promise.resolve();
    await Promise.resolve();

    expect(mockStartSession.mock.calls[0][1]).toEqual(
      expect.objectContaining({ routineId: 'r-1' })
    );
    expect(capturedNavigation.replace).toHaveBeenCalledWith('InSession');
  });
});
