// PROTOTYPE — throwaway. Answers issue #3: what should the in-session timer screen look like?
// Three variants: A (keep-and-sharpen, light-green), B (Strava-minimal-dark), C (Zwift-HUD).
// Delete after aesthetic direction is folded into theme.ts.

import { useState } from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle, TextStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const FAKE_ELAPSED_SEC = 187;
const FAKE_TARGET_SEC = 300;
const FAKE_DRILL = { category: 'FOREHAND', name: 'Cross-court rally' };

function formatMmSs(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

type Variant = 'A' | 'B' | 'C';
const ORDER: Variant[] = ['A', 'B', 'C'];
const NAMES: Record<Variant, string> = {
  A: 'Keep-and-sharpen',
  B: 'Strava-minimal',
  C: 'Zwift-HUD',
};

export function AestheticPrototype() {
  const [variant, setVariant] = useState<Variant>('C');
  if (!__DEV__) return null;

  const cycle = (dir: 1 | -1) => {
    const i = ORDER.indexOf(variant);
    const next = ORDER[(i + dir + ORDER.length) % ORDER.length];
    setVariant(next);
  };

  return (
    <View style={{ flex: 1 }}>
      {variant === 'A' && <VariantA />}
      {variant === 'B' && <VariantB />}
      {variant === 'C' && <VariantC />}
      <PrototypeSwitcher
        current={variant}
        label={NAMES[variant]}
        onPrev={() => cycle(-1)}
        onNext={() => cycle(1)}
      />
    </View>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Variant A — keep-and-sharpen (light bg, evolved green, quiet-sporty)
// ────────────────────────────────────────────────────────────────────────────

const A = {
  bg: '#F4F6F4',
  surface: '#FFFFFF',
  textPrimary: '#0F1512',
  textSecondary: '#3B4842',
  accent: '#1F5A3A',
  accentPressed: '#164026',
  danger: '#8A2C22',
  onAccent: '#FFFFFF',
};

function VariantA() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: A.bg }}>
      <View style={aStyles.container}>
        <View style={aStyles.header}>
          <Text style={aStyles.eyebrow}>{FAKE_DRILL.category}</Text>
          <Text style={aStyles.drillName}>{FAKE_DRILL.name}</Text>
        </View>

        <View style={aStyles.heroBlock}>
          <Text style={aStyles.heroDigits}>{formatMmSs(FAKE_ELAPSED_SEC)}</Text>
          <Text style={aStyles.targetLabel}>target {formatMmSs(FAKE_TARGET_SEC)}</Text>
        </View>

        <View style={aStyles.actionColumn}>
          <Pressable style={({ pressed }) => [
            aStyles.primaryBtn,
            pressed ? { backgroundColor: A.accentPressed } : null,
          ]}>
            <Text style={aStyles.primaryBtnText}>Stop</Text>
          </Pressable>
          <View style={{ height: 24 }} />
          <Pressable style={aStyles.ghostBtn}>
            <Text style={aStyles.ghostBtnText}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const aStyles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 32,
  },
  header: {
    marginBottom: 40,
  },
  eyebrow: {
    fontSize: 12,
    letterSpacing: 2,
    fontWeight: '700',
    color: A.accent,
    textTransform: 'uppercase',
  },
  drillName: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700',
    color: A.textPrimary,
    marginTop: 6,
  },
  heroBlock: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroDigits: {
    fontSize: 128,
    lineHeight: 132,
    fontWeight: '300',
    fontVariant: ['tabular-nums'],
    color: A.textPrimary,
  },
  targetLabel: {
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '500',
    color: A.textSecondary,
    marginTop: 8,
  },
  actionColumn: {
    alignItems: 'stretch',
  },
  primaryBtn: {
    minHeight: 60,
    backgroundColor: A.accent,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    fontSize: 20,
    fontWeight: '700',
    color: A.onAccent,
  },
  ghostBtn: {
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostBtnText: {
    fontSize: 18,
    fontWeight: '600',
    color: A.textSecondary,
  },
});

// ────────────────────────────────────────────────────────────────────────────
// Variant B — Strava-minimal (near-black, saturated orange, brutal)
// ────────────────────────────────────────────────────────────────────────────

