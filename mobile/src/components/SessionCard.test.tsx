import { fireEvent, render } from '@testing-library/react-native';
import { TamaguiProvider } from 'tamagui';
import tamaguiConfig from '../../tamagui.config';
import { SessionCard } from './SessionCard';
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

describe('SessionCard', () => {
  it('shows the routine name, duration and every drill line when uncapped', async () => {
    const s = session({
      drills: [
        drill({ drillId: 'a', name: 'Chest pass', metric: 'reps', value: 24, target: 30 }),
        drill({ drillId: 'b', name: 'Wall hold', metric: 'duration', value: 45, target: 60 }),
      ],
    });
    const { getByText, getAllByTestId } = await render(wrap(<SessionCard session={s} />));

    expect(getByText('Wall warmup')).toBeTruthy();
    expect(getByText('42:00')).toBeTruthy(); // duration header
    expect(getAllByTestId('history-drill-row')).toHaveLength(2);
    expect(getByText('Chest pass')).toBeTruthy();
    expect(getByText('Wall hold')).toBeTruthy();
  });

  it('caps at maxDrills and reports the remainder as "+N more drills"', async () => {
    const s = session({
      drills: [
        drill({ drillId: 'a', name: 'First' }),
        drill({ drillId: 'b', name: 'Second' }),
        drill({ drillId: 'c', name: 'Third' }),
        drill({ drillId: 'd', name: 'Fourth' }),
        drill({ drillId: 'e', name: 'Fifth' }),
      ],
    });
    const { getByText, queryByText, getAllByTestId } = await render(
      wrap(<SessionCard session={s} maxDrills={3} />)
    );

    expect(getAllByTestId('history-drill-row')).toHaveLength(3);
    expect(getByText('First')).toBeTruthy();
    expect(getByText('Third')).toBeTruthy();
    expect(queryByText('Fourth')).toBeNull();
    expect(queryByText('Fifth')).toBeNull();
    expect(getByText('+2 more drills')).toBeTruthy();
  });

  it('shows no overflow row when the drill count is at or under the cap', async () => {
    const s = session({
      drills: [
        drill({ drillId: 'a', name: 'First' }),
        drill({ drillId: 'b', name: 'Second' }),
        drill({ drillId: 'c', name: 'Third' }),
      ],
    });
    const { queryByText, getAllByTestId } = await render(
      wrap(<SessionCard session={s} maxDrills={3} />)
    );

    expect(getAllByTestId('history-drill-row')).toHaveLength(3);
    expect(queryByText(/more drills/)).toBeNull();
  });
});
