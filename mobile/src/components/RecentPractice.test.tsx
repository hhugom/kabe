import { fireEvent, render } from '@testing-library/react-native';
import { TamaguiProvider } from 'tamagui';
import tamaguiConfig from '../../tamagui.config';
import { RecentPractice } from './RecentPractice';
import type { HistoryDrill, HistorySession } from '../use-cases/session-history';

const NOW = new Date('2026-06-30T12:00:00.000Z');

function wrap(node: React.ReactNode) {
  return (
    <TamaguiProvider config={tamaguiConfig} defaultTheme="kabe_dark">
      {node}
    </TamaguiProvider>
  );
}

const drill = (over: Partial<HistoryDrill> = {}): HistoryDrill => ({
  drillId: 'd1',
  name: 'A drill',
  metric: 'reps',
  value: 24,
  attempted: null,
  target: 30,
  ...over,
});

const session = (over: Partial<HistorySession> = {}): HistorySession => ({
  id: 's1',
  startedAt: '2026-06-30T12:00:00.000Z',
  endedAt: '2026-06-30T12:42:00.000Z',
  routineName: 'Wall warmup',
  drills: [],
  ...over,
});

describe('RecentPractice', () => {
  it('shows the empty state when there are no sessions', async () => {
    const { getByText } = await render(wrap(<RecentPractice sessions={[]} now={NOW} />));
    expect(getByText('No recent practice yet')).toBeTruthy();
  });

  it('renders one SessionCard per session, capped at three drills', async () => {
    const sessions = [
      session({ id: 'a', routineName: 'Wall warmup' }),
      session({
        id: 'b',
        routineName: null,
        drills: [
          drill({ drillId: '1', name: 'First' }),
          drill({ drillId: '2', name: 'Second' }),
          drill({ drillId: '3', name: 'Third' }),
          drill({ drillId: '4', name: 'Fourth' }),
        ],
      }),
    ];
    const { getAllByTestId, getByText, queryByText } = await render(
      wrap(<RecentPractice sessions={sessions} now={NOW} />)
    );

    expect(getAllByTestId('history-session-card')).toHaveLength(2);
    expect(getByText('Wall warmup')).toBeTruthy();
    expect(getByText('Free session')).toBeTruthy();
    // The four-drill session shows the first three and collapses the rest.
    expect(getByText('First')).toBeTruthy();
    expect(getByText('Third')).toBeTruthy();
    expect(queryByText('Fourth')).toBeNull();
    expect(getByText('+1 more drills')).toBeTruthy();
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

  it('fires onOpenSession with the session id when a card is tapped', async () => {
    const onOpenSession = jest.fn();
    const { getAllByTestId } = await render(
      wrap(
        <RecentPractice sessions={[session({ id: 'sX' })]} now={NOW} onOpenSession={onOpenSession} />
      )
    );
    fireEvent.press(getAllByTestId('history-session-card')[0]);
    expect(onOpenSession).toHaveBeenCalledWith('sX');
  });
});
