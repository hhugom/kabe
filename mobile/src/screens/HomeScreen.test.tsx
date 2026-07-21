import { fireEvent, render } from '@testing-library/react-native';
import { useNavigation } from '@react-navigation/native';
import { getActiveSession } from '../use-cases/sessions';
import { HomeScreen } from './HomeScreen';

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));
jest.mock('../use-cases/sessions', () => ({
  getActiveSession: jest.fn(),
}));
jest.mock('../db/client', () => ({
  getAppDb: jest.fn(() => null),
}));

const mockUseNavigation = useNavigation as jest.MockedFunction<typeof useNavigation>;
const mockGetActiveSession = getActiveSession as jest.MockedFunction<typeof getActiveSession>;

const NOW = '2026-07-21T00:00:00.000Z';

function makeNavigation() {
  const nav: any = {
    navigate: jest.fn(),
    addListener: jest.fn((_event: string, _cb: () => void) => () => {}),
  };
  return nav;
}

describe('HomeScreen', () => {
  beforeEach(() => {
    mockGetActiveSession.mockReset();
    mockUseNavigation.mockReset();
  });

  it('renders the "Resume Session" card when a session is active', async () => {
    mockGetActiveSession.mockResolvedValue({
      session: {
        id: 'sess-1',
        startedAt: NOW,
        endedAt: null,
        routineId: null,
        notes: null,
        createdAt: NOW,
        updatedAt: NOW,
        deletedAt: null,
      },
      entries: [],
    });
    const navigation = makeNavigation();
    mockUseNavigation.mockReturnValue(navigation);

    const { findByText } = await render(<HomeScreen />);

    expect(await findByText('Resume Session')).toBeTruthy();
  });

  it('tapping the Resume card navigates to InSession', async () => {
    mockGetActiveSession.mockResolvedValue({
      session: {
        id: 'sess-1',
        startedAt: NOW,
        endedAt: null,
        routineId: null,
        notes: null,
        createdAt: NOW,
        updatedAt: NOW,
        deletedAt: null,
      },
      entries: [],
    });
    const navigation = makeNavigation();
    mockUseNavigation.mockReturnValue(navigation);

    const { findByText } = await render(<HomeScreen />);
    fireEvent.press(await findByText('Resume Session'));

    expect(navigation.navigate).toHaveBeenCalledWith('InSession');
  });
});
