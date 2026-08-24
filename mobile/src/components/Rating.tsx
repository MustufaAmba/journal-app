import React, { useState } from 'react';
import { StyleSheet, View, ViewStyle, StyleProp, Pressable as RNPressable } from 'react-native';
import Svg, { Path, Defs, ClipPath, Rect } from 'react-native-svg';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring } from 'react-native-reanimated';
import { useTheme } from '@/theme/ThemeProvider';
import { haptics } from '@/lib/haptics';
import { withAlpha } from '@/lib/color';

const STAR_PATH =
  'M12 2.3l2.9 6.03 6.6.9-4.8 4.6 1.2 6.55L12 17.3l-5.9 3.08 1.2-6.55-4.8-4.6 6.6-.9z';

function Star({ fill, size, color, track }: { fill: number; size: number; color: string; track: string }) {
  const clipWidth = 24 * Math.max(0, Math.min(1, fill));
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Defs>
        <ClipPath id={`half-${clipWidth}`}>
          <Rect x="0" y="0" width={clipWidth} height="24" />
        </ClipPath>
      </Defs>
      <Path d={STAR_PATH} fill="none" stroke={track} strokeWidth={1.4} strokeLinejoin="round" />
      {clipWidth > 0 ? (
        <Path d={STAR_PATH} fill={color} clipPath={`url(#half-${clipWidth})`} />
      ) : null}
    </Svg>
  );
}

/**
 * Half-star rating. Tapping the left half of a star gives a half, the right
 * half gives a whole — the way every reader already expects it to work.
 */
export function Rating({
  value = 0,
  onChange,
  size = 26,
  readOnly,
  style,
}: {
  value?: number;
  onChange?: (value: number) => void;
  size?: number;
  readOnly?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const [preview, setPreview] = useState<number | null>(null);
  const shown = preview ?? value;

  return (
    <View style={[styles.row, style]} accessibilityRole="adjustable" accessibilityValue={{ text: `${value} of 5` }}>
      {[0, 1, 2, 3, 4].map((index) => {
        const fill = Math.max(0, Math.min(1, shown - index));
        return (
          <StarButton
            key={index}
            index={index}
            fill={fill}
            size={size}
            readOnly={readOnly}
            color={theme.colors.gild}
            track={withAlpha(theme.colors.inkFaint, 0.55)}
            onPreview={setPreview}
            onCommit={(next) => {
              setPreview(null);
              // Tapping the star you already sat on clears the rating.
              onChange?.(next === value ? 0 : next);
            }}
          />
        );
      })}
    </View>
  );
}

function StarButton({
  index,
  fill,
  size,
  readOnly,
  color,
  track,
  onPreview,
  onCommit,
}: {
  index: number;
  fill: number;
  size: number;
  readOnly?: boolean;
  color: string;
  track: string;
  onPreview: (value: number | null) => void;
  onCommit: (value: number) => void;
}) {
  const pop = useSharedValue(0);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: 1 + pop.value * 0.22 }] }));

  if (readOnly) {
    return (
      <View style={{ marginRight: 3 }}>
        <Star fill={fill} size={size} color={color} track={track} />
      </View>
    );
  }

  const commit = (half: boolean) => {
    const next = index + (half ? 0.5 : 1);
    pop.value = withSequence(withSpring(1, { damping: 8, stiffness: 320 }), withSpring(0, { damping: 12 }));
    haptics.select();
    onCommit(next);
  };

  return (
    <Animated.View style={[{ marginRight: 3 }, animatedStyle]}>
      <View style={{ width: size, height: size }}>
        <Star fill={fill} size={size} color={color} track={track} />
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <View style={styles.halves}>
            <RNPressable
              style={styles.half}
              onPressIn={() => onPreview(index + 0.5)}
              onPressOut={() => onPreview(null)}
              onPress={() => commit(true)}
              accessibilityLabel={`Rate ${index + 0.5} stars`}
            />
            <RNPressable
              style={styles.half}
              onPressIn={() => onPreview(index + 1)}
              onPressOut={() => onPreview(null)}
              onPress={() => commit(false)}
              accessibilityLabel={`Rate ${index + 1} stars`}
            />
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  halves: { flex: 1, flexDirection: 'row' },
  half: { flex: 1 },
});
