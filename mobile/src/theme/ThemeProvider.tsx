import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme, TextStyle } from 'react-native';
import { THEMES, ThemeDefinition, ThemeId, Palette } from './palettes';
import { space, radius, type as typeScale, elevation, motion, TypeToken } from './tokens';
import { FONT_SCALES, useSettingsStore } from '@/store/useSettingsStore';
import { withAlpha, mix, shade } from '@/lib/color';

export type Theme = ThemeDefinition & {
  space: typeof space;
  radius: typeof radius;
  motion: typeof motion;
  /** type scale already multiplied by the reader's font-size preference */
  type: Record<TypeToken, TextStyle>;
  elevation: (level: 0 | 1 | 2 | 3) => object;
  alpha: (color: string, a: number) => string;
  /** true when the reader has asked for calmer animations */
  calm: boolean;
};

const ThemeContext = createContext<Theme | null>(null);

/** When "follow system" is on, these are the pairs we swap between. */
const SYSTEM_PAIR: Record<'light' | 'dark', ThemeId> = {
  light: 'classicLibrary',
  dark: 'rainyEvening',
};

function scaleType(scale: number): Record<TypeToken, TextStyle> {
  const out = {} as Record<TypeToken, TextStyle>;
  (Object.keys(typeScale) as TypeToken[]).forEach((key) => {
    const token = typeScale[key];
    out[key] = {
      ...token,
      fontSize: Math.round(token.fontSize * scale * 10) / 10,
      lineHeight: Math.round(token.lineHeight * scale * 10) / 10,
    };
  });
  return out;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const themeId = useSettingsStore((s) => s.theme);
  const followSystem = useSettingsStore((s) => s.followSystem);
  const fontScale = useSettingsStore((s) => s.fontScale);
  const reduceMotion = useSettingsStore((s) => s.reduceMotion);
  const systemScheme = useColorScheme();

  const value = useMemo<Theme>(() => {
    const resolvedId = followSystem ? SYSTEM_PAIR[systemScheme === 'dark' ? 'dark' : 'light'] : themeId;
    const definition = THEMES[resolvedId] ?? THEMES.classicLibrary;
    const shadowTint = definition.isDark ? '#000000' : shade(definition.colors.wood, -0.3);
    return {
      ...definition,
      space,
      radius,
      motion,
      type: scaleType(FONT_SCALES[fontScale]),
      elevation: (level) => elevation(level, shadowTint),
      alpha: withAlpha,
      calm: reduceMotion,
    };
  }, [themeId, followSystem, systemScheme, fontScale, reduceMotion]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const theme = useContext(ThemeContext);
  if (!theme) throw new Error('useTheme must be used inside <ThemeProvider>');
  return theme;
}

/** Shorthand for the common case of only needing colours. */
export function useColors(): Palette {
  return useTheme().colors;
}

export { mix, shade, withAlpha };
