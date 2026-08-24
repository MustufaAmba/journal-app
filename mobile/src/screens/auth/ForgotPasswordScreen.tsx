import React, { useState } from 'react';
import { View } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Text } from '@/components/Text';
import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';
import { Candle } from '@/components/illustrations';
import { useTheme } from '@/theme/ThemeProvider';
import { requestPasswordReset, authErrorMessage } from '@/api/auth';
import { haptics } from '@/lib/haptics';
import { AuthLayout } from './AuthLayout';
import type { RootStackParamList } from '@/navigation/types';

type Route = RouteProp<RootStackParamList, 'ForgotPassword'>;

export function ForgotPasswordScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const route = useRoute<Route>();

  const [email, setEmail] = useState(route.params?.email ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    const trimmed = email.trim();
    if (!trimmed.includes('@')) {
      setError('That does not look like an email address.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await requestPasswordReset(trimmed);
      haptics.success();
      setSent(true);
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (sent) {
    return (
      <AuthLayout
        eyebrow="On its way"
        title="Check your email"
        subtitle="If there is an account for that address, a reset link is heading to it now."
        illustration={<Candle size={124} />}
      >
        <Text variant="body" tone="inkFaint" align="center">
          Links expire after an hour, which is plenty of time to find your reading glasses.
        </Text>
        <Button
          label="Back to sign in"
          size="lg"
          full
          style={{ marginTop: theme.space.xl }}
          onPress={() => navigation.goBack()}
        />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      eyebrow="It happens"
      title="Forgotten password"
      subtitle="Tell us the email on the account and we will send a way back in."
      illustration={<Candle size={124} />}
    >
      <TextField
        label="Email"
        placeholder="you@example.com"
        value={email}
        onChangeText={(value) => {
          setEmail(value);
          setError(null);
        }}
        error={error ?? undefined}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        autoFocus
        onSubmitEditing={submit}
      />

      <Button
        label="Send the link"
        size="lg"
        full
        loading={submitting}
        onPress={submit}
        style={{ marginTop: theme.space.lg }}
      />

      <View style={{ height: theme.space.xs }} />

      <Button label="Never mind" variant="ghost" full onPress={() => navigation.goBack()} />
    </AuthLayout>
  );
}
