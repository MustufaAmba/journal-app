import React from 'react';
import { ScrollView, StyleSheet, View, ViewStyle, StyleProp } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from './Text';
import { Pressable } from './Pressable';

export function SectionHeader({
  title,
  action,
  onAction,
  style,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.header, { paddingHorizontal: theme.space.lg, marginBottom: theme.space.md }, style]}>
      <Text variant="heading" tone="ink" style={{ flex: 1 }} numberOfLines={1}>
        {title}
      </Text>
      {action && onAction ? (
        <Pressable onPress={onAction} accessibilityRole="button" accessibilityLabel={action} style={styles.action}>
          <Text variant="small" tone="accent" style={{ fontFamily: 'Karla_700Bold' }}>
            {action}
          </Text>
          <Ionicons name="chevron-forward" size={14} color={theme.colors.accent} style={{ marginLeft: 1 }} />
        </Pressable>
      ) : null}
    </View>
  );
}

/** Horizontally scrolling row with the app's standard gutters. */
export function Rail({
  children,
  style,
  gap = 14,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  gap?: number;
}) {
  const theme = useTheme();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[{ paddingHorizontal: theme.space.lg, gap }, style]}
      // Without this a horizontal list nested in a vertical one stretches to
      // fill the parent instead of hugging its content.
      style={{ flexGrow: 0 }}
      // Books should glide, not skid.
      decelerationRate="fast"
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'flex-end' },
  action: { flexDirection: 'row', alignItems: 'center' },
});
