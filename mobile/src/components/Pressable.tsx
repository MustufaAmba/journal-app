import React, { useCallback } from 'react';
import { Pressable as RNPressable, PressableProps, ViewStyle, StyleProp } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useTheme } from '@/theme/ThemeProvider';
import { haptics } from '@/lib/haptics';

const AnimatedPressable = Animated.createAnimatedComponent(RNPressable);

/**
 * Everything tappable in the app presses *in* like a real key, with a light
 * haptic. It is one of the details that stops the app feeling like a webpage.
 */
export function Pressable({
  children,
  style,
  scaleTo = 0.965,
  haptic = 'tap',
  onPress,
  ...rest
}: Omit<PressableProps, 'style'> & {
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
  haptic?: 'tap' | 'settle' | 'select' | 'none';
  children: React.ReactNode;
}) {
  const theme = useTheme();
  const pressed = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - pressed.value * (1 - scaleTo) }],
    opacity: 1 - pressed.value * 0.06,
  }));

  const handlePress = useCallback<NonNullable<PressableProps['onPress']>>(
    (event) => {
      if (haptic !== 'none') haptics[haptic]();
      onPress?.(event);
    },
    [haptic, onPress],
  );

  return (
    <AnimatedPressable
      onPressIn={() => {
        pressed.value = theme.calm ? 0 : withSpring(1, theme.motion.press);
      }}
      onPressOut={() => {
        pressed.value = withSpring(0, theme.motion.press);
      }}
      onPress={handlePress}
      style={[style, animatedStyle]}
      {...rest}
    >
      {children}
    </AnimatedPressable>
  );
}
