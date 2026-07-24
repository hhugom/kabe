import { fireEvent, render } from '@testing-library/react-native';
import { TamaguiProvider } from 'tamagui';
import tamaguiConfig from '../../tamagui.config';
import { SessionMenuSheet } from './SessionMenuSheet';

// Sheet primitive is Tamagui's concern (proven in SheetLayout tests). Mock it so
// children render inline when `open` is true. Mirrors PickRoutineSheet.test.tsx.
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

describe('SessionMenuSheet', () => {
  it('renders an "End Session" row when open', async () => {
    const { findByText } = await render(
      wrap(<SessionMenuSheet open onOpenChange={() => {}} onEndSession={() => {}} />)
    );
    expect(await findByText('End Session')).toBeTruthy();
  });
});
