import { render } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { colors } from '../theme';
import { contrastRatio } from '../theme-contrast';
import { StatsScreen } from './StatsScreen';

function flatStyle(node: any): Record<string, any> {
  return StyleSheet.flatten(node.props.style) ?? {};
}

// Ergonomic-minima conformance for the Stats stub (annex tier).
// docs/conventions/ergonomic-minima.md § Numeric floor:
//  - body text ≥ 16 sp
//  - textSecondary allowed only on structural labels, not body content
//  - AAA text contrast (7:1 body; 4.5:1 for ≥ 24 sp)
describe('StatsScreen — annex ergonomic-minima conformance', () => {
  it('renders body copy at ≥ 16 sp', async () => {
    const { findByText } = await render(<StatsScreen />);
    const body = flatStyle(await findByText(/coming soon/i));
    expect(body.fontSize ?? 14).toBeGreaterThanOrEqual(16);
  });

  it('does not paint body copy in textSecondary (structural-label-only per aesthetic-direction.md)', async () => {
    const { findByText } = await render(<StatsScreen />);
    const body = flatStyle(await findByText(/coming soon/i));
    expect(body.color).not.toBe(colors.textSecondary);
    expect(body.color).not.toBe(colors.textMuted);
  });

  it('body copy clears AAA-body contrast (7:1) on bg', async () => {
    const { findByText } = await render(<StatsScreen />);
    const body = flatStyle(await findByText(/coming soon/i));
    const fg = body.color ?? colors.textPrimary;
    expect(contrastRatio(fg, colors.bg)).toBeGreaterThanOrEqual(7);
  });

  it('screen title clears AAA-large-text contrast (4.5:1) on bg', async () => {
    const { findByText } = await render(<StatsScreen />);
    const title = flatStyle(await findByText('Stats'));
    expect(title.fontSize).toBeGreaterThanOrEqual(24);
    const fg = title.color ?? colors.textPrimary;
    expect(contrastRatio(fg, colors.bg)).toBeGreaterThanOrEqual(4.5);
  });
});
