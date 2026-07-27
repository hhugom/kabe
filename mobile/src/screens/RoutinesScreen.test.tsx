import { fireEvent, render } from '@testing-library/react-native';
import { useNavigation } from '@react-navigation/native';
import { StyleSheet } from 'react-native';
import { colors } from '../theme';
import { contrastRatio } from '../theme-contrast';
import type { Routine } from '../use-cases/routines';
import { listRoutines } from '../use-cases/routines';
import { RoutinesScreen } from './RoutinesScreen';

function flatStyle(node: any): Record<string, any> {
  return StyleSheet.flatten(node.props.style) ?? {};
}

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

  // Ergonomic-minima conformance (annex tier) —
  // docs/conventions/ergonomic-minima.md § Numeric floor.
  describe('annex ergonomic-minima conformance', () => {
    it('routine rows have ≥ 48 dp tap targets and ≥ 16 sp labels', async () => {
      mockListRoutines.mockResolvedValue([makeRoutine({ id: 'r-1', name: 'Wall warmup' })]);
      const { findByTestId, findByText } = await render(<RoutinesScreen />);
      expect(flatStyle(await findByTestId('routine-r-1')).minHeight).toBeGreaterThanOrEqual(48);
      expect(flatStyle(await findByText('Wall warmup')).fontSize).toBeGreaterThanOrEqual(16);
    });

    it('"New routine" affordance has a ≥ 48 dp tap target and ≥ 16 sp label', async () => {
      mockListRoutines.mockResolvedValue([]);
      const { findByTestId, findByText } = await render(<RoutinesScreen />);
      expect(flatStyle(await findByTestId('new-routine')).minHeight).toBeGreaterThanOrEqual(48);
      expect(flatStyle(await findByText('+ New routine')).fontSize).toBeGreaterThanOrEqual(16);
    });

    it('routine-row label clears AAA (7:1) on the surface it sits on', async () => {
      mockListRoutines.mockResolvedValue([makeRoutine({ id: 'r-1', name: 'Wall warmup' })]);
      const { findByText } = await render(<RoutinesScreen />);
      const label = flatStyle(await findByText('Wall warmup'));
      const fg = label.color ?? colors.textPrimary;
      expect(contrastRatio(fg, colors.surface)).toBeGreaterThanOrEqual(7);
    });

    it('"+ New routine" accent label clears AAA (7:1) on surface', async () => {
      mockListRoutines.mockResolvedValue([]);
      const { findByText } = await render(<RoutinesScreen />);
      const label = flatStyle(await findByText('+ New routine'));
      const fg = label.color ?? colors.textPrimary;
      expect(contrastRatio(fg, colors.surface)).toBeGreaterThanOrEqual(7);
    });

  });
});
