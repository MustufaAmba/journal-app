import React, { useState } from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Text } from '@/components/Text';
import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';
import { OpenBook } from '@/components/illustrations';
import { useTheme } from '@/theme/ThemeProvider';
import { signUpWithEmail, authErrorMessage } from '@/api/auth';
import { haptics } from '@/lib/haptics';
import { AuthLayout } from './AuthLayout';

const schema = z
  .object({
    name: z.string().trim().min(1, 'What should we call you?'),
    email: z.string().trim().min(1, 'We need an email address.').email('That does not look like an email.'),
    password: z.string().min(8, 'Eight characters or more, please.'),
    confirm: z.string(),
  })
  .refine((values) => values.password === values.confirm, {
    message: 'Those two do not match.',
    path: ['confirm'],
  });

type Values = z.infer<typeof schema>;

export function SignUpScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const { control, handleSubmit } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '', password: '', confirm: '' },
    mode: 'onBlur',
  });

  const onSubmit = async (values: Values) => {
    setSubmitting(true);
    setFormError(null);
    try {
      await signUpWithEmail(values.name, values.email, values.password, true);
      haptics.success();
    } catch (error) {
      haptics.error();
      setFormError(authErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };


  return (
    <AuthLayout
      eyebrow="A place of your own"
      title="Start the journal"
      subtitle="An account only exists so your journal can follow you to a new phone."
      illustration={<OpenBook size={160} />}
      footer={
        <View style={{ alignItems: 'center' }}>
          <Text variant="small" tone="inkFaint">
            Already have one?
          </Text>
          <Button label="Sign in instead" variant="ghost" onPress={() => navigation.goBack()} />
        </View>
      }
    >
      <Controller
        control={control}
        name="name"
        render={({ field, fieldState }) => (
          <TextField
            label="Name"
            placeholder="What shall we call you?"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
            autoCapitalize="words"
            autoComplete="name"
          />
        )}
      />

      <View style={{ height: theme.space.lg }} />

      <Controller
        control={control}
        name="email"
        render={({ field, fieldState }) => (
          <TextField
            label="Email"
            placeholder="you@example.com"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />
        )}
      />

      <View style={{ height: theme.space.lg }} />

      <Controller
        control={control}
        name="password"
        render={({ field, fieldState }) => (
          <TextField
            label="Password"
            placeholder="At least eight characters"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="new-password"
          />
        )}
      />

      <View style={{ height: theme.space.lg }} />

      <Controller
        control={control}
        name="confirm"
        render={({ field, fieldState }) => (
          <TextField
            label="Again, to be sure"
            placeholder="Repeat it"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
            secureTextEntry
            autoCapitalize="none"
            onSubmitEditing={handleSubmit(onSubmit)}
          />
        )}
      />

      {formError ? (
        <Text variant="small" tone="danger" style={{ marginTop: theme.space.md }}>
          {formError}
        </Text>
      ) : null}

      <Button
        label="Create the journal"
        size="lg"
        full
        loading={submitting}
        onPress={handleSubmit(onSubmit)}
        style={{ marginTop: theme.space.lg }}
      />
    </AuthLayout>
  );
}
