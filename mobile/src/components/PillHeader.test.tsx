import { fireEvent, render } from '@testing-library/react-native';
import { PillHeader } from './PillHeader';
import { typography } from '../theme';

function flattenStyle(style: any): Record<string, any> {
  if (Array.isArray(style)) return Object.assign({}, ...style.map(flattenStyle));
  return style ?? {};
}

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

  it('renders the title at caption-tier Chrome sizing (small/quiet)', async () => {
    // navigation-surface.md § Header stance: "title — small/quiet Chrome … never the goal statement".
    const { findByText } = await render(
      <PillHeader
        title="Session"
        onBack={() => {}}
        sessionActive={false}
        onResumePress={() => {}}
      />
    );
    const titleEl = await findByText('Session');
    const style = flattenStyle(titleEl.props.style);
    expect(style.fontSize).toBe(typography.caption.fontSize);
    expect(style.color).toBe(typography.caption.color);
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

  it('renders the three-dot menu affordance when onMenuPress is provided', async () => {
    const { findByTestId } = await render(
      <PillHeader
        title="Session"
        onBack={() => {}}
        sessionActive={false}
        onResumePress={() => {}}
        onMenuPress={() => {}}
      />
    );
    expect(await findByTestId('pill-header-menu')).toBeTruthy();
  });

  it('omits the three-dot menu affordance when onMenuPress is not provided', async () => {
    const { queryByTestId } = await render(
      <PillHeader
        title="New routine"
        onBack={() => {}}
        sessionActive={false}
        onResumePress={() => {}}
      />
    );
    expect(queryByTestId('pill-header-menu')).toBeNull();
  });

  it('pressing the three-dot menu fires onMenuPress', async () => {
    const onMenuPress = jest.fn();
    const { findByTestId } = await render(
      <PillHeader
        title="Session"
        onBack={() => {}}
        sessionActive={false}
        onResumePress={() => {}}
        onMenuPress={onMenuPress}
      />
    );
    fireEvent.press(await findByTestId('pill-header-menu'));
    expect(onMenuPress).toHaveBeenCalledTimes(1);
  });

  it('back button reaches a 56dp tap target via hit-slop', async () => {
    // navigation-surface.md § Back / dismiss: "56dp tap target via hit-slop
    // even though the icon itself is smaller."
    const { findByTestId } = await render(
      <PillHeader
        title="Session"
        onBack={() => {}}
        sessionActive={false}
        onResumePress={() => {}}
      />
    );
    const back = await findByTestId('pill-header-back');
    const style = flattenStyle(back.props.style);
    const raw = back.props.hitSlop ?? 0;
    const slop =
      typeof raw === 'number' ? { top: raw, bottom: raw, left: raw, right: raw } : raw;
    const width = style.width ?? 0;
    const height = style.height ?? 0;
    expect(width + (slop.left ?? 0) + (slop.right ?? 0)).toBe(56);
    expect(height + (slop.top ?? 0) + (slop.bottom ?? 0)).toBe(56);
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
