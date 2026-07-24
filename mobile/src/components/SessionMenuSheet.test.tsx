import { fireEvent, render } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { TamaguiProvider } from 'tamagui';
import tamaguiConfig from '../../tamagui.config';
import { colors } from '../theme';
import { SessionMenuSheet } from './SessionMenuSheet';

// Sheet primitive is Tamagui's concern (proven in SheetLayout tests). Here we
// mock it out so children render inline when `open` is true, and capture the
// props our sheet forwards to the primitive (used to assert dismissal wiring).
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

function flatStyle(node: any): Record<string, any> {
  return StyleSheet.flatten(node.props.style) ?? {};
}

function wrap(node: React.ReactNode) {
  return (
    <TamaguiProvider config={tamaguiConfig} defaultTheme="kabe_dark">
      {node}
    </TamaguiProvider>
  );
}

describe('SessionMenuSheet', () => {
  beforeEach(() => {
    sheetProps.length = 0;
  });

  it('renders an End Session row styled as danger when open', async () => {
    // primary-vs-annex.md § InSession-picker: End Session lives in the Session
    // menu sheet as a danger-styled row. Rendered via <Row variant="danger">.
    const { findByText } = await render(
      wrap(<SessionMenuSheet open onOpenChange={() => {}} onEndSession={() => {}} />)
    );
    const label = await findByText('End Session');
    expect(flatStyle(label).color).toBe(colors.danger);
  });

  it('calls onEndSession when the End Session row is pressed', async () => {
    const onEndSession = jest.fn();
    const { findByTestId } = await render(
      wrap(<SessionMenuSheet open onOpenChange={() => {}} onEndSession={onEndSession} />)
    );
    fireEvent.press(await findByTestId('session-menu-end-session'));
    expect(onEndSession).toHaveBeenCalledTimes(1);
  });

  it('forwards open and onOpenChange to the Sheet primitive (drag-down / tap-outside / hw-back)', async () => {
    // navigation-surface.md § Back / dismiss: bottom sheets dismiss on drag-down,
    // tap-outside, and hardware back. SheetLayout already wires the Sheet primitive
    // for these — here we confirm SessionMenuSheet propagates the open state through.
    const onOpenChange = jest.fn();
    await render(
      wrap(<SessionMenuSheet open onOpenChange={onOpenChange} onEndSession={() => {}} />)
    );
    const props = sheetProps[sheetProps.length - 1];
    expect(props.open).toBe(true);
    expect(props.onOpenChange).toBe(onOpenChange);
    expect(props.dismissOnOverlayPress).toBe(true);
    expect(props.dismissOnSnapToBottom).toBe(true);
  });
});
