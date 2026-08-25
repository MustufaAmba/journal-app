import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useDerivedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '@/theme/ThemeProvider';
import { Pressable } from './Pressable';
import { withAlpha } from '@/lib/color';

const TRACK_WIDTH = 50;
const TRACK_HEIGHT = 30;
const THUMB = 24;

/**
 * A switch in the app's own colours.
 *
 * React Native's built-in Switch draws platform chrome — a blue thumb on iOS,
 * a teal one under react-native-web — which looks like someone else's app
 * dropped into the middle of this one. This one is the same warm accent as
 * every other control, and it slides rather than snaps.
 */
export function Switch({
  value,
  onValueChange,
  disabled,
  accessibilityLabel,
}: {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  accessibilityLabel?: string;
}) {
  const theme = useTheme();

  // Both endpoints are resolved on the JS thread. `withAlpha` is an ordinary
  // function, and calling one of those from inside a worklet crashes the UI
  // thread on native — the worklet below may only touch plain values.
  const track = useMemo(
    () => [withAlpha(theme.colors.inkFaint, 0.28), theme.colors.accent] as const,
    [theme.colors.inkFaint, theme.colors.accent],
  );

  const progress = useDerivedValue(() =>
    theme.calm ? (value ? 1 : 0) : withSpring(value ? 1 : 0, { damping: 17, stiffness: 260, mass: 0.6 }),
  );

  const trackStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(progress.value, [0, 1], [track[0], track[1]]),
  }));

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: progress.value * (TRACK_WIDTH - THUMB - 6) }],
  }));

  return (
    <Pressable
      onPress={disabled ? undefined : () => onValueChange(!value)}
      haptic="select"
      scaleTo={0.94}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled: Boolean(disabled) }}
      accessibilityLabel={accessibilityLabel}
      style={{ opacity: disabled ? 0.5 : 1 }}
    >
      <Animated.View
        style={[
          styles.track,
          { borderColor: withAlpha(theme.colors.rule, 1) },
          trackStyle,
        ]}
      >
        <Animated.View
          style={[
            styles.thumb,
            { backgroundColor: theme.colors.paperRaised },
            theme.elevation(1),
            thumbStyle,
          ]}
        />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    width: TRACK_WIDTH,
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT,
    padding: 3,
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  thumb: { width: THUMB, height: THUMB, borderRadius: THUMB / 2 },
});
