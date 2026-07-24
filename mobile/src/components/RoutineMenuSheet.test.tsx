import { fireEvent, render } from '@testing-library/react-native';
import { TamaguiProvider } from 'tamagui';
import tamaguiConfig from '../../tamagui.config';
import { RoutineMenuSheet } from './RoutineMenuSheet';

// Sheet primitive is Tamagui's concern (proven in SheetLayout tests). Here we
// mock it out so children render inline when `open` is true and we can capture
// the Sheet props RoutineMenuSheet passes through (drag-down / tap-outside).
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

function wrap(node: React.ReactNode) {
  return (
    <TamaguiProvider config={tamaguiConfig} defaultTheme="kabe_dark">
      {node}
    </TamaguiProvider>
  );
}

describe('RoutineMenuSheet', () => {
  beforeEach(() => {
    sheetProps.length = 0;
  });

  it('renders an Archive row when open', async () => {
    const { findByText } = await render(
      wrap(
        <RoutineMenuSheet open onOpenChange={() => {}} onArchive={() => {}} />
      )
    );
    expect(await findByText('Archive routine')).toBeTruthy();
  });

  it('calls onArchive when the Archive row is pressed', async () => {
    const onArchive = jest.fn();
    const { findByTestId } = await render(
      wrap(
        <RoutineMenuSheet open onOpenChange={() => {}} onArchive={onArchive} />
      )
    );
    fireEvent.press(await findByTestId('routine-menu-archive'));
    expect(onArchive).toHaveBeenCalledTimes(1);
  });

  it('passes drag-down / tap-outside dismissal + open/onOpenChange through the Sheet primitive', async () => {
    // Dismissal flags are owned by SheetLayout; the sheet component just has to
    // route through it. Guards against a future refactor that drops SheetLayout.
    const onOpenChange = jest.fn();
    await render(
      wrap(
        <RoutineMenuSheet open onOpenChange={onOpenChange} onArchive={() => {}} />
      )
    );
    const props = sheetProps[sheetProps.length - 1];
    expect(props.dismissOnOverlayPress).toBe(true);
    expect(props.dismissOnSnapToBottom).toBe(true);
    expect(props.open).toBe(true);
    expect(props.onOpenChange).toBe(onOpenChange);
  });
});
