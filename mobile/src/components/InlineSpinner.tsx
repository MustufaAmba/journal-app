import React, { useEffect } from 'react';
import { StyleSheet, View, ViewStyle, StyleProp } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from './Text';

/**
 * A small turning ring, for the moments where something is happening and the
 * screen would otherwise look like it ignored the tap — attaching a photo,
 * saving a recording, fetching a cover.
 *
 * Deliberately not a full-screen overlay: it sits beside the thing it is
 * talking about, so the rest of the page stays usable.
 */
export function InlineSpinner({
  label,
  size = 14,
  color,
  style,
}: {
  label?: string;
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const spin = useSharedValue(0);
  const tint = color ?? theme.colors.accent;

  useEffect(() => {
    spin.value = withRepeat(withTiming(1, { duration: 900, easing: Easing.linear }), -1, false);
  }, [spin]);

  const spinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spin.value * 360}deg` }],
  }));

  return (
    <Animated.View
      entering={theme.calm ? undefined : FadeIn.duration(160)}
      exiting={theme.calm ? undefined : FadeOut.duration(160)}
      style={[styles.row, style]}
    >
      <Animated.View
        style={[
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: 2,
            borderColor: tint,
            // One open quadrant is what makes the rotation readable.
            borderTopColor: 'transparent',
          },
          spinStyle,
        ]}
      />
      {label ? (
        <Text variant="caption" tone="inkFaint" style={{ marginLeft: 6 }}>
          {label}
        </Text>
      ) : null}
    </Animated.View>
  );
}

/** A softly pulsing placeholder card, for content that is still arriving. */
export function Shimmer({
  width,
  height,
  radius = 6,
  style,
}: {
  width: number | `${number}%`;
  height: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const pulse = useSharedValue(0.4);

  useEffect(() => {
    if (theme.calm) return;
    pulse.value = withRepeat(
      withTiming(0.85, { duration: 900, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, [pulse, theme.calm]);

  const animated = useAnimatedStyle(() => ({ opacity: pulse.value }));

  return (
    <Animated.View
      style={[
        { width, height, borderRadius: radius, backgroundColor: theme.colors.paperSunken },
        animated,
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
});
