import { fireEvent, render } from '@testing-library/react-native';
import type { Drill } from '../use-cases/drills';
import { listDrills } from '../use-cases/drills';
import type { Routine, RoutineItem } from '../use-cases/routines';
import {
  archiveRoutine,
  createRoutine,
  getRoutine,
  updateRoutine,
} from '../use-cases/routines';
import { RoutineEditorScreen } from './RoutineEditorScreen';

jest.mock('../use-cases/drills', () => ({
  listDrills: jest.fn(),
}));
jest.mock('../use-cases/routines', () => ({
  archiveRoutine: jest.fn(),
  createRoutine: jest.fn(),
  getRoutine: jest.fn(),
  updateRoutine: jest.fn(),
}));
jest.mock('../db/client', () => ({
  getAppDb: jest.fn(() => null),
}));

const mockListDrills = listDrills as jest.MockedFunction<typeof listDrills>;
const mockCreateRoutine = createRoutine as jest.MockedFunction<typeof createRoutine>;
const mockUpdateRoutine = updateRoutine as jest.MockedFunction<typeof updateRoutine>;
const mockGetRoutine = getRoutine as jest.MockedFunction<typeof getRoutine>;
const mockArchiveRoutine = archiveRoutine as jest.MockedFunction<typeof archiveRoutine>;

const NOW = '2026-07-01T00:00:00.000Z';

function makeDrill(over: Partial<Drill>): Drill {
  return {
    id: over.id ?? 'd',
    name: over.name ?? 'A drill',
    category: over.category ?? 'wall',
    metric: over.metric ?? 'reps',
    target: over.target ?? null,
    notes: over.notes ?? null,
    createdAt: NOW,
    updatedAt: NOW,
    deletedAt: null,
  };
}

function makeRoutine(over: Partial<Routine> = {}): Routine {
  return {
    id: over.id ?? 'r-1',
    name: over.name ?? 'A routine',
    createdAt: NOW,
    updatedAt: NOW,
    deletedAt: null,
  };
}

function makeRoutineItem(over: Partial<RoutineItem>): RoutineItem {
  return {
    id: over.id ?? 'ri',
    routineId: over.routineId ?? 'r-1',
    drillId: over.drillId ?? 'd',
    plannedSets: over.plannedSets ?? null,
    position: over.position ?? 0,
    createdAt: NOW,
    updatedAt: NOW,
    deletedAt: null,
  };
}

let capturedNavigation: any;
async function renderScreen(params: { routineId?: string } = {}) {
  const navigation = { goBack: jest.fn(), navigate: jest.fn(), replace: jest.fn() } as any;
  capturedNavigation = navigation;
  const route = { key: 'k', name: 'RoutineEditor', params } as any;
  return render(<RoutineEditorScreen navigation={navigation} route={route} />);
}

beforeEach(() => {
  mockListDrills.mockReset();
  mockCreateRoutine.mockReset();
  mockUpdateRoutine.mockReset();
  mockGetRoutine.mockReset();
  mockArchiveRoutine.mockReset();
  mockCreateRoutine.mockResolvedValue(makeRoutine());
});

describe('RoutineEditorScreen (create mode)', () => {

  it('typing a name and adding a drill then Save calls createRoutine with the right shape', async () => {
    mockListDrills.mockResolvedValue([
      makeDrill({ id: 'd-a', name: 'Wall rally' }),
      makeDrill({ id: 'd-b', name: 'Serve' }),
    ]);

    const { findByLabelText, findByTestId, findByText } = await renderScreen();

    fireEvent.changeText(await findByLabelText('routine-name-input'), 'My warmup');
    fireEvent.press(await findByTestId('add-drill-d-a'));
    fireEvent.press(await findByText('Save'));

    await Promise.resolve();
    await Promise.resolve();

    expect(mockCreateRoutine.mock.calls[0][1]).toEqual(
      expect.objectContaining({
        name: 'My warmup',
        items: [expect.objectContaining({ drillId: 'd-a' })],
      })
    );
    expect(capturedNavigation.goBack).toHaveBeenCalled();
  });
});

