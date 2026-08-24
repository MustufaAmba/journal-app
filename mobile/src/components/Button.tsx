import React from 'react';
import { ActivityIndicator, StyleSheet, View, ViewStyle, StyleProp } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from './Text';
import { Pressable } from './Pressable';
import { withAlpha } from '@/lib/color';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  disabled,
  loading,
  full,
  style,
}: {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  icon?: React.ReactNode;
  disabled?: boolean;
  loading?: boolean;
  full?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();

  const heights: Record<Size, number> = { sm: 36, md: 48, lg: 56 };
  const paddings: Record<Size, number> = { sm: theme.space.md, md: theme.space.xl, lg: theme.space.xl };

  const palette: Record<Variant, { bg: string; fg: string; border: string }> = {
    primary: { bg: theme.colors.accent, fg: theme.colors.accentInk, border: 'transparent' },
    secondary: {
      bg: withAlpha(theme.colors.accentSoft, theme.isDark ? 0.7 : 1),
      fg: theme.colors.ink,
      border: withAlpha(theme.colors.accent, 0.22),
    },
    ghost: { bg: 'transparent', fg: theme.colors.accent, border: 'transparent' },
    danger: { bg: withAlpha(theme.colors.danger, 0.12), fg: theme.colors.danger, border: withAlpha(theme.colors.danger, 0.3) },
  };
  const tone = palette[variant];

  return (
    <Pressable
      onPress={disabled || loading ? undefined : onPress}
      haptic={variant === 'primary' ? 'settle' : 'tap'}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: Boolean(disabled || loading) }}
      style={[full ? { alignSelf: 'stretch' } : { alignSelf: 'flex-start' }, style]}
    >
      <View
        style={[
          styles.button,
          {
            height: heights[size],
            paddingHorizontal: paddings[size],
            backgroundColor: tone.bg,
            borderColor: tone.border,
            borderRadius: theme.radius.pill,
            opacity: disabled ? 0.45 : 1,
          },
          variant === 'primary' ? theme.elevation(1) : null,
        ]}
      >
        {loading ? (
          <ActivityIndicator size="small" color={tone.fg} />
        ) : (
          <>
            {icon ? <View style={{ marginRight: theme.space.sm }}>{icon}</View> : null}
            <Text
              variant={size === 'sm' ? 'small' : 'bodyStrong'}
              color={tone.fg}
              style={{ fontFamily: 'Karla_700Bold', letterSpacing: 0.3 }}
            >
              {label}
            </Text>
          </>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
});
