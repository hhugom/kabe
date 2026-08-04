import { fireEvent, render } from '@testing-library/react-native';
import { TamaguiProvider } from 'tamagui';
import tamaguiConfig from '../../tamagui.config';
import { RecentPractice } from './RecentPractice';
import type { RecentSession } from '../use-cases/recent-sessions';

const NOW = new Date('2026-06-30T12:00:00.000Z');

function wrap(node: React.ReactNode) {
  return (
    <TamaguiProvider config={tamaguiConfig} defaultTheme="kabe_dark">
      {node}
    </TamaguiProvider>
  );
}

const session = (over: Partial<RecentSession> = {}): RecentSession => ({
  id: 's1',
  startedAt: '2026-06-30T09:00:00.000Z',
  routineName: 'Wall warmup',
  drillCount: 3,
  ...over,
});

describe('RecentPractice', () => {
  it('shows the empty state when there are no sessions', async () => {
    const { getByText } = await render(wrap(<RecentPractice sessions={[]} now={NOW} />));
    expect(getByText('No recent practice yet')).toBeTruthy();
  });

  it('renders one row per session with when label, routine, and drill count', async () => {
    // startedAt values are the NOW instant and exactly 24h before it, so the
    // Today/Yesterday labels hold in any runner timezone (no local-midnight straddle).
    const sessions = [
      session({ id: 'a', startedAt: '2026-06-30T12:00:00.000Z', routineName: 'Wall warmup', drillCount: 3 }),
      session({ id: 'b', startedAt: '2026-06-29T12:00:00.000Z', routineName: null, drillCount: 1 }),
    ];
    const { getAllByTestId, getByText } = await render(
      wrap(<RecentPractice sessions={sessions} now={NOW} />)
    );

    expect(getAllByTestId('recent-session-row')).toHaveLength(2);
    expect(getByText('Today')).toBeTruthy();
    expect(getByText('Yesterday')).toBeTruthy();
    expect(getByText('Wall warmup')).toBeTruthy();
    expect(getByText('Free session')).toBeTruthy();
    expect(getByText('3 drills')).toBeTruthy();
    expect(getByText('1 drill')).toBeTruthy(); // singular
  });

  it('does not show the "View history" link in the empty state', async () => {
    const { queryByText } = await render(wrap(<RecentPractice sessions={[]} now={NOW} />));
    expect(queryByText('View history')).toBeNull();
  });

  it('fires onViewHistory when the link is tapped', async () => {
    const onViewHistory = jest.fn();
    const { getByText } = await render(
      wrap(<RecentPractice sessions={[session()]} now={NOW} onViewHistory={onViewHistory} />)
    );
    fireEvent.press(getByText('View history'));
    expect(onViewHistory).toHaveBeenCalledTimes(1);
  });

  it('fires onOpenSession with the session id when a row is tapped', async () => {
    const onOpenSession = jest.fn();
    const { getAllByTestId } = await render(
      wrap(
        <RecentPractice
          sessions={[session({ id: 'sX' })]}
          now={NOW}
          onOpenSession={onOpenSession}
        />
      )
    );
    fireEvent.press(getAllByTestId('recent-session-row')[0]);
    expect(onOpenSession).toHaveBeenCalledWith('sX');
  });
});
