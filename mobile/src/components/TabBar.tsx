import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useEffect, useState } from 'react';
import { Keyboard, Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon, type IconName } from './Icon';
import { colors, radius, spacing } from '../theme';

export type TabBarProps = BottomTabBarProps;

const ICON_FOR: Record<string, IconName> = {
  Home: 'home',
  Drills: 'sports-tennis',
  Stats: 'bar-chart',
  Routines: 'list',
};

function iconFor(routeName: string): IconName {
  return ICON_FOR[routeName] ?? 'radio-button-unchecked';
}

export function TabBar({ state, navigation, insets }: TabBarProps) {
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
});
