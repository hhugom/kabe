// Per-drill line rendering logic for the session-history screen. Pure — no React,
// no colours (the component maps bands to theme colours). A drill's `metric` decides
// how its actual value and target are formatted; the attainment band compares the two.

export type DrillMetric = 'reps' | 'duration' | 'accuracy';

export type DrillLine = {
  name: string;
  metric: DrillMetric;
  /** made-hits (accuracy) / rep count (reps) / seconds (duration). */
  value: number;
  /** Attempts — non-null only for accuracy drills. */
  attempted: number | null;
  /** The drill's goal in the metric's units (reps / seconds / accuracy %). Mandatory. */
  target: number;
};

/** Accuracy as a rounded percentage of made / attempted. */
export function accuracyPercent(made: number, attempted: number): number {
  if (attempted <= 0) return 0;
  return Math.round((made / attempted) * 100);
}

/** Seconds as a standard clock: m:ss under an hour, h:mm:ss once it reaches one. */
export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// The comparable "actual" scalar for a drill, in target units: reps count, seconds,
// or accuracy percentage.
function actualScalar(line: DrillLine): number {
  if (line.metric === 'accuracy') return accuracyPercent(line.value, line.attempted ?? 0);
  return line.value;
}

// A scalar (in target units) rendered per metric: reps as a count, duration as a
// clock, accuracy with a % suffix.
function formatScalar(metric: DrillMetric, scalar: number): string {
  if (metric === 'duration') return formatDuration(scalar);
  if (metric === 'accuracy') return `${scalar}%`;
  return `${scalar}`;
}

/** The actual value formatted in the metric's units (reps count, m:ss, or %). */
export function drillActualLabel(line: DrillLine): string {
  return formatScalar(line.metric, actualScalar(line));
}

/** The target formatted in the metric's units, matching the actual. */
export function drillTargetLabel(line: DrillLine): string {
  return formatScalar(line.metric, line.target);
}

export type AttainmentBand = 'good' | 'ok' | 'poor';

/** How the actual compares to the target: good (met), ok (≥80%), poor (below). */
export function attainmentBand(line: DrillLine): AttainmentBand {
  if (line.target <= 0) return 'good';
  const ratio = actualScalar(line) / line.target;
  if (ratio >= 1) return 'good';
  if (ratio >= 0.8) return 'ok';
  return 'poor';
}
