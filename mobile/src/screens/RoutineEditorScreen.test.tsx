import { act, fireEvent, render } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { TamaguiProvider } from 'tamagui';
import tamaguiConfig from '../../tamagui.config';
import { colors } from '../theme';
import { contrastRatio } from '../theme-contrast';
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

function flatStyle(node: any): Record<string, any> {
  return StyleSheet.flatten(node.props.style) ?? {};
}

// Sheet primitive is Tamagui's concern (proven in SheetLayout tests); render its
// children inline when `open` so the Routine menu's Archive row is queryable.
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
  const navigation = {
    goBack: jest.fn(),
    navigate: jest.fn(),
    replace: jest.fn(),
    setOptions: jest.fn(),
  } as any;
  capturedNavigation = navigation;
  const route = { key: 'k', name: 'RoutineEditor', params } as any;
  let result: ReturnType<typeof render>;
  await act(async () => {
    result = render(
      <TamaguiProvider config={tamaguiConfig} defaultTheme="kabe_dark">
        <RoutineEditorScreen navigation={navigation} route={route} />
      </TamaguiProvider>
    );
  });
  return result!;
}

// Mirrors the App.tsx#renderPillHeader pattern: the screen publishes onMenuPress
// via navigation.setOptions; the shared PillHeader binds it to the three-dot.
async function pressHeaderMenu() {
  for (let i = capturedNavigation.setOptions.mock.calls.length - 1; i >= 0; i--) {
    const opts = capturedNavigation.setOptions.mock.calls[i][0];
    if (opts && typeof opts.onMenuPress === 'function') {
      await act(async () => {
        opts.onMenuPress();
      });
      return;
    }
  }
  throw new Error('no onMenuPress registered via setOptions');
}

