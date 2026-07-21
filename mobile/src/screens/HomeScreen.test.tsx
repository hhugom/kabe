import { render } from '@testing-library/react-native';
import { HomeScreen } from './HomeScreen';

describe('HomeScreen', () => {
  it('does not render an in-content Resume Session card', async () => {
    // Per docs/conventions/navigation-surface.md § Active-session pill (row "Tab-root"):
    // resume affordance on tab-roots is the morphed tab-bar center button, not any in-content card/pill.
    const { queryByText } = await render(<HomeScreen />);
    expect(queryByText('Resume Session')).toBeNull();
    expect(queryByText('Session in progress')).toBeNull();
  });
});
