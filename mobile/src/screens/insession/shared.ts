// Shared helpers for the InSession sheet body — formatting + state-driven
// accent computation. Kept together because FocusHero, EditEntrySheet, and
// SessionPeripherals all need them and none owns the concept.

import { formatMmSs } from '../../lib/format';
import { colors } from '../../theme';
import type { Drill } from '../../use-cases/drills';
import type { DrillEntry } from '../../use-cases/sessions';

export function formatEntryValue(
  entry: { value: number; attempted: number | null },
  metric: Drill['metric']
): string {
  if (metric === 'accuracy') return `${entry.value} / ${entry.attempted ?? '?'}`;
  if (metric === 'duration') return formatMmSs(entry.value);
  return `${entry.value} reps`;
}

export function formatDrillTarget(drill: Drill): string | null {
  if (drill.target == null) return null;
  if (drill.metric === 'duration') return formatMmSs(drill.target);
  if (drill.metric === 'accuracy') return `${drill.target}%`;
  return `${drill.target} reps`;
}

// State-driven accent per aesthetic-direction.md § State-driven accent rule:
// cyan <90%, amber 90–100%, magenta ≥100%.
export function stateAccentFor(pct: number): string {
  if (pct >= 1) return colors.accentMagenta;
  if (pct >= 0.9) return colors.accentAmber;
  return colors.accent;
}

export type TargetProgress = {
  accent: string;
  ratePctInt: number;
  trackFillPct: number;
};

export function progressFor(value: number, target: number | null): TargetProgress | null {
  if (target == null || target <= 0) return null;
  const pct = Math.min(1.2, Math.max(0, value / target));
  return {
    accent: stateAccentFor(pct),
    ratePctInt: Math.round(pct * 100),
    trackFillPct: Math.round(Math.min(1, pct) * 100),
  };
}

export function primaryAccentFor(progress: TargetProgress | null): string {
  return progress?.accent ?? colors.accent;
}

// Re-export DrillEntry so consumers don't need a second import path just for
// the type name.
export type { DrillEntry };
