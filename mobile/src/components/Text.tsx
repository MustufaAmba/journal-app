import React from 'react';
import { Text as RNText, TextProps as RNTextProps, TextStyle, StyleProp } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import type { TypeToken } from '@/theme/tokens';

type ToneKey = 'ink' | 'inkSoft' | 'inkFaint' | 'accent' | 'gild' | 'success' | 'danger' | 'warning' | 'accentInk';

export type TextProps = RNTextProps & {
  variant?: TypeToken;
  tone?: ToneKey;
  color?: string;
  align?: TextStyle['textAlign'];
  /** letterSpaced uppercase — for the little section labels */
  caps?: boolean;
  italic?: boolean;
  style?: StyleProp<TextStyle>;
};

export function Text({
  variant = 'body',
  tone = 'inkSoft',
  color,
  align,
  caps,
  italic,
  style,
  children,
  ...rest
}: TextProps) {
  const theme = useTheme();
  return (
    <RNText
      // Respect our own font-size setting rather than doubling up with the OS.
      allowFontScaling={false}
      style={[
        theme.type[variant],
        { color: color ?? theme.colors[tone] },
        align ? { textAlign: align } : null,
        caps ? { textTransform: 'uppercase' } : null,
        italic ? { fontStyle: 'italic' } : null,
        style,
      ]}
      {...rest}
    >
      {children}
    </RNText>
  );
}

/** A small uppercase label with a hairline beside it — used above every section. */
export function SectionLabel({ children, style, ...rest }: TextProps) {
  const theme = useTheme();
  return (
    <Text
      variant="label"
      tone="inkFaint"
      caps
      style={[{ marginBottom: theme.space.sm }, style]}
      {...rest}
    >
      {children}
    </Text>
  );
}
