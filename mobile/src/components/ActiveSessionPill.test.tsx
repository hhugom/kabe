import { fireEvent, render } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { ActiveSessionPill } from './ActiveSessionPill';
import { colors } from '../theme';

function flatStyle(node: any): Record<string, any> {
  return StyleSheet.flatten(node.props.style) ?? {};
}

describe('ActiveSessionPill', () => {
  it('renders the "Resume Session" label with a play-arrow Icon', async () => {
    const { findByText } = await render(<ActiveSessionPill onPress={() => {}} />);
    expect(await findByText('Resume Session')).toBeTruthy();
  });

  it('fires onPress when tapped', async () => {
    const onPress = jest.fn();
    const { findByText } = await render(<ActiveSessionPill onPress={onPress} />);
    fireEvent.press(await findByText('Resume Session'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('meets the ≥56dp at-the-court tap-target minimum', async () => {
    const { findByTestId } = await render(<ActiveSessionPill onPress={() => {}} />);
    const style = flatStyle(await findByTestId('active-session-pill'));
    expect(style.minHeight).toBeGreaterThanOrEqual(56);
  });

  it('uses the accentAmber background from the locked palette', async () => {
    const { findByTestId } = await render(<ActiveSessionPill onPress={() => {}} />);
    const style = flatStyle(await findByTestId('active-session-pill'));
    expect(style.backgroundColor).toBe(colors.accentAmber);
  });

  it('renders label text in onAmber (black) for AAA contrast on amber', async () => {
    const { findByText } = await render(<ActiveSessionPill onPress={() => {}} />);
    const style = flatStyle(await findByText('Resume Session'));
    expect(style.color).toBe(colors.onAmber);
  });

  it('spans full width of its parent', async () => {
    const { findByTestId } = await render(<ActiveSessionPill onPress={() => {}} />);
    const style = flatStyle(await findByTestId('active-session-pill'));
    expect(style.width).toBe('100%');
  });
});
