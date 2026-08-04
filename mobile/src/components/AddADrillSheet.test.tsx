import { fireEvent, render } from '@testing-library/react-native';
import { TamaguiProvider } from 'tamagui';
import tamaguiConfig from '../../tamagui.config';
import type { Drill } from '../use-cases/drills';
import { AddADrillSheet } from './AddADrillSheet';

// Sheet primitive is Tamagui's concern (proven in SheetLayout tests). Capture the
// props our layout hands to Tamagui `Sheet`, and render children inline when open.
const sheetProps: any[] = [];
jest.mock('tamagui', () => {
  const actual = jest.requireActual('tamagui');
  function MockSheet(props: any) {
    sheetProps.push(props);
    return props.open ? props.children : null;
  }
  MockSheet.Overlay = (_: any) => null;
  MockSheet.Handle = (_: any) => null;
  MockSheet.Frame = ({ children }: any) => children;
  return { ...actual, Sheet: MockSheet };
});

const NOW = '2026-07-24T00:00:00.000Z';

function makeDrill(over: Partial<Drill>): Drill {
  return {
    id: over.id ?? 'id',
    name: over.name ?? 'A drill',
    category: over.category ?? 'wall',
    metric: over.metric ?? 'reps',
    target: over.target ?? 20,
    notes: over.notes ?? null,
    createdAt: NOW,
    updatedAt: NOW,
    deletedAt: null,
  };
}

function wrap(node: React.ReactNode) {
  return (
    <TamaguiProvider config={tamaguiConfig} defaultTheme="kabe_dark">
      {node}
    </TamaguiProvider>
  );
}

describe('AddADrillSheet', () => {
  beforeEach(() => {
    sheetProps.length = 0;
  });

  it('renders one row per drill grouped by category (wall then service)', async () => {
    const drills = [
      makeDrill({ id: 's1', name: 'Slice serve wide', category: 'service' }),
      makeDrill({ id: 'w1', name: 'Wall rally', category: 'wall' }),
      makeDrill({ id: 'w2', name: 'Backhand rally', category: 'wall' }),
      makeDrill({ id: 's2', name: 'Flat 1st serve', category: 'service' }),
    ];
    const { findByText, findAllByText } = await render(
      wrap(<AddADrillSheet open drills={drills} onOpenChange={() => {}} onPick={() => {}} />)
    );

    // Category headings are rendered.
    expect((await findAllByText(/wall/i)).length).toBeGreaterThan(0);
    expect((await findAllByText(/service/i)).length).toBeGreaterThan(0);

    // Every drill in the library renders.
    expect(await findByText('Wall rally')).toBeTruthy();
    expect(await findByText('Backhand rally')).toBeTruthy();
    expect(await findByText('Slice serve wide')).toBeTruthy();
    expect(await findByText('Flat 1st serve')).toBeTruthy();
  });

  it('calls onPick with the picked drill when a row is pressed', async () => {
    const drill = makeDrill({ id: 'w1', name: 'Wall rally', category: 'wall' });
    const onPick = jest.fn();
    const { findByTestId } = await render(
      wrap(
        <AddADrillSheet
          open
          drills={[drill]}
          onOpenChange={() => {}}
          onPick={onPick}
        />
      )
    );

    fireEvent.press(await findByTestId('add-a-drill-row-w1'));

    expect(onPick).toHaveBeenCalledTimes(1);
    expect(onPick).toHaveBeenCalledWith(drill);
  });

  it('passes open + onOpenChange to the underlying Sheet primitive', async () => {
    const onOpenChange = jest.fn();
    await render(
      wrap(
        <AddADrillSheet
          open
          drills={[]}
          onOpenChange={onOpenChange}
          onPick={() => {}}
        />
      )
    );
    const props = sheetProps[sheetProps.length - 1];
    expect(props.open).toBe(true);
    expect(props.onOpenChange).toBe(onOpenChange);
  });

  it('inherits drag-down / tap-outside dismissal from SheetLayout', async () => {
    // Sheet archetype non-negotiable per docs/conventions/navigation-surface.md:
    // dismissOnOverlayPress + dismissOnSnapToBottom must be true.
    await render(
      wrap(
        <AddADrillSheet open drills={[]} onOpenChange={() => {}} onPick={() => {}} />
      )
    );
    const props = sheetProps[sheetProps.length - 1];
    expect(props.dismissOnOverlayPress).toBe(true);
    expect(props.dismissOnSnapToBottom).toBe(true);
  });
});
