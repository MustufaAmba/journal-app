import React from 'react';
import { StyleSheet, View, ViewStyle, StyleProp } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import Animated, { useAnimatedStyle, interpolate, Extrapolation, SharedValue } from 'react-native-reanimated';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from './Text';
import { Pressable } from './Pressable';
import { withAlpha } from '@/lib/color';

export function IconButton({
  name,
  onPress,
  size = 22,
  color,
  label,
  badge,
  style,
}: {
  name: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  size?: number;
  color?: string;
  label: string;
  badge?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      scaleTo={0.9}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[
        styles.iconButton,
        { backgroundColor: withAlpha(theme.colors.paper, theme.isDark ? 0.5 : 0.7), borderColor: withAlpha(theme.colors.rule, 0.8) },
        style,
      ]}
    >
      <Ionicons name={name} size={size} color={color ?? theme.colors.inkSoft} />
      {badge ? <View style={[styles.badge, { backgroundColor: theme.colors.accent }]} /> : null}
    </Pressable>
  );
}

/**
 * The standard screen header: optional back chevron, a serif title, and room
 * for one or two actions. Kept short so the content starts high on the page.
 */
export function Header({
  title,
  subtitle,
  back,
  onBack,
  right,
  style,
  large,
}: {
  title?: string;
  subtitle?: string;
  back?: boolean;
  onBack?: () => void;
  right?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  large?: boolean;
}) {
  const theme = useTheme();
  const navigation = useNavigation();

  return (
    <View
      style={[
        styles.header,
        { paddingHorizontal: theme.space.lg, paddingBottom: theme.space.md, paddingTop: theme.space.sm },
        style,
      ]}
    >
      {back ? (
        <IconButton
          name="chevron-back"
          label="Go back"
          onPress={onBack ?? (() => navigation.goBack())}
          style={{ marginRight: theme.space.md }}
        />
      ) : null}

      <View style={styles.headerTitle}>
        {title ? (
          <Text variant={large ? 'title' : 'heading'} tone="ink" numberOfLines={1}>
            {title}
          </Text>
        ) : null}
        {subtitle ? (
          <Text variant="caption" tone="inkFaint" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {right ? <View style={styles.headerRight}>{right}</View> : null}
    </View>
  );
}

/**
 * A header that fades and shrinks as the page scrolls under it.
 * Pass the scroll offset from an Animated.ScrollView.
 */
export function ParallaxTitle({
  title,
  subtitle,
  scrollY,
  distance = 90,
}: {
  title: string;
  subtitle?: string;
  scrollY: SharedValue<number>;
  distance?: number;
}) {
  const theme = useTheme();

  const style = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, distance], [1, 0], Extrapolation.CLAMP),
    transform: [
      { translateY: interpolate(scrollY.value, [0, distance], [0, -18], Extrapolation.CLAMP) },
      { scale: interpolate(scrollY.value, [0, distance], [1, 0.94], Extrapolation.CLAMP) },
    ],
  }));

  return (
    <Animated.View style={[{ paddingHorizontal: theme.space.lg, paddingBottom: theme.space.md }, style]}>
      <Text variant="hero" tone="ink">
        {title}
      </Text>
      {subtitle ? (
        <Text variant="body" tone="inkFaint" style={{ marginTop: 2 }}>
          {subtitle}
        </Text>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: { flex: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  badge: { position: 'absolute', top: 8, right: 9, width: 8, height: 8, borderRadius: 4 },
});
