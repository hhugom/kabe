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

  it('renders the "Kabe" chrome mark', async () => {
    // Per docs/conventions/primary-vs-annex.md § Home worked example: "Kabe" title is Chrome.
    const { getByText } = await render(<HomeScreen />);
    expect(getByText('Kabe')).toBeTruthy();
  });

  it('renders an empty-state message for recent practice', async () => {
    // Per docs/conventions/primary-vs-annex.md (updated by #8): Home's goal is "See recent practice".
    // With no sessions yet, the primary surface is an empty-state message.
    const { getByText } = await render(<HomeScreen />);
    expect(getByText('No recent practice yet')).toBeTruthy();
  });
});
