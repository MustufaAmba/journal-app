import React from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { Card } from '@/components/Card';
import { useTheme } from '@/theme/ThemeProvider';

/** Shared frame for the three auth screens so they feel like one small book. */
export function AuthLayout({
  eyebrow,
  title,
  subtitle,
  illustration,
  children,
  footer,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  illustration?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const theme = useTheme();

  return (
    <Screen edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, padding: theme.space.lg, justifyContent: 'center' }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {illustration ? <View style={styles.illustration}>{illustration}</View> : null}

          <Animated.View entering={theme.calm ? undefined : FadeInDown.duration(500)}>
            {eyebrow ? (
              <Text variant="label" caps tone="accent" align="center">
                {eyebrow}
              </Text>
            ) : null}
            <Text variant="title" tone="ink" align="center" style={{ marginTop: 4 }}>
              {title}
            </Text>
            {subtitle ? (
              <Text
                variant="body"
                tone="inkFaint"
                align="center"
                style={{ marginTop: theme.space.sm, marginBottom: theme.space.lg }}
              >
                {subtitle}
              </Text>
            ) : (
              <View style={{ height: theme.space.lg }} />
            )}
          </Animated.View>

          <Animated.View entering={theme.calm ? undefined : FadeInDown.delay(120).duration(500)}>
            <Card raise={2} style={{ padding: theme.space.xl }}>
              {children}
            </Card>
          </Animated.View>

          {footer ? <View style={{ marginTop: theme.space.lg }}>{footer}</View> : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  illustration: { alignItems: 'center', marginBottom: 4 },
});
