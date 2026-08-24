import React, { useEffect } from 'react';
import { View, ViewStyle, StyleProp } from 'react-native';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import Animated, {
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from './Text';
import { withAlpha } from '@/lib/color';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/** A ring that fills like ink soaking into paper — used for goals and progress. */
export function ProgressRing({
  progress,
  size = 96,
  thickness = 8,
  color,
  trackColor,
  children,
  style,
  duration = 900,
}: {
  /** 0–1 */
  progress: number;
  size?: number;
  thickness?: number;
  color?: string;
  trackColor?: string;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  duration?: number;
}) {
  const theme = useTheme();
  const clamped = Math.max(0, Math.min(1, Number.isFinite(progress) ? progress : 0));
  const animated = useSharedValue(0);

  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    animated.value = theme.calm
      ? clamped
      : withTiming(clamped, { duration, easing: Easing.out(Easing.cubic) });
  }, [animated, clamped, duration, theme.calm]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - animated.value),
  }));

  const stroke = color ?? theme.colors.accent;

  return (
    <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Defs>
          <SvgGradient id="ringGradient" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={stroke} />
            <Stop offset="1" stopColor={theme.colors.gild} />
          </SvgGradient>
        </Defs>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor ?? withAlpha(theme.colors.rule, 0.9)}
          strokeWidth={thickness}
          fill="none"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#ringGradient)"
          strokeWidth={thickness}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={circumference}
          animatedProps={animatedProps}
          // start the ring at 12 o'clock
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      {children}
    </View>
  );
}

/** The same idea, laid flat — used inside list rows. */
export function ProgressBar({
  progress,
  height = 6,
  color,
  style,
  showLabel,
}: {
  progress: number;
  height?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
  showLabel?: boolean;
}) {
  const theme = useTheme();
  const clamped = Math.max(0, Math.min(1, Number.isFinite(progress) ? progress : 0));
  const fill = useSharedValue(0);

  useEffect(() => {
    fill.value = theme.calm
      ? clamped
      : withTiming(clamped, { duration: 700, easing: Easing.out(Easing.cubic) });
  }, [clamped, theme.calm, fill]);

  const animatedStyle = useAnimatedStyle(() => ({ width: `${fill.value * 100}%` }));

  return (
    <View style={style}>
      <View
        style={{
          height,
          borderRadius: height,
          backgroundColor: withAlpha(theme.colors.rule, 0.85),
          overflow: 'hidden',
        }}
      >
        <Animated.View
          style={[
            {
              height: '100%',
              borderRadius: height,
              backgroundColor: color ?? theme.colors.accent,
            },
            animatedStyle,
          ]}
        />
      </View>
      {showLabel ? (
        <Text variant="caption" tone="inkFaint" style={{ marginTop: 4 }}>
          {Math.round(clamped * 100)}%
        </Text>
      ) : null}
    </View>
  );
}
