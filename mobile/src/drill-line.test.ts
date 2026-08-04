import {
  accuracyPercent,
  attainmentBand,
  drillActualLabel,
  drillTargetLabel,
  formatDuration,
  type DrillLine,
} from './drill-line';

const line = (over: Partial<DrillLine>): DrillLine => ({
  name: 'A drill',
  metric: 'reps',
  value: 24,
  attempted: null,
  target: 30,
  ...over,
});

describe('accuracyPercent', () => {
  it('is made / attempted as a rounded percentage', () => {
    // 28 of 32 attempts = 0.875 → 88% (rounds up from 87.5).
    expect(accuracyPercent(28, 32)).toBe(88);
  });
});

describe('formatDuration', () => {
  it('formats seconds as a standard m:ss clock under an hour', () => {
    expect(formatDuration(45)).toBe('0:45');
    expect(formatDuration(65)).toBe('1:05');
    expect(formatDuration(130)).toBe('2:10');
    expect(formatDuration(3599)).toBe('59:59'); // just under an hour: still m:ss
  });

  it('adds an hours field once the duration reaches an hour', () => {
    expect(formatDuration(3600)).toBe('1:00:00');
    expect(formatDuration(3725)).toBe('1:02:05'); // 1h 2m 5s
    expect(formatDuration(7325)).toBe('2:02:05');
  });
});

describe('drillActualLabel', () => {
  it('formats the actual value per metric', () => {
    expect(drillActualLabel(line({ metric: 'reps', value: 24 }))).toBe('24');
    expect(drillActualLabel(line({ metric: 'duration', value: 45 }))).toBe('0:45');
    expect(drillActualLabel(line({ metric: 'accuracy', value: 28, attempted: 32 }))).toBe('88%');
  });
});

describe('drillTargetLabel', () => {
  it('formats the target per metric, matching the actual units', () => {
    expect(drillTargetLabel(line({ metric: 'reps', target: 30 }))).toBe('30');
    expect(drillTargetLabel(line({ metric: 'duration', target: 60 }))).toBe('1:00');
    expect(drillTargetLabel(line({ metric: 'accuracy', target: 90 }))).toBe('90%');
  });
});

describe('attainmentBand', () => {
  it('is good when actual meets or exceeds target', () => {
    expect(attainmentBand(line({ metric: 'reps', value: 30, target: 30 }))).toBe('good');
    expect(attainmentBand(line({ metric: 'duration', value: 65, target: 60 }))).toBe('good');
  });

  it('is ok from 80% up to target, poor below 80%', () => {
    expect(attainmentBand(line({ metric: 'reps', value: 24, target: 30 }))).toBe('ok'); // 0.80
    expect(attainmentBand(line({ metric: 'reps', value: 12, target: 20 }))).toBe('poor'); // 0.60
  });

  it('compares accuracy percentage against a percentage target', () => {
    // actual 88% vs target 90% → 0.978 → ok (below target but ≥ 80%).
    expect(attainmentBand(line({ metric: 'accuracy', value: 28, attempted: 32, target: 90 }))).toBe('ok');
  });
});
