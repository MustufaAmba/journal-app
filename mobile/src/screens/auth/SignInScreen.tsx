import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/Text';
import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';
import { Pressable } from '@/components/Pressable';
import { Ornament } from '@/components/Divider';
import { TeaAndBook } from '@/components/illustrations';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuthStore } from '@/store/useAuthStore';
import { signInWithEmail, authErrorMessage } from '@/api/auth';
import { haptics } from '@/lib/haptics';
import { AuthLayout } from './AuthLayout';
import type { RootStackParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const schema = z.object({
  email: z.string().trim().min(1, 'We need an email address.').email('That does not look like an email.'),
  password: z.string().min(6, 'Passwords are at least six characters.'),
});

type Values = z.infer<typeof schema>;

export function SignInScreen() {
  const theme = useTheme();
  const navigation = useNavigation<Nav>();
  const continueAsGuest = useAuthStore((s) => s.continueAsGuest);

  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const { control, handleSubmit, formState, getValues } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
    mode: 'onBlur',
  });

  const onSubmit = async (values: Values) => {
    setSubmitting(true);
    setFormError(null);
    try {
      await signInWithEmail(values.email, values.password, remember);
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
      eyebrow="Welcome back"
      title="Pick up where you left off"
      subtitle="Your shelves, your journal, your handwriting."
      illustration={<TeaAndBook size={168} />}
      footer={
        <View style={{ alignItems: 'center' }}>
          <Text variant="small" tone="inkFaint">
            No account yet?
          </Text>
          <Button label="Make one" variant="ghost" onPress={() => navigation.navigate('SignUp')} />
        </View>
      }
    >
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
            textContentType="emailAddress"
            returnKeyType="next"
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
            placeholder="••••••••"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoComplete="current-password"
            textContentType="password"
            returnKeyType="go"
            onSubmitEditing={handleSubmit(onSubmit)}
            right={
              <Pressable
                onPress={() => setShowPassword((v) => !v)}
                haptic="select"
                accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color={theme.colors.inkFaint}
                />
              </Pressable>
            }
          />
        )}
      />

      <View style={[styles.rowBetween, { marginTop: theme.space.lg }]}>
        <Pressable
          onPress={() => setRemember((v) => !v)}
          haptic="select"
          style={styles.checkboxRow}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: remember }}
          accessibilityLabel="Remember me"
        >
          <View
            style={[
              styles.checkbox,
              {
                borderColor: remember ? theme.colors.accent : theme.colors.rule,
                backgroundColor: remember ? theme.colors.accent : 'transparent',
                borderRadius: 6,
              },
            ]}
          >
            {remember ? <Ionicons name="checkmark" size={13} color={theme.colors.accentInk} /> : null}
          </View>
          <Text variant="small" tone="inkSoft" style={{ marginLeft: 8 }}>
            Stay signed in
          </Text>
        </Pressable>

        <Pressable
          onPress={() => navigation.navigate('ForgotPassword', { email: getValues('email') })}
          accessibilityRole="button"
        >
          <Text variant="small" tone="accent">
            Forgot password?
          </Text>
        </Pressable>
      </View>

      {formError ? (
        <Text variant="small" tone="danger" style={{ marginTop: theme.space.md }}>
          {formError}
        </Text>
      ) : null}

      <Button
        label="Sign in"
        size="lg"
        full
        loading={submitting || formState.isSubmitting}
        onPress={handleSubmit(onSubmit)}
        style={{ marginTop: theme.space.lg }}
      />

      <Ornament label="or" />

      <Button
        label="Just let me in — no account"
        variant="secondary"
        full
        onPress={() => {
          haptics.settle();
          continueAsGuest();
        }}
      />

      <Text variant="caption" tone="inkFaint" align="center" style={{ marginTop: theme.space.sm }}>
        Guest mode keeps everything on this phone. You can sign in later and it will all come with you.
      </Text>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  checkboxRow: { flexDirection: 'row', alignItems: 'center' },
  checkbox: { width: 20, height: 20, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
});
