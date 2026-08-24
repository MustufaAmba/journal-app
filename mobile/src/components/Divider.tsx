import React from 'react';
import { StyleSheet, View, ViewStyle, StyleProp } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from './Text';
import { withAlpha } from '@/lib/color';

/** A plain hairline. */
export function Divider({ style, inset = 0 }: { style?: StyleProp<ViewStyle>; inset?: number }) {
  const theme = useTheme();
  return (
    <View
      style={[
        {
          height: StyleSheet.hairlineWidth,
          backgroundColor: withAlpha(theme.colors.rule, 0.9),
          marginHorizontal: inset,
        },
        style,
      ]}
    />
  );
}

/**
 * The little printer's ornament that separates sections — a rule, a diamond,
 * a rule. It is the sort of thing a real book has and an app usually doesn't.
 */
export function Ornament({ label, style }: { label?: string; style?: StyleProp<ViewStyle> }) {
  const theme = useTheme();
  const rule = withAlpha(theme.colors.rule, 1);

  return (
    <View style={[styles.ornament, { paddingVertical: theme.space.lg }, style]}>
      <View style={[styles.rule, { backgroundColor: rule }]} />
      {label ? (
        <Text variant="label" tone="inkFaint" caps style={{ marginHorizontal: theme.space.md }}>
          {label}
        </Text>
      ) : (
        <Svg width={22} height={10} viewBox="0 0 22 10" style={{ marginHorizontal: theme.space.sm }}>
          <Path d="M11 0 L15 5 L11 10 L7 5z" fill={theme.colors.gild} />
          <Path d="M0 5 h5 M17 5 h5" stroke={rule} strokeWidth={1} />
        </Svg>
      )}
      <View style={[styles.rule, { backgroundColor: rule }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  ornament: { flexDirection: 'row', alignItems: 'center' },
  rule: { flex: 1, height: StyleSheet.hairlineWidth },
});
