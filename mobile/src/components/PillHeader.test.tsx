import { fireEvent, render } from '@testing-library/react-native';
import { PillHeader } from './PillHeader';

describe('PillHeader', () => {
  it('renders the title in the header row', async () => {
    const { findByText } = await render(
      <PillHeader
        title="Edit routine"
        onBack={() => {}}
        sessionActive={false}
        onResumePress={() => {}}
      />
    );
    expect(await findByText('Edit routine')).toBeTruthy();
  });

  it('renders the ActiveSessionPill when a session is active', async () => {
    const { findByTestId } = await render(
      <PillHeader
        title="Edit routine"
        onBack={() => {}}
        sessionActive={true}
        onResumePress={() => {}}
      />
    );
    expect(await findByTestId('active-session-pill')).toBeTruthy();
  });

  it('omits the ActiveSessionPill when no session is active', async () => {
    const { queryByTestId } = await render(
      <PillHeader
        title="Edit routine"
        onBack={() => {}}
        sessionActive={false}
        onResumePress={() => {}}
      />
    );
    expect(queryByTestId('active-session-pill')).toBeNull();
  });

  it('pressing the pill fires onResumePress', async () => {
    const onResumePress = jest.fn();
    const { findByTestId } = await render(
      <PillHeader
        title="Edit routine"
        onBack={() => {}}
        sessionActive={true}
        onResumePress={onResumePress}
      />
    );
    fireEvent.press(await findByTestId('active-session-pill'));
    expect(onResumePress).toHaveBeenCalledTimes(1);
  });

  it('pressing the back button fires onBack', async () => {
    const onBack = jest.fn();
    const { findByTestId } = await render(
      <PillHeader
        title="Edit routine"
        onBack={onBack}
        sessionActive={false}
        onResumePress={() => {}}
      />
    );
    fireEvent.press(await findByTestId('pill-header-back'));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('renders the pill visually above the header row', async () => {
    // Stacking order per docs/conventions/navigation-surface.md § Active-session pill
    // (row "Stack push with RN header"): status bar → pill → header → content.
    // Verified structurally: pill is an earlier sibling than the header row inside the wrapper.
    const { findByTestId } = await render(
      <PillHeader
        title="Edit routine"
        onBack={() => {}}
        sessionActive={true}
        onResumePress={() => {}}
      />
    );
    const pill = await findByTestId('active-session-pill');
    const headerRow = await findByTestId('pill-header-row');
    const wrapper = pill.parent!;
    const children = wrapper.children as unknown as any[];
    const pillIndex = children.indexOf(pill);
    const headerIndex = children.indexOf(headerRow);
    expect(pillIndex).toBeGreaterThanOrEqual(0);
    expect(headerIndex).toBeGreaterThanOrEqual(0);
    expect(pillIndex).toBeLessThan(headerIndex);
  });
});
