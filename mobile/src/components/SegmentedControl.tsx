import React, { useState } from 'react';
import { LayoutChangeEvent, StyleSheet, View, ViewStyle, StyleProp } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from './Text';
import { Pressable } from './Pressable';
import { withAlpha } from '@/lib/color';

export type Segment<T extends string> = {
  value: T;
  label?: string;
  icon?: keyof typeof Ionicons.glyphMap;
};

/** A pill selector with a thumb that slides — used for library view modes. */
export function SegmentedControl<T extends string>({
  segments,
  value,
  onChange,
  style,
  compact,
}: {
  segments: Segment<T>[];
  value: T;
  onChange: (value: T) => void;
  style?: StyleProp<ViewStyle>;
  compact?: boolean;
}) {
  const theme = useTheme();
  const [width, setWidth] = useState(0);
  const index = Math.max(0, segments.findIndex((s) => s.value === value));
  const thumb = useSharedValue(index);

  React.useEffect(() => {
    thumb.value = theme.calm ? index : withSpring(index, theme.motion.settle);
  }, [index, theme.calm, theme.motion.settle, thumb]);

  const segmentWidth = width ? (width - 6) / segments.length : 0;

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: 3 + thumb.value * segmentWidth }],
    width: segmentWidth,
  }));

  const onLayout = (event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width);

  return (
    <View
      onLayout={onLayout}
      style={[
        styles.track,
        {
          backgroundColor: withAlpha(theme.colors.paperSunken, theme.isDark ? 0.7 : 0.9),
          borderColor: withAlpha(theme.colors.rule, 0.9),
          borderRadius: theme.radius.pill,
          height: compact ? 36 : 44,
        },
        style,
      ]}
    >
      {segmentWidth > 0 ? (
        <Animated.View
          style={[
            styles.thumb,
            {
              backgroundColor: theme.colors.paper,
              borderRadius: theme.radius.pill,
              top: 3,
              bottom: 3,
            },
            theme.elevation(1),
            thumbStyle,
          ]}
        />
      ) : null}

      {segments.map((segment) => {
        const selected = segment.value === value;
        return (
          <Pressable
            key={segment.value}
            onPress={() => onChange(segment.value)}
            haptic="select"
            scaleTo={0.97}
            style={styles.segment}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={segment.label ?? segment.value}
          >
            {segment.icon ? (
              <Ionicons
                name={segment.icon}
                size={compact ? 15 : 17}
                color={selected ? theme.colors.accent : theme.colors.inkFaint}
                style={segment.label ? { marginRight: 5 } : undefined}
              />
            ) : null}
            {segment.label ? (
              <Text
                variant={compact ? 'caption' : 'small'}
                color={selected ? theme.colors.ink : theme.colors.inkFaint}
                style={{ fontFamily: selected ? 'Karla_700Bold' : 'Karla_500Medium' }}
                numberOfLines={1}
              >
                {segment.label}
              </Text>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row', borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  thumb: { position: 'absolute', left: 0 },
  segment: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
});
