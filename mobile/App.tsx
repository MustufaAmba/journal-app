import 'react-native-gesture-handler';
import React, { useCallback, useEffect, useState } from 'react';
import { AppState, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { Lora_500Medium, Lora_600SemiBold, Lora_500Medium_Italic } from '@expo-google-fonts/lora';
import { Karla_400Regular, Karla_500Medium, Karla_700Bold } from '@expo-google-fonts/karla';
import { Caveat_400Regular, Caveat_600SemiBold } from '@expo-google-fonts/caveat';
import {
  CormorantGaramond_500Medium_Italic,
  CormorantGaramond_600SemiBold,
} from '@expo-google-fonts/cormorant-garamond';

import { ThemeProvider } from '@/theme/ThemeProvider';
import { RootNavigator } from '@/navigation/RootNavigator';
import { CelebrationProvider } from '@/components/CelebrationProvider';
import { DialogProvider } from '@/components/DialogProvider';
import { hydrateStores } from '@/store';
import { drainSyncQueue, syncOnSignIn } from '@/api/sync';
import { useSettingsStore, useAuthStore } from '@/store';
import { scheduleReadingReminder } from '@/lib/notifications';

// Hold the splash until fonts and persisted state are both ready, so the very
// first frame the reader sees is the finished thing.
void SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // The app is local-first; network results are a bonus, never a blocker.
      retry: 1,
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 60 * 24,
      refetchOnWindowFocus: false,
      networkMode: 'offlineFirst',
    },
  },
});

export default function App() {
  const [storageReady, setStorageReady] = useState(false);

  const [fontsLoaded] = useFonts({
    Lora_500Medium,
    Lora_600SemiBold,
    Lora_500Medium_Italic,
    Karla_400Regular,
    Karla_500Medium,
    Karla_700Bold,
    Caveat_400Regular,
    Caveat_600SemiBold,
    CormorantGaramond_600SemiBold,
    CormorantGaramond_500Medium_Italic,
  });

  useEffect(() => {
    hydrateStores()
      .catch(() => undefined)
      .finally(() => setStorageReady(true));
  }, []);

  // Try to flush anything written while offline, on launch and on every return
  // to the foreground.
  useEffect(() => {
    if (!storageReady) return;
    void drainSyncQueue();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        useSettingsStore.getState().patch({ lastOpenedAt: Date.now() });
        void drainSyncQueue();
      }
    });
    return () => subscription.remove();
  }, [storageReady]);

  // Signing in on a new phone should simply bring the journal with it: push
  // anything written while signed out, then pull down the rest.
  useEffect(() => {
    if (!storageReady) return;
    let previous = useAuthStore.getState().user?.id ?? null;
    return useAuthStore.subscribe((state) => {
      const current = state.user?.id ?? null;
      if (current !== previous && current && !state.user?.guest) void syncOnSignIn();
      previous = current;
    });
  }, [storageReady]);

  // Reminders are scheduled locally, so they have to be re-armed after a
  // reinstall or an OS-level clear-out.
  useEffect(() => {
    if (!storageReady) return;
    const { reminder } = useSettingsStore.getState();
    if (reminder.enabled) void scheduleReadingReminder(reminder.hour, reminder.minute);
  }, [storageReady]);

  const ready = fontsLoaded && storageReady;

  const onLayout = useCallback(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={styles.root} onLayout={onLayout}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <DialogProvider>
              <CelebrationProvider>
                <View style={styles.root}>
                  <RootNavigator />
                </View>
              </CelebrationProvider>
            </DialogProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 } });
