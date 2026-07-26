import { fireEvent, render } from '@testing-library/react-native';
import { TamaguiProvider } from 'tamagui';
import tamaguiConfig from '../../tamagui.config';
import { RoutineMenuSheet } from './RoutineMenuSheet';

// Sheet primitive is Tamagui's concern (proven in SheetLayout tests). Mock it so
// children render inline when `open` is true. Mirrors SessionMenuSheet.test.tsx.
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

function wrap(node: React.ReactNode) {
  return (
    <TamaguiProvider config={tamaguiConfig} defaultTheme="kabe_dark">
      {node}
    </TamaguiProvider>
  );
}

describe('RoutineMenuSheet', () => {
  it('renders an "Archive" row when open', async () => {
    const { findByText } = await render(
      wrap(<RoutineMenuSheet open onOpenChange={() => {}} onArchive={() => {}} />)
    );
    expect(await findByText('Archive')).toBeTruthy();
  });

  it('fires onArchive when the Archive row is tapped', async () => {
    const onArchive = jest.fn();
    const { findByText } = await render(
      wrap(<RoutineMenuSheet open onOpenChange={() => {}} onArchive={onArchive} />)
    );
    fireEvent.press(await findByText('Archive'));
    expect(onArchive).toHaveBeenCalledTimes(1);
  });
});
