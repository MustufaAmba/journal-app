import React from 'react';
import { StyleSheet, View } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Text';
import { Pressable } from '@/components/Pressable';
import { withAlpha } from '@/lib/color';

const ICONS: Record<string, { on: keyof typeof Ionicons.glyphMap; off: keyof typeof Ionicons.glyphMap }> = {
  Home: { on: 'home', off: 'home-outline' },
  Library: { on: 'library', off: 'library-outline' },
  Journal: { on: 'book', off: 'book-outline' },
  Collection: { on: 'bookmarks', off: 'bookmarks-outline' },
  You: { on: 'leaf', off: 'leaf-outline' },
};

/**
 * A tab bar that sits on the page like a strip of ribbon rather than a slab of
 * chrome: frosted paper, a small warm dot under the active tab, no hard edges.
 */
export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 10) }]} pointerEvents="box-none">
      <View
        style={[
          styles.bar,
          {
            backgroundColor: withAlpha(theme.colors.paperRaised, theme.isDark ? 0.86 : 0.9),
            borderColor: withAlpha(theme.colors.rule, 0.9),
            borderRadius: theme.radius.xl,
          },
          theme.elevation(2),
        ]}
      >
        <BlurView
          intensity={theme.isDark ? 26 : 18}
          tint={theme.isDark ? 'dark' : 'light'}
          style={[StyleSheet.absoluteFill, { borderRadius: theme.radius.xl }]}
        />

        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const { options } = descriptors[route.key];
          const label = (options.tabBarLabel ?? options.title ?? route.name) as string;
          const icon = ICONS[route.name] ?? { on: 'ellipse', off: 'ellipse-outline' };

          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
          };

          return (
            <TabButton
              key={route.key}
              focused={focused}
              label={label}
              iconName={focused ? icon.on : icon.off}
              onPress={onPress}
            />
          );
        })}
      </View>
    </View>
  );
}

function TabButton({
  focused,
  label,
  iconName,
  onPress,
}: {
  focused: boolean;
  label: string;
  iconName: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}) {
  const theme = useTheme();
  const lift = useSharedValue(focused ? 1 : 0);

  React.useEffect(() => {
    lift.value = theme.calm ? (focused ? 1 : 0) : withSpring(focused ? 1 : 0, { damping: 14, stiffness: 220 });
  }, [focused, lift, theme.calm]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -lift.value * 2 }, { scale: 1 + lift.value * 0.08 }],
  }));

  const dotStyle = useAnimatedStyle(() => ({
    opacity: lift.value,
    transform: [{ scale: 0.4 + lift.value * 0.6 }],
  }));

  return (
    <Pressable
      onPress={onPress}
      haptic="select"
      scaleTo={0.92}
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={label}
      style={styles.tab}
    >
      <Animated.View style={iconStyle}>
        <Ionicons name={iconName} size={21} color={focused ? theme.colors.accent : theme.colors.inkFaint} />
      </Animated.View>

      <Text
        variant="caption"
        color={focused ? theme.colors.ink : theme.colors.inkFaint}
        style={{ marginTop: 3, fontSize: 10.5, fontFamily: focused ? 'Karla_700Bold' : 'Karla_400Regular' }}
      >
        {label}
      </Text>

      <Animated.View style={[styles.dot, { backgroundColor: theme.colors.accent }, dotStyle]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 14 },
  bar: {
    flexDirection: 'row',
    height: 62,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', height: '100%' },
  dot: { position: 'absolute', bottom: 7, width: 4, height: 4, borderRadius: 2 },
});
