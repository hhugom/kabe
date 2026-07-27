import { fireEvent, render } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { HomeStartHero } from './HomeStartHero';
import { SessionActionsProvider, type SessionActions } from './session-actions';
import { colors } from '../theme';

function flatStyle(node: any): Record<string, any> {
  return StyleSheet.flatten(node.props.style) ?? {};
}

async function renderHero(overrides: Partial<SessionActions> = {}) {
  const value: SessionActions = {
    sessionActive: false,
    onStartPress: jest.fn(),
    onResumePress: jest.fn(),
    ...overrides,
  };
  const rendered = await render(
    <SessionActionsProvider value={value}>
      <HomeStartHero />
    </SessionActionsProvider>
  );
  return { value, ...rendered };
}

describe('HomeStartHero', () => {
  it('renders the Start affordance with accent-cyan fill when idle', async () => {
    const { getByTestId, getByText } = await renderHero({ sessionActive: false });
    expect(getByText('Start a session')).toBeTruthy();
    expect(flatStyle(getByTestId('home-hero-start')).backgroundColor).toBe(colors.accent);
  });

  it('morphs to Resume with amber fill when a session is active', async () => {
    // Amber = "attention, but not destructive" (aesthetic-direction.md).
    const { getByTestId, getByText } = await renderHero({ sessionActive: true });
    expect(getByText('Resume session')).toBeTruthy();
    expect(flatStyle(getByTestId('home-hero-resume')).backgroundColor).toBe(
      colors.accentAmber
    );
  });

  it('routes Start taps to onStartPress and Resume taps to onResumePress', async () => {
    const onStartPress = jest.fn();
    const idle = await renderHero({ sessionActive: false, onStartPress });
    fireEvent.press(idle.getByTestId('home-hero-start'));
    expect(onStartPress).toHaveBeenCalledTimes(1);

    const onResumePress = jest.fn();
    const active = await renderHero({ sessionActive: true, onResumePress });
    fireEvent.press(active.getByTestId('home-hero-resume'));
    expect(onResumePress).toHaveBeenCalledTimes(1);
  });

});
