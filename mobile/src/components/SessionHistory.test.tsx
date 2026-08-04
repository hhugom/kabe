import { fireEvent, render } from '@testing-library/react-native';
import { TamaguiProvider } from 'tamagui';
import tamaguiConfig from '../../tamagui.config';
import { SessionHistory } from './SessionHistory';
import type { HistoryDrill, HistorySession } from '../use-cases/session-history';

const drill = (over: Partial<HistoryDrill> = {}): HistoryDrill => ({
  drillId: 'd1',
  name: 'A drill',
  metric: 'reps',
  value: 24,
  attempted: null,
  target: 30,
  ...over,
});

const NOW = new Date('2026-06-30T12:00:00.000Z');

function wrap(node: React.ReactNode) {
  return (
    <TamaguiProvider config={tamaguiConfig} defaultTheme="kabe_dark">
      {node}
    </TamaguiProvider>
  );
}

const session = (over: Partial<HistorySession> = {}): HistorySession => ({
  id: 's1',
  startedAt: '2026-06-30T12:00:00.000Z',
  endedAt: '2026-06-30T12:42:00.000Z',
  routineName: 'Wall warmup',
  drills: [],
  ...over,
});

describe('SessionHistory', () => {
  it('shows an empty state when there is no history', async () => {
    const { getByText } = await render(wrap(<SessionHistory sessions={[]} now={NOW} />));
    expect(getByText('No practice logged yet')).toBeTruthy();
  });

  it('groups sessions under relative-day headers and shows routine + duration', async () => {
    // startedAt at the NOW instant and 24h before, so Today/Yesterday hold in any timezone.
    const sessions = [
      session({ id: 'a', startedAt: '2026-06-30T12:00:00.000Z', endedAt: '2026-06-30T12:42:00.000Z', routineName: 'Wall warmup' }),
      session({ id: 'b', startedAt: '2026-06-29T12:00:00.000Z', endedAt: '2026-06-29T12:15:00.000Z', routineName: null }),
    ];
    const { getAllByTestId, getByText } = await render(wrap(<SessionHistory sessions={sessions} now={NOW} />));

    expect(getAllByTestId('history-session-card')).toHaveLength(2);
    expect(getByText('Today')).toBeTruthy();
    expect(getByText('Yesterday')).toBeTruthy();
    expect(getByText('Wall warmup')).toBeTruthy();
    expect(getByText('Free session')).toBeTruthy(); // null routine
    expect(getByText('42:00')).toBeTruthy(); // duration in the same m:ss standard as drill times
  });

  it('renders an accuracy drill line with actual% and target% in separate columns', async () => {
    const sessions = [
      session({ drills: [drill({ name: 'Split step', metric: 'accuracy', value: 28, attempted: 32, target: 90 })] }),
    ];
    const { getByText } = await render(wrap(<SessionHistory sessions={sessions} now={NOW} />));

    expect(getByText('Split step')).toBeTruthy();
    expect(getByText('88%')).toBeTruthy(); // actual column
    expect(getByText('90%')).toBeTruthy(); // target column
  });

  it('renders reps and duration drills as actual and target columns in their units', async () => {
    const sessions = [
      session({
        drills: [
          drill({ name: 'Chest pass', metric: 'reps', value: 24, target: 30 }),
          drill({ drillId: 'd2', name: 'Wall hold', metric: 'duration', value: 45, target: 60 }),
        ],
      }),
    ];
    const { getByText } = await render(wrap(<SessionHistory sessions={sessions} now={NOW} />));

    expect(getByText('24')).toBeTruthy(); // reps actual
    expect(getByText('30')).toBeTruthy(); // reps target
    expect(getByText('0:45')).toBeTruthy(); // duration actual
    expect(getByText('1:00')).toBeTruthy(); // duration target
  });

  it('fires onOpenSession with the session id when a card is tapped', async () => {
    const onOpenSession = jest.fn();
    const { getAllByTestId } = await render(
      wrap(<SessionHistory sessions={[session({ id: 'sX' })]} now={NOW} onOpenSession={onOpenSession} />)
    );
    fireEvent.press(getAllByTestId('history-session-card')[0]);
    expect(onOpenSession).toHaveBeenCalledWith('sX');
  });
});
