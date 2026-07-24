import { fireEvent, render } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { Text } from 'tamagui';
import { TamaguiProvider } from 'tamagui';
import tamaguiConfig from '../../tamagui.config';
import { colors } from '../theme';
import { Row } from './Row';

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

describe('Row', () => {
  it('renders its title text', async () => {
    const { findByText } = await render(wrap(<Row title="Wall warmup" />));
    expect(await findByText('Wall warmup')).toBeTruthy();
  });

  it('calls onPress when pressed', async () => {
    const onPress = jest.fn();
    const { findByTestId } = await render(
      wrap(<Row title="Empty start" onPress={onPress} />)
    );
    fireEvent.press(await findByTestId('row'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('renders meta text below the title when provided', async () => {
    const { findByText } = await render(
      wrap(<Row title="Wall warmup" meta="wall · 20 reps" />)
    );
    expect(await findByText('Wall warmup')).toBeTruthy();
    expect(await findByText('wall · 20 reps')).toBeTruthy();
  });

  it('renders a leading icon when leading prop is provided', async () => {
    const { findByTestId } = await render(
      wrap(<Row title="End Session" leading="play-arrow" />)
    );
    expect(await findByTestId('row-leading-icon')).toBeTruthy();
  });

  it('renders the trailing affordance when provided', async () => {
    const trailing = <Text testID="row-trailing-badge">2 / 3</Text>;
    const { findByTestId, findByText } = await render(
      wrap(<Row title="Wall warmup" trailing={trailing} />)
    );
    expect(await findByTestId('row-trailing-badge')).toBeTruthy();
    expect(await findByText('2 / 3')).toBeTruthy();
  });

  it('exposes a ≥ 48 dp tap target (annex ergonomic minimum)', async () => {
    // docs/conventions/ergonomic-minima.md: annex floor is 48 dp; every Row
    // variant must clear it regardless of the caller's supplied content.
    const { findByTestId } = await render(wrap(<Row title="Wall warmup" />));
    const style = flatStyle(await findByTestId('row'));
    expect(style.minHeight).toBeGreaterThanOrEqual(48);
  });

  it('renders title in colors.danger when variant="danger"', async () => {
    // docs/conventions/aesthetic-direction.md: `danger` (#FF6B6B) is the token
    // for destructive rows. On `surface` (#151E27) it clears AAA contrast.
    const { findByText } = await render(
      wrap(<Row title="End Session" variant="danger" />)
    );
    expect(flatStyle(await findByText('End Session')).color).toBe(colors.danger);
  });
});