describe('RoutineEditorScreen (edit mode)', () => {
  it('loads the existing routine name and items via getRoutine', async () => {
    mockListDrills.mockResolvedValue([
      makeDrill({ id: 'd-a', name: 'Wall rally' }),
      makeDrill({ id: 'd-b', name: 'Serve' }),
    ]);
    mockGetRoutine.mockResolvedValue({
      routine: makeRoutine({ id: 'r-1', name: 'Existing' }),
      items: [
        makeRoutineItem({ id: 'ri-1', drillId: 'd-a', plannedSets: 3, position: 0 }),
        makeRoutineItem({ id: 'ri-2', drillId: 'd-b', plannedSets: null, position: 1 }),
      ],
    });

    const { findByLabelText, findByTestId } = await renderScreen({ routineId: 'r-1' });

    const nameInput = await findByLabelText('routine-name-input');
    expect(nameInput.props.value).toBe('Existing');
    expect(await findByTestId('item-ri-1')).toBeTruthy();
    expect(await findByTestId('item-ri-2')).toBeTruthy();
  });

  it('renaming and saving calls updateRoutine with the new name and items', async () => {
    mockListDrills.mockResolvedValue([makeDrill({ id: 'd-a', name: 'Wall rally' })]);
    mockGetRoutine.mockResolvedValue({
      routine: makeRoutine({ id: 'r-1', name: 'Old name' }),
      items: [makeRoutineItem({ id: 'ri-1', drillId: 'd-a', plannedSets: 3, position: 0 })],
    });

    const { findByLabelText, findByText } = await renderScreen({ routineId: 'r-1' });

    fireEvent.changeText(await findByLabelText('routine-name-input'), 'New name');
    fireEvent.press(await findByText('Save'));

    await Promise.resolve();
    await Promise.resolve();

    expect(mockUpdateRoutine.mock.calls[0][1]).toBe('r-1');
    expect(mockUpdateRoutine.mock.calls[0][2]).toEqual(
      expect.objectContaining({
        name: 'New name',
        items: [expect.objectContaining({ drillId: 'd-a', plannedSets: 3 })],
      })
    );
    expect(capturedNavigation.goBack).toHaveBeenCalled();
  });

  it('removing an item excludes it from the saved items', async () => {
    mockListDrills.mockResolvedValue([
      makeDrill({ id: 'd-a', name: 'Wall rally' }),
      makeDrill({ id: 'd-b', name: 'Serve' }),
    ]);
    mockGetRoutine.mockResolvedValue({
      routine: makeRoutine({ id: 'r-1', name: 'Two-item' }),
      items: [
        makeRoutineItem({ id: 'ri-1', drillId: 'd-a', plannedSets: 3, position: 0 }),
        makeRoutineItem({ id: 'ri-2', drillId: 'd-b', plannedSets: 1, position: 1 }),
      ],
    });

    const { findByTestId, findByText } = await renderScreen({ routineId: 'r-1' });

    fireEvent.press(await findByTestId('remove-ri-1'));
    fireEvent.press(await findByText('Save'));

    await Promise.resolve();
    await Promise.resolve();

    expect(mockUpdateRoutine.mock.calls[0][2]).toEqual(
      expect.objectContaining({
        items: [expect.objectContaining({ drillId: 'd-b', plannedSets: 1 })],
      })
    );
  });

  it('editing plannedSets on an item persists the new value on save', async () => {
    mockListDrills.mockResolvedValue([makeDrill({ id: 'd-a', name: 'Wall rally' })]);
    mockGetRoutine.mockResolvedValue({
      routine: makeRoutine({ id: 'r-1', name: 'One-item' }),
      items: [makeRoutineItem({ id: 'ri-1', drillId: 'd-a', plannedSets: 1, position: 0 })],
    });

    const { findByLabelText, findByText } = await renderScreen({ routineId: 'r-1' });

    fireEvent.changeText(await findByLabelText('planned-sets-ri-1'), '5');
    fireEvent.press(await findByText('Save'));

    await Promise.resolve();
    await Promise.resolve();

    expect(mockUpdateRoutine.mock.calls[0][2]).toEqual(
      expect.objectContaining({
        items: [expect.objectContaining({ drillId: 'd-a', plannedSets: 5 })],
      })
    );
  });

  it('Archive routine button is not shown in create mode', async () => {
    mockListDrills.mockResolvedValue([]);
    const { queryByText } = await renderScreen();
    await Promise.resolve();
    expect(queryByText('Archive routine')).toBeNull();
  });

  it('Archive routine calls archiveRoutine with the id and navigates back', async () => {
    mockListDrills.mockResolvedValue([makeDrill({ id: 'd-a', name: 'Wall rally' })]);
    mockGetRoutine.mockResolvedValue({
      routine: makeRoutine({ id: 'r-9', name: 'Bye bye' }),
      items: [makeRoutineItem({ id: 'ri-1', drillId: 'd-a', plannedSets: 1, position: 0 })],
    });

    const { findByText } = await renderScreen({ routineId: 'r-9' });
    fireEvent.press(await findByText('Archive routine'));

    await Promise.resolve();
    await Promise.resolve();

    expect(mockArchiveRoutine).toHaveBeenCalledWith(null, 'r-9');
    expect(capturedNavigation.goBack).toHaveBeenCalled();
  });

  it('moving an item up reorders the saved items', async () => {
    mockListDrills.mockResolvedValue([
      makeDrill({ id: 'd-a', name: 'Wall rally' }),
      makeDrill({ id: 'd-b', name: 'Serve' }),
    ]);
    mockGetRoutine.mockResolvedValue({
      routine: makeRoutine({ id: 'r-1', name: 'Two-item' }),
      items: [
        makeRoutineItem({ id: 'ri-1', drillId: 'd-a', plannedSets: null, position: 0 }),
        makeRoutineItem({ id: 'ri-2', drillId: 'd-b', plannedSets: null, position: 1 }),
      ],
    });

    const { findByTestId, findByText } = await renderScreen({ routineId: 'r-1' });

    fireEvent.press(await findByTestId('move-up-ri-2'));
    fireEvent.press(await findByText('Save'));

    await Promise.resolve();
    await Promise.resolve();

    const items = mockUpdateRoutine.mock.calls[0][2].items;
    expect(items?.map((i) => i.drillId)).toEqual(['d-b', 'd-a']);
  });
});
