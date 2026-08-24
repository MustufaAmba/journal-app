import React from 'react';
import { StyleSheet, View, ViewStyle, StyleProp } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from './Text';
import { Pressable } from './Pressable';
import { withAlpha } from '@/lib/color';

export function Chip({
  label,
  selected,
  onPress,
  tint,
  icon,
  small,
  style,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  tint?: string;
  icon?: React.ReactNode;
  small?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const accent = tint ?? theme.colors.accent;

  const body = (
    <View
      style={[
        styles.chip,
        {
          paddingVertical: small ? 4 : 7,
          paddingHorizontal: small ? theme.space.sm + 2 : theme.space.md,
          borderRadius: theme.radius.pill,
          backgroundColor: selected ? accent : withAlpha(accent, theme.isDark ? 0.14 : 0.1),
          borderColor: selected ? accent : withAlpha(accent, 0.28),
        },
        style,
      ]}
    >
      {icon ? <View style={{ marginRight: 5 }}>{icon}</View> : null}
      <Text
        variant={small ? 'caption' : 'small'}
        color={selected ? theme.colors.accentInk : theme.colors.inkSoft}
        style={{ fontFamily: selected ? 'Karla_700Bold' : 'Karla_500Medium' }}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );

  if (!onPress) return body;
  return (
    <Pressable
      onPress={onPress}
      haptic="select"
      scaleTo={0.94}
      accessibilityRole="button"
      accessibilityState={{ selected: Boolean(selected) }}
    >
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
});
