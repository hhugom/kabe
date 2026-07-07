import { fireEvent, render } from '@testing-library/react-native';
import { useNavigation } from '@react-navigation/native';
import { getActiveSession, startSession } from '../use-cases/sessions';
import { HomeScreen } from './HomeScreen';

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));
jest.mock('../use-cases/sessions', () => ({
  getActiveSession: jest.fn(),
  startSession: jest.fn(),
}));
jest.mock('../db/client', () => ({
  getAppDb: jest.fn(() => null),
}));

const mockUseNavigation = useNavigation as jest.MockedFunction<typeof useNavigation>;
const mockGetActiveSession = getActiveSession as jest.MockedFunction<typeof getActiveSession>;
const mockStartSession = startSession as jest.MockedFunction<typeof startSession>;

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
    mockStartSession.mockReset();
    mockUseNavigation.mockReset();
  });

  it('renders "Start from Routine" as a secondary action when no session is active', async () => {
    mockGetActiveSession.mockResolvedValue(null);
    const navigation = makeNavigation();
    mockUseNavigation.mockReturnValue(navigation);

    const { findByText } = await render(<HomeScreen />);

    expect(await findByText('Start from Routine')).toBeTruthy();
  });

  it('tapping "Start from Routine" navigates to PickRoutine', async () => {
    mockGetActiveSession.mockResolvedValue(null);
    const navigation = makeNavigation();
    mockUseNavigation.mockReturnValue(navigation);

    const { findByText } = await render(<HomeScreen />);
    fireEvent.press(await findByText('Start from Routine'));

    expect(navigation.navigate).toHaveBeenCalledWith('PickRoutine');
  });
});
