import React, { forwardRef, useState } from 'react';
import {
  StyleSheet,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
  StyleProp,
  Platform,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from './Text';
import { withAlpha } from '@/lib/color';

export type TextFieldProps = TextInputProps & {
  label?: string;
  hint?: string;
  error?: string;
  /** the journal editor uses the handwriting face for long-form writing */
  handwritten?: boolean;
  /** grows with content, no scrollbar */
  auto?: boolean;
  right?: React.ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
};

/**
 * A field that looks like a ruled line on paper rather than an input box.
 * The rule warms up and thickens as you focus it.
 */
export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField(
  { label, hint, error, handwritten, auto, right, containerStyle, style, multiline, onFocus, onBlur, ...rest },
  ref,
) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  const focus = useSharedValue(0);

  const underline = useAnimatedStyle(() => ({
    height: 1 + focus.value * 1,
    opacity: 0.5 + focus.value * 0.5,
    backgroundColor: error ? theme.colors.danger : theme.colors.accent,
  }));

  return (
    <View style={containerStyle}>
      {label ? (
        <Text variant="label" caps tone={focused ? 'accent' : 'inkFaint'} style={{ marginBottom: 6 }}>
          {label}
        </Text>
      ) : null}

      <View
        style={[
          styles.wrap,
          {
            backgroundColor: withAlpha(theme.colors.paperSunken, theme.isDark ? 0.6 : 0.75),
            borderRadius: theme.radius.md,
            paddingHorizontal: theme.space.md,
            paddingTop: multiline || auto ? theme.space.md : 0,
            paddingBottom: multiline || auto ? theme.space.md : 0,
            minHeight: multiline || auto ? 96 : 50,
            borderColor: error ? withAlpha(theme.colors.danger, 0.5) : withAlpha(theme.colors.rule, 0.9),
          },
        ]}
      >
        <TextInput
          ref={ref}
          allowFontScaling={false}
          multiline={multiline || auto}
          textAlignVertical={multiline || auto ? 'top' : 'center'}
          placeholderTextColor={withAlpha(theme.colors.inkFaint, 0.75)}
          selectionColor={theme.colors.accent}
          cursorColor={theme.colors.accent}
          onFocus={(e) => {
            setFocused(true);
            focus.value = withTiming(1, { duration: 180 });
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            focus.value = withTiming(0, { duration: 220 });
            onBlur?.(e);
          }}
          style={[
            styles.input,
            handwritten
              ? { ...theme.type.hand, color: theme.colors.ink }
              : { ...theme.type.body, color: theme.colors.ink },
            // Android inputs sit a little high without this.
            Platform.OS === 'android' ? { paddingVertical: multiline ? 0 : 8 } : null,
            style,
          ]}
          {...rest}
        />
        {right ? <View style={styles.right}>{right}</View> : null}
      </View>

      <Animated.View style={[styles.underline, underline]} />

      {error ? (
        <Text variant="caption" tone="danger" style={{ marginTop: 5 }}>
          {error}
        </Text>
      ) : hint ? (
        <Text variant="caption" tone="inkFaint" style={{ marginTop: 5 }}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  input: { flex: 1 },
  right: { marginLeft: 8 },
  underline: { marginTop: -1, marginHorizontal: 10, borderRadius: 2 },
});
