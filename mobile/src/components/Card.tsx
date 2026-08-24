import React from 'react';
import { StyleSheet, View, ViewStyle, StyleProp } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { PaperTexture } from './PaperTexture';
import { Pressable } from './Pressable';
import { withAlpha } from '@/lib/color';

export type CardProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** how far off the desk the card sits */
  raise?: 0 | 1 | 2 | 3;
  /** deeper paper, for wells and inputs */
  sunken?: boolean;
  /** a warm ribbon down the left edge, like a bookmark tucked behind the card */
  ribbon?: boolean;
  ribbonColor?: string;
  padded?: boolean;
  grain?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
};

export function Card({
  children,
  style,
  raise = 1,
  sunken,
  ribbon,
  ribbonColor,
  padded = true,
  grain = true,
  onPress,
  accessibilityLabel,
}: CardProps) {
  const theme = useTheme();

  const body = (
    <View
      style={[
        styles.card,
        {
          backgroundColor: sunken ? theme.colors.paperSunken : theme.colors.paper,
          borderRadius: theme.radius.lg,
          borderColor: withAlpha(theme.colors.rule, theme.isDark ? 0.5 : 0.9),
          padding: padded ? theme.space.lg : 0,
        },
        theme.elevation(sunken ? 0 : raise),
        style,
      ]}
    >
      {grain ? <PaperTexture opacity={theme.grain * 0.6} style={{ borderRadius: theme.radius.lg }} /> : null}
      {ribbon ? (
        <View
          style={[
            styles.ribbon,
            {
              backgroundColor: ribbonColor ?? theme.colors.accent,
              borderTopLeftRadius: theme.radius.lg,
              borderBottomLeftRadius: theme.radius.lg,
            },
          ]}
        />
      ) : null}
      {children}
    </View>
  );

  if (!onPress) return body;

  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={accessibilityLabel}>
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth },
  ribbon: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 5 },
});
