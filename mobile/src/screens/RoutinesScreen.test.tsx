import { fireEvent, render } from '@testing-library/react-native';
import { useNavigation } from '@react-navigation/native';
import type { Routine } from '../use-cases/routines';
import { listRoutines } from '../use-cases/routines';
import { RoutinesScreen } from './RoutinesScreen';

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));
jest.mock('../use-cases/routines', () => ({
  listRoutines: jest.fn(),
}));
jest.mock('../db/client', () => ({
  getAppDb: jest.fn(() => null),
}));

const mockListRoutines = listRoutines as jest.MockedFunction<typeof listRoutines>;
const mockUseNavigation = useNavigation as jest.MockedFunction<typeof useNavigation>;

const NOW = '2026-07-23T00:00:00.000Z';

function makeNavigation() {
  return {
    navigate: jest.fn(),
    addListener: jest.fn((_e: string, _cb: () => void) => () => {}),
  } as any;
}

function makeRoutine(over: Partial<Routine>): Routine {
  return {
    id: over.id ?? 'r-id',
    name: over.name ?? 'A routine',
    createdAt: NOW,
    updatedAt: NOW,
    deletedAt: null,
  };
}

describe('RoutinesScreen', () => {
  beforeEach(() => {
    mockListRoutines.mockReset();
    mockUseNavigation.mockReset();
    mockUseNavigation.mockReturnValue(makeNavigation());
  });

  it('renders one row per routine returned from listRoutines', async () => {
    mockListRoutines.mockResolvedValue([
      makeRoutine({ id: 'r-1', name: 'Wall warmup' }),
      makeRoutine({ id: 'r-2', name: 'Full serve session' }),
    ]);
    const { findByText } = await render(<RoutinesScreen />);
    expect(await findByText('Wall warmup')).toBeTruthy();
    expect(await findByText('Full serve session')).toBeTruthy();
  });

  it('tapping a routine navigates to RoutineEditor with its id', async () => {
    mockListRoutines.mockResolvedValue([makeRoutine({ id: 'r-42', name: 'Wall warmup' })]);
    const navigation = makeNavigation();
    mockUseNavigation.mockReturnValue(navigation);

    const { findByTestId } = await render(<RoutinesScreen />);
    fireEvent.press(await findByTestId('routine-r-42'));

    expect(navigation.navigate).toHaveBeenCalledWith('RoutineEditor', { routineId: 'r-42' });
  });

  it('renders a "New routine" affordance that navigates to RoutineEditor with no routineId', async () => {
    mockListRoutines.mockResolvedValue([]);
    const navigation = makeNavigation();
    mockUseNavigation.mockReturnValue(navigation);

    const { findByTestId } = await render(<RoutinesScreen />);
    fireEvent.press(await findByTestId('new-routine'));

    expect(navigation.navigate).toHaveBeenCalledWith('RoutineEditor', { routineId: undefined });
  });

  it('renders a "Browse drills" affordance that pushes the Drills annex', async () => {
    // Per docs/conventions/primary-vs-annex.md § Drills-screen fate + issue #17:
    // Drills is an annex screen reachable only from Routines.
    mockListRoutines.mockResolvedValue([]);
    const navigation = makeNavigation();
    mockUseNavigation.mockReturnValue(navigation);

    const { findByText } = await render(<RoutinesScreen />);
    fireEvent.press(await findByText('Browse drills'));

    expect(navigation.navigate).toHaveBeenCalledWith('Drills');
  });
});
