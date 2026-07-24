import { render } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { TamaguiProvider } from 'tamagui';
import tamaguiConfig from '../../tamagui.config';
import { colors } from '../theme';
import { RowsDemoScreen } from './RowsDemoScreen';

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

// Exercises the four Row shapes required by issue #11:
// sheet row, stack-push list row, drill card, danger row.
describe('RowsDemoScreen', () => {
  it('renders the sheet-row shape (PickRoutine "Empty start")', async () => {
    const { findByText } = await render(wrap(<RowsDemoScreen />));
    expect(await findByText('Empty start')).toBeTruthy();
  });

  it('renders the stack-push list-row shape (routine row with meta + trailing)', async () => {
    const { findByText } = await render(wrap(<RowsDemoScreen />));
    expect(await findByText('Wall warmup planned')).toBeTruthy();
    expect(await findByText('wall · 20 reps')).toBeTruthy();
    expect(await findByText('2 / 3')).toBeTruthy();
  });

  it('renders the drill-card shape (Drills annex)', async () => {
    const { findByText } = await render(wrap(<RowsDemoScreen />));
    expect(await findByText('Cross-court forehand')).toBeTruthy();
    expect(await findByText('wall · target 20')).toBeTruthy();
  });

  it('renders a danger-variant row (End Session) with the danger colour', async () => {
    const { findByText } = await render(wrap(<RowsDemoScreen />));
    expect(flatStyle(await findByText('End Session')).color).toBe(colors.danger);
  });
});
