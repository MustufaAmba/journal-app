import React from 'react';
import { View, ViewStyle, StyleProp } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from './Text';
import { Button } from './Button';
import { ILLUSTRATIONS, IllustrationName } from './illustrations';

/**
 * Empty states are the most-seen screens in a brand new app, so they get the
 * illustration, the generous spacing and the kindest copy in the whole project.
 */
export function EmptyState({
  illustration = 'nook',
  title,
  message,
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondary,
  compact,
  style,
}: {
  illustration?: IllustrationName;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const Illustration = ILLUSTRATIONS[illustration];

  return (
    <Animated.View
      entering={theme.calm ? undefined : FadeInDown.duration(500).springify().damping(18)}
      style={[
        {
          alignItems: 'center',
          paddingVertical: compact ? theme.space.xl : theme.space.xxxl,
          paddingHorizontal: theme.space.xl,
        },
        style,
      ]}
    >
      <Illustration size={compact ? 140 : 200} />

      <Text
        variant={compact ? 'heading' : 'title'}
        tone="ink"
        align="center"
        style={{ marginTop: theme.space.lg }}
      >
        {title}
      </Text>

      {message ? (
        <Text
          variant="body"
          tone="inkFaint"
          align="center"
          style={{ marginTop: theme.space.sm, maxWidth: 320 }}
        >
          {message}
        </Text>
      ) : null}

      {actionLabel && onAction ? (
        <Button label={actionLabel} onPress={onAction} style={{ marginTop: theme.space.xl }} />
      ) : null}

      {secondaryLabel && onSecondary ? (
        <Button
          label={secondaryLabel}
          variant="ghost"
          onPress={onSecondary}
          style={{ marginTop: theme.space.sm }}
        />
      ) : null}

      <View style={{ height: theme.space.md }} />
    </Animated.View>
  );
}
