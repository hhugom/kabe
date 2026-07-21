import { render } from '@testing-library/react-native';
import { Text } from 'react-native';
import { TamaguiProvider } from 'tamagui';
import tamaguiConfig from '../../tamagui.config';

// Capture the props our layout passes to the Tamagui Sheet primitive.
// Dismissal itself is Tamagui's job — we only own the contract: pass the flags.
const sheetProps: any[] = [];
jest.mock('tamagui', () => {
  const actual = jest.requireActual('tamagui');
  function MockSheet(props: any) {
    sheetProps.push(props);
    return props.open ? props.children : null;
  }
  MockSheet.Overlay = (p: any) => null;
  MockSheet.Handle = (p: any) => null;
  MockSheet.Frame = ({ children }: any) => children;
  return { ...actual, Sheet: MockSheet };
});

import { SheetLayout } from './SheetLayout';

function wrap(node: React.ReactNode) {
  return (
    <TamaguiProvider config={tamaguiConfig} defaultTheme="kabe_dark">
      {node}
    </TamaguiProvider>
  );
}

describe('SheetLayout', () => {
  beforeEach(() => {
    sheetProps.length = 0;
  });

  it('renders the title and children when open', async () => {
    const { findByText } = await render(
      wrap(
        <SheetLayout open onOpenChange={() => {}} title="Pick a routine">
          <Text>routine-row</Text>
        </SheetLayout>
      )
    );
    expect(await findByText('Pick a routine')).toBeTruthy();
    expect(await findByText('routine-row')).toBeTruthy();
  });

  it('configures the Sheet primitive to dismiss on overlay press and drag-down', async () => {
    await render(
      wrap(
        <SheetLayout open onOpenChange={() => {}} title="x">
          <Text>x</Text>
        </SheetLayout>
      )
    );
    const props = sheetProps[sheetProps.length - 1];
    expect(props.dismissOnOverlayPress).toBe(true);
    expect(props.dismissOnSnapToBottom).toBe(true);
  });

  it('passes open and onOpenChange through to the Sheet primitive', async () => {
    const onOpenChange = jest.fn();
    await render(
      wrap(
        <SheetLayout open onOpenChange={onOpenChange} title="x">
          <Text>x</Text>
        </SheetLayout>
      )
    );
    const props = sheetProps[sheetProps.length - 1];
    expect(props.open).toBe(true);
    expect(props.onOpenChange).toBe(onOpenChange);
  });
});
