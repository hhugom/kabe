import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from './Icon';
import { useSessionActions } from './session-actions';
import { colors, radius, spacing, typography } from '../theme';

// Start-a-Session primary action on Home (per docs/conventions/navigation-surface.md
// § Home Start hero). Full-width card at the top of the Home content region.
// Morphs to Resume (amber) when a session is active; suppresses the amber pill on
// tab-roots because this card covers the same "there's an active session" job.
export function HomeStartHero() {
  const { sessionActive, onStartPress, onResumePress } = useSessionActions();
  return (
    <Pressable
      testID={sessionActive ? 'home-hero-resume' : 'home-hero-start'}
      onPress={sessionActive ? onResumePress : onStartPress}
      style={[styles.card, sessionActive ? styles.cardActive : styles.cardIdle]}
    >
      <View style={styles.left}>
        <Text
          style={[
            styles.overline,
            sessionActive ? styles.overlineActive : styles.overlineIdle,
          ]}
        >
          {sessionActive ? 'Session in progress' : 'Ready when you are'}
        </Text>
        <Text
          style={[styles.title, sessionActive ? styles.titleActive : styles.titleIdle]}
        >
          {sessionActive ? 'Resume session' : 'Start a session'}
        </Text>
      </View>
      <View
        style={[styles.iconWell, sessionActive ? styles.iconWellActive : styles.iconWellIdle]}
      >
        <Icon
          name="play-arrow"
          size={32}
          color={sessionActive ? colors.onAmber : colors.onAccent}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    minHeight: 96,
  },
  cardIdle: { backgroundColor: colors.accent },
  cardActive: { backgroundColor: colors.accentAmber },
  left: { flex: 1 },
  overline: {
    ...typography.label,
    marginBottom: spacing.xs,
  },
  overlineIdle: { color: colors.onAccent, opacity: 0.7 },
  overlineActive: { color: colors.onAmber, opacity: 0.75 },
  title: {
    ...typography.title,
    fontSize: 26,
    lineHeight: 32,
  },
  titleIdle: { color: colors.onAccent },
  titleActive: { color: colors.onAmber },
  iconWell: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.md,
  },
  iconWellIdle: { backgroundColor: 'rgba(0,0,0,0.15)' },
  iconWellActive: { backgroundColor: 'rgba(0,0,0,0.18)' },
});
