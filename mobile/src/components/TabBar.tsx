import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useEffect, useState } from 'react';
import { Keyboard, Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon, type IconName } from './Icon';
import { colors, radius, spacing } from '../theme';

export type TabBarProps = BottomTabBarProps & {
  onStartPress?: () => void;
  onResumePress?: () => void;
  sessionActive?: boolean;
};

const ICON_FOR: Record<string, IconName> = {
  Home: 'home',
  Drills: 'sports-tennis',
  Stats: 'bar-chart',
  Routines: 'list',
};

function iconFor(routeName: string): IconName {
  return ICON_FOR[routeName] ?? 'radio-button-unchecked';
}

// Raised circular START button — 2/3 seated in the bar, 1/3 overflowing above it
// (Strava/Zwift pattern per docs/conventions/navigation-surface.md § Tab-bar center action).
const START_SIZE = 64;

export function TabBar({
  state,
  navigation,
  insets,
  onStartPress,
  onResumePress,
  sessionActive,
}: TabBarProps) {
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  if (keyboardVisible) return null;

  return (
    <View testID="tab-bar" style={[styles.bar, { paddingBottom: insets.bottom }]}>
      {state.routes.map((route, i) => {
        const focused = i === state.index;
        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!focused && !event.defaultPrevented) {
            navigation.navigate(route.name as never);
          }
        };
        return (
          <Pressable
            key={route.key}
            testID={`tab-touch-${route.name}`}
            onPress={onPress}
            style={styles.tab}
          >
            <View
              testID={`tab-pill-${route.name}`}
              style={focused ? styles.pillActive : styles.pillInactive}
            >
              <View testID={`tab-icon-${route.name}`}>
                <Icon
                  name={iconFor(route.name)}
                  size={22}
                  color={focused ? colors.onAccent : colors.textSecondary}
                />
              </View>
              <Text style={focused ? styles.labelActive : styles.labelInactive}>
                {route.name}
              </Text>
            </View>
          </Pressable>
        );
      })}
      <View pointerEvents="box-none" style={styles.centerAnchor}>
        <Pressable
          testID="tab-touch-Start"
          onPress={sessionActive ? onResumePress : onStartPress}
          style={[styles.startButton, sessionActive ? styles.startButtonActive : null]}
        >
          <Icon
            name="play-arrow"
            size={26}
            color={sessionActive ? colors.onAmber : colors.onAccent}
          />
          <Text
            style={[styles.startLabel, sessionActive ? styles.startLabelActive : null]}
          >
            {sessionActive ? 'RESUME' : 'START'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
  },
  tab: {
    flex: 1,
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillActive: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  pillInactive: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  labelActive: {
    color: colors.onAccent,
  },
  labelInactive: {
    color: colors.textSecondary,
  },
  centerAnchor: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: -START_SIZE / 3,
    alignItems: 'center',
  },
  startButton: {
    width: START_SIZE,
    height: START_SIZE,
    borderRadius: START_SIZE / 2,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startButtonActive: {
    backgroundColor: colors.accentAmber,
  },
  startLabel: {
    fontSize: 11,
    lineHeight: 13,
    fontWeight: '800',
    letterSpacing: 1,
    color: colors.onAccent,
  },
  startLabelActive: {
    color: colors.onAmber,
  },
});
