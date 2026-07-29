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
      <PillHeader title="Edit routine" onBack={() => {}} />
    );
    expect(await findByText('Edit routine')).toBeTruthy();
  });

  it('renders the title at caption-tier Chrome sizing (small/quiet)', async () => {
    // navigation-surface.md § Header stance: "title — small/quiet Chrome … never the goal statement".
    const { findByText } = await render(
      <PillHeader title="Session" onBack={() => {}} />
    );
    const titleEl = await findByText('Session');
    const style = flattenStyle(titleEl.props.style);
    expect(style.fontSize).toBe(typography.caption.fontSize);
    expect(style.color).toBe(typography.caption.color);
  });

  it('pressing the back button fires onBack', async () => {
    const onBack = jest.fn();
    const { findByTestId } = await render(
      <PillHeader title="Edit routine" onBack={onBack} />
    );
    fireEvent.press(await findByTestId('pill-header-back'));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('renders the three-dot menu affordance when onMenuPress is provided', async () => {
    const { findByTestId } = await render(
      <PillHeader title="Session" onBack={() => {}} onMenuPress={() => {}} />
    );
    expect(await findByTestId('pill-header-menu')).toBeTruthy();
  });

  it('omits the three-dot menu affordance when onMenuPress is not provided', async () => {
    const { queryByTestId } = await render(
      <PillHeader title="New routine" onBack={() => {}} />
    );
    expect(queryByTestId('pill-header-menu')).toBeNull();
  });

  it('pressing the three-dot menu fires onMenuPress', async () => {
    const onMenuPress = jest.fn();
    const { findByTestId } = await render(
      <PillHeader title="Session" onBack={() => {}} onMenuPress={onMenuPress} />
    );
    fireEvent.press(await findByTestId('pill-header-menu'));
    expect(onMenuPress).toHaveBeenCalledTimes(1);
  });

  it('back button reaches a 56dp tap target via hit-slop', async () => {
    // navigation-surface.md § Back / dismiss: "56dp tap target via hit-slop
    // even though the icon itself is smaller."
    const { findByTestId } = await render(
      <PillHeader title="Session" onBack={() => {}} />
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
});