const B = {
  bg: '#0B0D0C',
  surface: '#141817',
  textPrimary: '#FFFFFF',
  textSecondary: '#B5BEB9',
  accent: '#FC4C02',
  accentPressed: '#C43B02',
  danger: '#FF6B6B',
  onAccent: '#000000',
};

function VariantB() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: B.bg }}>
      <View style={bStyles.container}>
        <View style={bStyles.header}>
          <Text style={bStyles.eyebrow}>{FAKE_DRILL.category}</Text>
          <Text style={bStyles.drillName}>{FAKE_DRILL.name}</Text>
        </View>

        <View style={bStyles.heroBlock}>
          <Text style={bStyles.heroDigits}>{formatMmSs(FAKE_ELAPSED_SEC)}</Text>
          <View style={bStyles.targetRow}>
            <Text style={bStyles.targetLabel}>TARGET</Text>
            <Text style={bStyles.targetValue}>{formatMmSs(FAKE_TARGET_SEC)}</Text>
          </View>
        </View>

        <View style={bStyles.actionColumn}>
          <Pressable style={({ pressed }) => [
            bStyles.primaryBtn,
            pressed ? { backgroundColor: B.accentPressed } : null,
          ]}>
            <Text style={bStyles.primaryBtnText}>STOP</Text>
          </Pressable>
          <View style={{ height: 24 }} />
          <Pressable style={bStyles.ghostBtn}>
            <Text style={bStyles.ghostBtnText}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const bStyles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 32,
  },
  header: {
    marginBottom: 40,
  },
  eyebrow: {
    fontSize: 12,
    letterSpacing: 3,
    fontWeight: '800',
    color: B.accent,
    textTransform: 'uppercase',
  },
  drillName: {
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '800',
    color: B.textPrimary,
    marginTop: 8,
    textTransform: 'uppercase',
  },
  heroBlock: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroDigits: {
    fontSize: 128,
    lineHeight: 128,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    color: B.textPrimary,
    letterSpacing: -2,
  },
  targetRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 16,
    gap: 10,
  },
  targetLabel: {
    fontSize: 12,
    letterSpacing: 3,
    fontWeight: '800',
    color: B.textSecondary,
  },
  targetValue: {
    fontSize: 24,
    fontWeight: '700',
    color: B.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  actionColumn: {
    alignItems: 'stretch',
  },
  primaryBtn: {
    minHeight: 60,
    backgroundColor: B.accent,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    fontSize: 20,
    fontWeight: '800',
    color: B.onAccent,
    letterSpacing: 2,
  },
  ghostBtn: {
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostBtnText: {
    fontSize: 18,
    fontWeight: '600',
    color: B.textSecondary,
  },
});

// ────────────────────────────────────────────────────────────────────────────
// Variant C — Zwift-HUD (dark-blue, cyan/amber/magenta HUD, data-dense)
// ────────────────────────────────────────────────────────────────────────────

const C = {
  bg: '#0A0F14',
  surface: '#151E27',
  surfaceHi: '#1D2A36',
  textPrimary: '#FFFFFF',
  textSecondary: '#8FA4B8',
  accentCyan: '#00E5FF',
  accentAmber: '#FFC933',
  accentMagenta: '#FF3D71',
  onAccent: '#000000',
};

