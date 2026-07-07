import { fireEvent, render } from '@testing-library/react-native';
import { useNavigation } from '@react-navigation/native';
import type { Drill } from '../use-cases/drills';
import { listDrills } from '../use-cases/drills';
import type { Routine } from '../use-cases/routines';
import { listRoutines } from '../use-cases/routines';
import { DrillsScreen } from './DrillsScreen';

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));
jest.mock('../use-cases/drills', () => ({
  listDrills: jest.fn(),
}));
jest.mock('../use-cases/routines', () => ({
  listRoutines: jest.fn(),
}));
jest.mock('../db/client', () => ({
  getAppDb: jest.fn(() => null),
}));

const mockListDrills = listDrills as jest.MockedFunction<typeof listDrills>;
const mockListRoutines = listRoutines as jest.MockedFunction<typeof listRoutines>;
const mockUseNavigation = useNavigation as jest.MockedFunction<typeof useNavigation>;

function makeNavigation() {
  return {
    navigate: jest.fn(),
    addListener: jest.fn((_e: string, _cb: () => void) => () => {}),
  } as any;
}

function makeRoutine(over: Partial<Routine>): Routine {
  const now = '2026-06-30T00:00:00.000Z';
  return {
    id: over.id ?? 'r-id',
    name: over.name ?? 'A routine',
    createdAt: over.createdAt ?? now,
    updatedAt: over.updatedAt ?? now,
    deletedAt: over.deletedAt ?? null,
  };
}

function makeDrill(over: Partial<Drill>): Drill {
  const now = '2026-06-30T00:00:00.000Z';
  return {
    id: over.id ?? 'id',
    name: over.name ?? 'Drill',
    category: over.category ?? 'wall',
    metric: over.metric ?? 'duration',
    target: over.target ?? null,
    notes: over.notes ?? null,
    createdAt: over.createdAt ?? now,
    updatedAt: over.updatedAt ?? now,
    deletedAt: over.deletedAt ?? null,
  };
}

describe('DrillsScreen', () => {
  beforeEach(() => {
    mockListDrills.mockReset();
    mockListRoutines.mockReset();
    mockUseNavigation.mockReset();
    mockUseNavigation.mockReturnValue(makeNavigation());
    mockListRoutines.mockResolvedValue([]);
  });

  it('renders one row per drill returned from listDrills', async () => {
    mockListDrills.mockResolvedValue([
      makeDrill({ id: '1', name: 'Forehand crosscourt rally' }),
      makeDrill({ id: '2', name: 'Backhand rally' }),
      makeDrill({ id: '3', name: 'Slice serve wide' }),
    ]);
    const { findByText } = await render(<DrillsScreen />);
    expect(await findByText('Forehand crosscourt rally')).toBeTruthy();
    expect(await findByText('Backhand rally')).toBeTruthy();
    expect(await findByText('Slice serve wide')).toBeTruthy();
  });

  it('renders an empty state when listDrills returns no drills', async () => {
    mockListDrills.mockResolvedValue([]);
    const { findByText } = await render(<DrillsScreen />);
    expect(await findByText('No drills yet')).toBeTruthy();
  });

  it('renders a Routines section with routine names from listRoutines', async () => {
    mockListDrills.mockResolvedValue([makeDrill({ id: 'd', name: 'A drill' })]);
    mockListRoutines.mockResolvedValue([
      makeRoutine({ id: 'r-1', name: 'Wall warmup' }),
      makeRoutine({ id: 'r-2', name: 'Full serve session' }),
    ]);
    const { findByText } = await render(<DrillsScreen />);
    expect(await findByText('Wall warmup')).toBeTruthy();
    expect(await findByText('Full serve session')).toBeTruthy();
  });

  it('renders a "+ New routine" affordance in the Routines section', async () => {
    mockListDrills.mockResolvedValue([makeDrill({ id: 'd', name: 'A drill' })]);
    mockListRoutines.mockResolvedValue([]);
    const { findByText } = await render(<DrillsScreen />);
    expect(await findByText('+ New routine')).toBeTruthy();
  });

  it('tapping "+ New routine" navigates to RoutineEditor with no routineId', async () => {
    mockListDrills.mockResolvedValue([]);
    mockListRoutines.mockResolvedValue([]);
    const navigation = makeNavigation();
    mockUseNavigation.mockReturnValue(navigation);

    const { findByTestId } = await render(<DrillsScreen />);
    fireEvent.press(await findByTestId('new-routine'));

    expect(navigation.navigate).toHaveBeenCalledWith('RoutineEditor', {
      routineId: undefined,
    });
  });

  it('tapping an existing routine navigates to RoutineEditor with its id', async () => {
    mockListDrills.mockResolvedValue([]);
    mockListRoutines.mockResolvedValue([makeRoutine({ id: 'r-42', name: 'Wall warmup' })]);
    const navigation = makeNavigation();
    mockUseNavigation.mockReturnValue(navigation);

    const { findByTestId } = await render(<DrillsScreen />);
    fireEvent.press(await findByTestId('routine-r-42'));

    expect(navigation.navigate).toHaveBeenCalledWith('RoutineEditor', { routineId: 'r-42' });
  });
});
