import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useEffect, useState } from 'react';
import { Animated, Keyboard, Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon, type IconName } from './Icon';
import { tabBarSlideInterpolation, tabBarTravel } from '../layout/tab-bar';
import { useSheetSlide } from './session-sheet-slide';
import { colors, radius, spacing } from '../theme';

const ICON_FOR: Record<string, IconName> = {
  Home: 'home',
  Routines: 'list',
  Stats: 'bar-chart',
};

function iconFor(routeName: string): IconName {
  return ICON_FOR[routeName] ?? 'radio-button-unchecked';
}

export function TabBar({ state, navigation, insets }: BottomTabBarProps) {
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const slide = useSheetSlide();

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  if (keyboardVisible) return null;

  // When a session sheet is mounted, the bar slides down in lockstep with it:
  // at PEEK the interpolation resolves to translateY 0 (identity — bar at rest,
  // touch area valid), and as the sheet rises to FULL the bar slides its full
  // height off the bottom edge, where the sheet has taken its place. The value
  // is the sheet's own JS-driven translateY (see session-sheet-slide), so bar
  // and sheet fill never desync. No session → `slide` is null and the bar is a
  // plain static strip. Applying the transform to the bar itself (not a wrapper)
  // keeps it clear of React Navigation's tab-bar container clip.
  const slideTransform = slide
    ? {
        transform: [
          {
            translateY: slide.translateY.interpolate(
              tabBarSlideInterpolation({
                peekTranslate: slide.peekTranslate,
                tabBarTravel: tabBarTravel(insets.bottom),
              })
            ),
          },
        ],
      }
    : null;

  return (
    <Animated.View
      testID="tab-bar"
      style={[styles.bar, { paddingBottom: insets.bottom }, slideTransform]}
    >
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
    </Animated.View>
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
    height: 56,
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
});
