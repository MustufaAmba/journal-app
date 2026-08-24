import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '@/components/Screen';
import { Header } from '@/components/Header';
import { Text } from '@/components/Text';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';
import { Ornament } from '@/components/Divider';
import { QuillAndInk } from '@/components/illustrations';
import { useTheme } from '@/theme/ThemeProvider';
import { useSettingsStore } from '@/store/useSettingsStore';
import { prettyDate } from '@/lib/date';
import { haptics } from '@/lib/haptics';
import type { RootStackParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'DedicationWrite'>;

const PLACEHOLDER =
  'For the reader who always has one more chapter left…';

/**
 * The inside-cover page. The whole point of the app being a gift lives here:
 * a message written once, by hand, that greets the reader every time they
 * open the front of the journal.
 */
export function DedicationWriteScreen() {
  const theme = useTheme();
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const firstRun = route.params?.firstRun ?? false;

  const existing = useSettingsStore((s) => s.dedication);
  const setDedication = useSettingsStore((s) => s.setDedication);
  const patch = useSettingsStore((s) => s.patch);

  const [to, setTo] = useState(existing?.to ?? '');
  const [from, setFrom] = useState(existing?.from ?? '');
  const [message, setMessage] = useState(existing?.message ?? '');

  const save = () => {
    const trimmed = message.trim();
    setDedication(
      trimmed || to.trim() || from.trim()
        ? {
            to: to.trim(),
            from: from.trim(),
            message: trimmed,
            date: existing?.date ?? new Date().toISOString(),
          }
        : null,
    );
    haptics.success();

    if (firstRun) {
      patch({ onboarded: true, dedicationSeen: false });
    } else {
      navigation.goBack();
    }
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <Header
        title={firstRun ? 'The first page' : 'Dedication'}
        back={!firstRun}
        right={
          firstRun ? undefined : (
            <Button label="Save" size="sm" onPress={save} />
          )
        }
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
        keyboardVerticalOffset={12}
      >
        <ScrollView
          contentContainerStyle={{ padding: theme.space.lg, paddingBottom: theme.space.huge }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.illustration}>
            <QuillAndInk size={150} />
          </View>

          <Text variant="body" tone="inkFaint" align="center" style={{ marginBottom: theme.space.lg }}>
            Every good gift has something written in the front of it. This page is yours — it will be
            waiting behind the cover whenever they open the journal.
          </Text>

          <Card padded={false} raise={2}>
            <View style={{ padding: theme.space.xl }}>
              <TextField
                label="For"
                placeholder="Their name"
                value={to}
                onChangeText={setTo}
                autoCapitalize="words"
                returnKeyType="next"
              />

              <View style={{ height: theme.space.lg }} />

              <Text variant="label" caps tone="inkFaint" style={{ marginBottom: 6 }}>
                The message
              </Text>
              <TextField
                placeholder={PLACEHOLDER}
                value={message}
                onChangeText={setMessage}
                handwritten
                auto
                multiline
                style={{ minHeight: 170 }}
                maxLength={900}
                hint={`${message.length}/900 · write as much or as little as you like`}
              />

              <View style={{ height: theme.space.lg }} />

              <TextField
                label="From"
                placeholder="Your name"
                value={from}
                onChangeText={setFrom}
                autoCapitalize="words"
              />

              <Ornament />

              <Text variant="caption" tone="inkFaint" align="center">
                {prettyDate(existing?.date ?? new Date())}
              </Text>
            </View>
          </Card>

          <Button
            label={firstRun ? 'Write it in' : 'Save the dedication'}
            size="lg"
            full
            style={{ marginTop: theme.space.xl }}
            onPress={save}
          />

          {firstRun ? (
            <Button
              label="Leave the page blank"
              variant="ghost"
              full
              style={{ marginTop: theme.space.xs }}
              onPress={() => patch({ onboarded: true, dedicationSeen: true })}
            />
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  illustration: { alignItems: 'center', marginBottom: 4 },
});
