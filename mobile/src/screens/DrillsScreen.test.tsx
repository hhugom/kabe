import { render } from '@testing-library/react-native';
import { useNavigation } from '@react-navigation/native';
import type { Drill } from '../use-cases/drills';
import { listDrills } from '../use-cases/drills';
import { DrillsScreen } from './DrillsScreen';

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));
jest.mock('../use-cases/drills', () => ({
  listDrills: jest.fn(),
}));
jest.mock('../db/client', () => ({
  getAppDb: jest.fn(() => null),
}));

const mockListDrills = listDrills as jest.MockedFunction<typeof listDrills>;
const mockUseNavigation = useNavigation as jest.MockedFunction<typeof useNavigation>;

function makeNavigation() {
  return {
    navigate: jest.fn(),
    addListener: jest.fn((_e: string, _cb: () => void) => () => {}),
  } as any;
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

describe('DrillsScreen (annex)', () => {
  beforeEach(() => {
    mockListDrills.mockReset();
    mockUseNavigation.mockReset();
    mockUseNavigation.mockReturnValue(makeNavigation());
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

  it('does not render the Routines section (moved to RoutinesScreen)', async () => {
    // Per issue #17 + docs/conventions/primary-vs-annex.md § Drills-screen fate:
    // Drills is now an annex reachable only from Routines. Routine management
    // lives on RoutinesScreen; nothing routine-shaped renders here.
    mockListDrills.mockResolvedValue([makeDrill({ id: 'd', name: 'A drill' })]);
    const { queryByText, queryByTestId } = await render(<DrillsScreen />);
    await Promise.resolve();
    await Promise.resolve();

    expect(queryByText('Routines')).toBeNull();
    expect(queryByText('+ New routine')).toBeNull();
    expect(queryByTestId('new-routine')).toBeNull();
  });
});
