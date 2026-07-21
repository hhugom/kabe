import { fireEvent, render } from '@testing-library/react-native';
import { TamaguiProvider } from 'tamagui';
import tamaguiConfig from '../../tamagui.config';
import { ArchetypesDemoScreen } from './ArchetypesDemoScreen';

function wrap(node: React.ReactNode) {
  return (
    <TamaguiProvider config={tamaguiConfig} defaultTheme="kabe_dark">
      {node}
    </TamaguiProvider>
  );
}

function makeProps() {
  return {
    navigation: { goBack: jest.fn(), navigate: jest.fn() } as any,
    route: { key: 'k', name: 'ArchetypesDemo' } as any,
  };
}

describe('ArchetypesDemoScreen', () => {
  it('shows a menu button for each of the four archetypes', async () => {
    const { findByText } = await render(wrap(<ArchetypesDemoScreen {...makeProps()} />));
    expect(await findByText('Show Tab-root')).toBeTruthy();
    expect(await findByText('Show Stack-push')).toBeTruthy();
    expect(await findByText('Show Sheet')).toBeTruthy();
    expect(await findByText('Show Modal')).toBeTruthy();
  });

  it('tapping "Show Tab-root" renders the TabRootLayout Chrome mark', async () => {
    const { findByText } = await render(wrap(<ArchetypesDemoScreen {...makeProps()} />));
    fireEvent.press(await findByText('Show Tab-root'));
    expect(await findByText('Kabe')).toBeTruthy();
  });

  it('tapping "Show Stack-push" renders the StackPushLayout with a demo primary button', async () => {
    const { findByText } = await render(wrap(<ArchetypesDemoScreen {...makeProps()} />));
    fireEvent.press(await findByText('Show Stack-push'));
    expect(await findByText('Save (demo)')).toBeTruthy();
  });

  it('tapping "Show Sheet" opens the sheet with its demo title', async () => {
    const { findByText } = await render(wrap(<ArchetypesDemoScreen {...makeProps()} />));
    fireEvent.press(await findByText('Show Sheet'));
    expect(await findByText('Sheet (demo)')).toBeTruthy();
  });

  it('tapping "Show Modal" opens the modal with its demo title', async () => {
    const { findByText } = await render(wrap(<ArchetypesDemoScreen {...makeProps()} />));
    fireEvent.press(await findByText('Show Modal'));
    expect(await findByText('Modal (demo)')).toBeTruthy();
  });
});