function VariantC() {
  const pct = Math.min(1, FAKE_ELAPSED_SEC / FAKE_TARGET_SEC);
  const pctInt = Math.round(pct * 100);
  const stateAccent =
    pct >= 1 ? C.accentMagenta : pct >= 0.9 ? C.accentAmber : C.accentCyan;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={cStyles.container}>
        <View style={cStyles.header}>
          <Text style={[cStyles.eyebrow, { color: stateAccent }]}>
            {FAKE_DRILL.category} · IN PLAY
          </Text>
          <Text style={cStyles.drillName}>{FAKE_DRILL.name}</Text>
        </View>

        <View style={cStyles.heroPanel}>
          <Text style={[cStyles.heroDigits, { color: stateAccent }]}>
            {formatMmSs(FAKE_ELAPSED_SEC)}
          </Text>
          <View style={cStyles.progressTrack}>
            <View
              style={[
                cStyles.progressFill,
                { width: `${pctInt}%`, backgroundColor: stateAccent },
              ]}
            />
          </View>
          <View style={cStyles.progressRow}>
            <Text style={cStyles.progressLabel}>ELAPSED</Text>
            <Text style={[cStyles.progressPct, { color: stateAccent }]}>
              {pctInt}%
            </Text>
          </View>
        </View>

        <View style={cStyles.statRow}>
          <View style={cStyles.statChip}>
            <Text style={cStyles.statLabel}>TARGET</Text>
            <Text style={cStyles.statValue}>{formatMmSs(FAKE_TARGET_SEC)}</Text>
          </View>
          <View style={cStyles.statChip}>
            <Text style={cStyles.statLabel}>REMAINING</Text>
            <Text style={cStyles.statValue}>
              {formatMmSs(Math.max(0, FAKE_TARGET_SEC - FAKE_ELAPSED_SEC))}
            </Text>
          </View>
        </View>

        <View style={cStyles.actionColumn}>
          <Pressable
            style={({ pressed }) => [
              cStyles.primaryBtn,
              { backgroundColor: stateAccent },
              pressed ? { opacity: 0.85 } : null,
            ]}
          >
            <Text style={cStyles.primaryBtnText}>STOP</Text>
          </Pressable>
          <View style={{ height: 24 }} />
          <Pressable style={cStyles.ghostBtn}>
            <Text style={cStyles.ghostBtnText}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const cStyles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 28,
  },
  header: {
    marginBottom: 20,
  },
  eyebrow: {
    fontSize: 12,
    letterSpacing: 3,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  drillName: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '700',
    color: C.textPrimary,
    marginTop: 6,
  },
  heroPanel: {
    backgroundColor: C.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.surfaceHi,
    padding: 24,
    alignItems: 'center',
  },
  heroDigits: {
    fontSize: 112,
    lineHeight: 116,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    letterSpacing: -1,
  },
  progressTrack: {
    height: 10,
    width: '100%',
    borderRadius: 999,
    backgroundColor: C.surfaceHi,
    marginTop: 20,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 10,
  },
  progressLabel: {
    fontSize: 12,
    letterSpacing: 2,
    fontWeight: '700',
    color: C.textSecondary,
  },
  progressPct: {
    fontSize: 24,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  statRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  statChip: {
    flex: 1,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.surfaceHi,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  statLabel: {
    fontSize: 12,
    letterSpacing: 2,
    fontWeight: '700',
    color: C.textSecondary,
    textTransform: 'uppercase',
  },
  statValue: {
    fontSize: 26,
    fontWeight: '800',
    color: C.textPrimary,
    fontVariant: ['tabular-nums'],
    marginTop: 4,
  },
  actionColumn: {
    marginTop: 'auto',
    alignItems: 'stretch',
  },
  primaryBtn: {
    minHeight: 60,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    fontSize: 20,
    fontWeight: '900',
    color: C.onAccent,
    letterSpacing: 2,
  },
  ghostBtn: {
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostBtnText: {
    fontSize: 18,
    fontWeight: '600',
    color: C.textSecondary,
  },
});

// ────────────────────────────────────────────────────────────────────────────
// Floating switcher — dev-only, hidden in production
// ────────────────────────────────────────────────────────────────────────────

function PrototypeSwitcher({
  current,
  label,
  onPrev,
  onNext,
}: {
  current: Variant;
  label: string;
  onPrev: () => void;
  onNext: () => void;
}) {
  if (!__DEV__) return null;
  return (
    <View style={switcherStyles.wrap} pointerEvents="box-none">
      <View style={switcherStyles.pill}>
        <Pressable onPress={onPrev} hitSlop={12} style={switcherStyles.arrow}>
          <Text style={switcherStyles.arrowText}>‹</Text>
        </Pressable>
        <Text style={switcherStyles.label}>
          {current} — {label}
        </Text>
        <Pressable onPress={onNext} hitSlop={12} style={switcherStyles.arrow}>
          <Text style={switcherStyles.arrowText}>›</Text>
        </Pressable>
      </View>
    </View>
  );
}

const switcherStyles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 12,
    alignItems: 'center',
  } as ViewStyle,
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.25)',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 6,
  } as ViewStyle,
  arrow: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  arrowText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111',
    lineHeight: 24,
  } as TextStyle,
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111',
    paddingHorizontal: 10,
  } as TextStyle,
});
