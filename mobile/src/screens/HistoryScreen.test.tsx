import { render } from '@testing-library/react-native';
import { HistoryScreen } from './HistoryScreen';
import type { HistorySession } from '../use-cases/session-history';
import { listSessionHistory } from '../use-cases/session-history';

jest.mock('../db/client', () => ({ getAppDb: jest.fn(() => null) }));
jest.mock('../use-cases/session-history', () => ({ listSessionHistory: jest.fn() }));

const mockList = listSessionHistory as jest.MockedFunction<typeof listSessionHistory>;

beforeEach(() => {
  mockList.mockReset();
  mockList.mockResolvedValue([]);
});

const session = (over: Partial<HistorySession> = {}): HistorySession => ({
  id: 's1',
  startedAt: '2026-06-30T12:00:00.000Z',
  endedAt: '2026-06-30T12:42:00.000Z',
  routineName: 'Wall warmup',
  drills: [],
  ...over,
});

describe('HistoryScreen', () => {
  it('shows the empty state when there is no history', async () => {
    mockList.mockResolvedValue([]);
    const { findByText } = await render(<HistoryScreen />);
    expect(await findByText('No practice logged yet')).toBeTruthy();
  });

  it('lists sessions fetched from the history use-case', async () => {
    mockList.mockResolvedValue([session({ routineName: 'Wall warmup' })]);
    const { findByText } = await render(<HistoryScreen />);
    expect(await findByText('Wall warmup')).toBeTruthy();
  });
});
