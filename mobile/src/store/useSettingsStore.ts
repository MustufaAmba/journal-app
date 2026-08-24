import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from '@/lib/storage';
import { setHapticsEnabled } from '@/lib/haptics';
import type { ThemeId } from '@/theme/palettes';

export type FontScale = 'small' | 'comfortable' | 'large' | 'largest';

export const FONT_SCALES: Record<FontScale, number> = {
  small: 0.92,
  comfortable: 1,
  large: 1.12,
  largest: 1.26,
};

type SettingsState = {
  theme: ThemeId;
  /** follow the system light/dark preference, picking a paired theme */
  followSystem: boolean;
  fontScale: FontScale;
  haptics: boolean;
  ambience: boolean;
  seasonalDecorations: boolean;
  reduceMotion: boolean;
  /** the dedication written on the inside cover */
  dedication: { to: string; from: string; message: string; date: string } | null;
  dedicationSeen: boolean;
  onboarded: boolean;
  reminder: { enabled: boolean; hour: number; minute: number };
  goalReminder: boolean;
  streakReminder: boolean;
  defaultLibraryView: 'bookshelf' | 'grid' | 'list' | 'spines';
  lastOpenedAt: number;

  setTheme: (theme: ThemeId) => void;
  patch: (partial: Partial<SettingsState>) => void;
  setDedication: (value: SettingsState['dedication']) => void;
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'classicLibrary',
      followSystem: false,
      fontScale: 'comfortable',
      haptics: true,
      ambience: true,
      seasonalDecorations: true,
      reduceMotion: false,
      dedication: null,
      dedicationSeen: false,
      onboarded: false,
      reminder: { enabled: false, hour: 21, minute: 0 },
      goalReminder: true,
      streakReminder: true,
      defaultLibraryView: 'bookshelf',
      lastOpenedAt: Date.now(),

      setTheme: (theme) => set({ theme, followSystem: false }),
      patch: (partial) => set(partial),
      setDedication: (dedication) => set({ dedication }),
    }),
    {
      name: 'settings.v1',
      storage: createJSONStorage(() => zustandStorage),
      onRehydrateStorage: () => (state) => {
        if (state) setHapticsEnabled(state.haptics);
      },
    },
  ),
);

/** Keep the haptics module in step with the setting. */
useSettingsStore.subscribe((state) => setHapticsEnabled(state.haptics));
