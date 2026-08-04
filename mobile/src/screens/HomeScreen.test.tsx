import { fireEvent, render } from '@testing-library/react-native';
import { TamaguiProvider } from 'tamagui';
import tamaguiConfig from '../../tamagui.config';
import { HomeScreen } from './HomeScreen';
import { SessionActionsProvider } from '../components/session-actions';
import type { RecentSession } from '../use-cases/recent-sessions';
import { listRecentSessions } from '../use-cases/recent-sessions';

jest.mock('../db/client', () => ({ getAppDb: jest.fn(() => null) }));
jest.mock('../use-cases/recent-sessions', () => ({ listRecentSessions: jest.fn() }));

const mockListRecentSessions = listRecentSessions as jest.MockedFunction<
  typeof listRecentSessions
>;

beforeEach(() => {
  mockListRecentSessions.mockReset();
  mockListRecentSessions.mockResolvedValue([]);
});

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
    // TamaguiProvider mirrors App.tsx — Home hosts the Tamagui-based Row primitive
    // via the RecentPractice section (issue #45).
    <TamaguiProvider config={tamaguiConfig} defaultTheme="kabe_dark">
      <SessionActionsProvider value={value}>
        <HomeScreen />
      </SessionActionsProvider>
    </TamaguiProvider>
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

  it('renders the Recent practice section header', async () => {
    // Home's secondary surface (dashboard content) — matches "See recent practice" from #8.
    const { findByText } = await renderHome();
    expect(await findByText('Recent practice')).toBeTruthy();
  });

  it('renders the "No recent practice yet" empty state when there are none', async () => {
    mockListRecentSessions.mockResolvedValue([]);
    const { findByText } = await renderHome();
    expect(await findByText('No recent practice yet')).toBeTruthy();
  });

  it('lists recent sessions when there are some', async () => {
    const session: RecentSession = {
      id: 's1',
      startedAt: '2026-06-30T09:00:00.000Z',
      routineName: 'Wall warmup',
      drillCount: 3,
    };
    mockListRecentSessions.mockResolvedValue([session]);
    const { findAllByTestId, getByText } = await renderHome();

    expect(await findAllByTestId('recent-session-row')).toHaveLength(1);
    expect(getByText('Wall warmup')).toBeTruthy();
    expect(getByText('3 drills')).toBeTruthy();
  });

});
