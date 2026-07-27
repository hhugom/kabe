import { fireEvent, render } from '@testing-library/react-native';
import { HomeScreen } from './HomeScreen';
import { SessionActionsProvider } from '../components/session-actions';

async function renderHome(
  overrides: Partial<{
    sessionActive: boolean;
    onStartPress: () => void;
    onResumePress: () => void;
  }> = {}
) {
  const value = {
    sessionActive: false,
    onStartPress: jest.fn(),
    onResumePress: jest.fn(),
    ...overrides,
  };
  const rendered = await render(
    <SessionActionsProvider value={value}>
      <HomeScreen />
    </SessionActionsProvider>
  );
  return { value, ...rendered };
}

describe('HomeScreen', () => {
  it('renders the "Kabe" chrome mark', async () => {
    // Per docs/conventions/primary-vs-annex.md § Home worked example.
    const { getByText } = await renderHome();
    expect(getByText('Kabe')).toBeTruthy();
  });

  it('renders a Start-a-Session hero when no session is active', async () => {
    // Per docs/conventions/navigation-surface.md § Home Start hero: Home hosts the
    // Start-a-Session primary action as a top-of-screen hero card (replaces the
    // retired tab-bar center button from #8).
    const { getByTestId, getByText } = await renderHome({ sessionActive: false });
    expect(getByTestId('home-hero-start')).toBeTruthy();
    expect(getByText('Start a session')).toBeTruthy();
  });

  it('morphs the hero to Resume when a session is active', async () => {
    // Same slot, amber treatment — the resume affordance on tab-roots.
    const { getByTestId, getByText, queryByTestId } = await renderHome({ sessionActive: true });
    expect(getByTestId('home-hero-resume')).toBeTruthy();
    expect(getByText('Resume session')).toBeTruthy();
    expect(queryByTestId('home-hero-start')).toBeNull();
  });

  it('tapping the Start hero calls onStartPress', async () => {
    const onStartPress = jest.fn();
    const { getByTestId } = await renderHome({ sessionActive: false, onStartPress });
    fireEvent.press(getByTestId('home-hero-start'));
    expect(onStartPress).toHaveBeenCalledTimes(1);
  });

  it('tapping the Resume hero calls onResumePress', async () => {
    const onResumePress = jest.fn();
    const { getByTestId } = await renderHome({ sessionActive: true, onResumePress });
    fireEvent.press(getByTestId('home-hero-resume'));
    expect(onResumePress).toHaveBeenCalledTimes(1);
  });

  it('renders a Recent practice section with an empty-state message', async () => {
    // Home's secondary surface (dashboard content) — matches "See recent practice" from #8.
    const { getByText } = await renderHome();
    expect(getByText('Recent practice')).toBeTruthy();
    expect(getByText('No recent practice yet')).toBeTruthy();
  });

});
