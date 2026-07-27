import { contrastRatio } from './theme-contrast';

// WCAG 2.x relative-luminance ratio, computed on gamma-decoded sRGB.
// This test asserts the math of the helper only. Per-screen conformance
// tests use the helper to check actual palette pairings on their surface.
describe('contrastRatio', () => {
  it('returns 21 for pure black vs pure white', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 1);
  });

  it('returns 1 for identical colors', () => {
    expect(contrastRatio('#151E27', '#151E27')).toBeCloseTo(1, 2);
  });

  it('is commutative', () => {
    const a = contrastRatio('#FFFFFF', '#151E27');
    const b = contrastRatio('#151E27', '#FFFFFF');
    expect(a).toBeCloseTo(b, 4);
  });

  it('matches WCAG worked example: #777 on #FFF ≈ 4.48:1', () => {
    // https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html
    expect(contrastRatio('#777777', '#FFFFFF')).toBeCloseTo(4.48, 1);
  });
});