function lastMenuHandler(): (() => void) | undefined {
  for (let i = capturedNavigation.setOptions.mock.calls.length - 1; i >= 0; i--) {
    const opts = capturedNavigation.setOptions.mock.calls[i][0];
    if (opts && 'onMenuPress' in opts) return opts.onMenuPress;
  }
  return undefined;
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
  it('does NOT publish onMenuPress (three-dot hidden — nothing to archive yet)', async () => {
    mockListDrills.mockResolvedValue([]);
    await renderScreen();
    await act(async () => {});
    expect(lastMenuHandler()).toBeUndefined();
  });

  it('re-adding a drill after removing an earlier copy assigns a fresh key (no React key collision)', async () => {
    // Regression: addDrill used `prev.length` in the key, so after
    // add → add → remove #0 → add, the new row reused the survivor's key
    // (both ended up "new-1-d-a") and React collapsed the rendered nodes.
    mockListDrills.mockResolvedValue([makeDrill({ id: 'd-a', name: 'Wall rally' })]);
    const view = await renderScreen();

    // Each press wrapped in act so React commits the re-render before the
    // next read; otherwise the tree query races the state update.
    await act(async () => {
      fireEvent.press(await view.findByTestId('add-drill-d-a'));
    });
    await act(async () => {
      fireEvent.press(await view.findByTestId('add-drill-d-a'));
    });

    // Scan the raw tree for planned-sets-<key> a11yLabels; find/queryByX
    // predicates in this RTL version don't pick up sibling matches under a
    // ScrollView reliably. This is the honest way to observe the keys.
    function pickPlannedSetsKeys(): string[] {
      const matches = JSON.stringify(view.toJSON()).match(/planned-sets-[^"]+/g) ?? [];
      return matches.map((m) => m.replace('planned-sets-', ''));
    }

    let keys = pickPlannedSetsKeys();
    expect(keys.length).toBe(2);
    expect(new Set(keys).size).toBe(2);
    const firstKey = keys[0];

    // Remove the first row, then re-add. Under the bug the new item would
    // reuse the survivor's key and React would collapse the row.
    await act(async () => {
      fireEvent.press(await view.findByTestId(`remove-${firstKey}`));
    });
    await act(async () => {
      fireEvent.press(await view.findByTestId('add-drill-d-a'));
    });

    keys = pickPlannedSetsKeys();
    expect(keys.length).toBe(2);
    expect(new Set(keys).size).toBe(2);
  });

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

  it('the footer Archive button is gone entirely (moved to the Routine menu sheet)', async () => {
    mockListDrills.mockResolvedValue([makeDrill({ id: 'd-a', name: 'Wall rally' })]);
    mockGetRoutine.mockResolvedValue({
      routine: makeRoutine({ id: 'r-1', name: 'Existing' }),
      items: [makeRoutineItem({ id: 'ri-1', drillId: 'd-a', plannedSets: 1, position: 0 })],
    });
    const { queryByText } = await renderScreen({ routineId: 'r-1' });
    await Promise.resolve();
    expect(queryByText('Archive routine')).toBeNull();
  });

  it('publishes an onMenuPress handler in edit mode so the header three-dot is visible', async () => {
    mockListDrills.mockResolvedValue([makeDrill({ id: 'd-a', name: 'Wall rally' })]);
    mockGetRoutine.mockResolvedValue({
      routine: makeRoutine({ id: 'r-1', name: 'Existing' }),
      items: [makeRoutineItem({ id: 'ri-1', drillId: 'd-a', plannedSets: 1, position: 0 })],
    });
    await renderScreen({ routineId: 'r-1' });
    await act(async () => {});
    expect(typeof lastMenuHandler()).toBe('function');
  });

  it('opens the Routine menu sheet with an Archive row when the three-dot is pressed', async () => {
    mockListDrills.mockResolvedValue([makeDrill({ id: 'd-a', name: 'Wall rally' })]);
    mockGetRoutine.mockResolvedValue({
      routine: makeRoutine({ id: 'r-1', name: 'Existing' }),
      items: [makeRoutineItem({ id: 'ri-1', drillId: 'd-a', plannedSets: 1, position: 0 })],
    });
    const { findByText, queryByTestId } = await renderScreen({ routineId: 'r-1' });
    await act(async () => {});
    // Sheet starts closed — no Archive row rendered yet.
    expect(queryByTestId('routine-menu-archive')).toBeNull();

    await pressHeaderMenu();

    expect(await findByText('Archive')).toBeTruthy();
  });

  it('tapping Archive in the sheet calls archiveRoutine with the id and navigates back', async () => {
    mockListDrills.mockResolvedValue([makeDrill({ id: 'd-a', name: 'Wall rally' })]);
    mockGetRoutine.mockResolvedValue({
      routine: makeRoutine({ id: 'r-9', name: 'Bye bye' }),
      items: [makeRoutineItem({ id: 'ri-1', drillId: 'd-a', plannedSets: 1, position: 0 })],
    });

    const { findByTestId } = await renderScreen({ routineId: 'r-9' });
    await act(async () => {});
    await pressHeaderMenu();

    await act(async () => {
      fireEvent.press(await findByTestId('routine-menu-archive'));
      await new Promise((res) => setImmediate(res));
    });

    expect(mockArchiveRoutine).toHaveBeenCalledWith(null, 'r-9');
    expect(capturedNavigation.goBack).toHaveBeenCalled();
  });

  // Ergonomic-minima conformance (annex tier) —
  // docs/conventions/ergonomic-minima.md § Numeric floor.
  describe('annex ergonomic-minima conformance', () => {
    async function renderWithItem() {
      mockListDrills.mockResolvedValue([makeDrill({ id: 'd-a', name: 'Wall rally' })]);
      mockGetRoutine.mockResolvedValue({
        routine: makeRoutine({ id: 'r-1', name: 'Existing' }),
        items: [makeRoutineItem({ id: 'ri-1', drillId: 'd-a', plannedSets: 1, position: 0 })],
      });
      return renderScreen({ routineId: 'r-1' });
    }

    it('row-action icon buttons expose a ≥ 48 dp visible tap target (hitSlop does not substitute)', async () => {
      const { findByTestId } = await renderWithItem();
      for (const id of ['move-up-ri-1', 'move-down-ri-1', 'remove-ri-1']) {
        const s = flatStyle(await findByTestId(id));
        expect(s.minWidth ?? 0).toBeGreaterThanOrEqual(48);
        expect(s.minHeight ?? 0).toBeGreaterThanOrEqual(48);
      }
    });

    it('destructive remove is separated from the primary reorder controls (≥ 24 dp or distinct region)', async () => {
      // ergonomic-minima.md § Numeric floor: "Gap when destructive is adjacent
      // to primary ≥ 24 dp OR destructive in a visually distinct region".
      // The remove-icon is destructive-tinted (colors.danger). We encode the
      // gap-margin option: `remove` carries a marginLeft ≥ 24 that visually
      // pushes it away from the move controls.
      const { findByTestId } = await renderWithItem();
      const remove = flatStyle(await findByTestId('remove-ri-1'));
      expect(remove.marginLeft ?? 0).toBeGreaterThanOrEqual(24);
    });

    it('meta label ("Planned sets") uses a compliant token — either uppercase-≥12 or ≥16 body-primary', async () => {
      const { findByText } = await renderWithItem();
      const label = flatStyle(await findByText('Planned sets'));
      const isStructural =
        label.textTransform === 'uppercase' && (label.fontSize ?? 0) >= 12;
      const isBodyPrimary =
        (label.fontSize ?? 0) >= 16 && label.color !== colors.textSecondary;
      expect(isStructural || isBodyPrimary).toBe(true);
    });

    it('meta label ("Planned sets") clears AAA (7:1) on the card surface it sits inside', async () => {
      // The label sits inside the itemRow card (backgroundColor: colors.surface).
      // typography.label's default color (textSecondary #8FA4B8) drops to 6.55:1
      // on surface — below the 7:1 body-tier floor. Force a compliant override.
      const { findByText } = await renderWithItem();
      const label = flatStyle(await findByText('Planned sets'));
      const fg = label.color ?? colors.textPrimary;
      expect(contrastRatio(fg, colors.surface)).toBeGreaterThanOrEqual(7);
    });

    it('empty-drills body copy is ≥ 16 sp and not in textSecondary', async () => {
      // Empty state: no items yet, so we render fresh with no getRoutine call.
      mockListDrills.mockResolvedValue([]);
      const { findByText } = await renderScreen();
      const body = flatStyle(await findByText(/no drills yet/i));
      expect(body.fontSize).toBeGreaterThanOrEqual(16);
      expect(body.color).not.toBe(colors.textSecondary);
    });
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
