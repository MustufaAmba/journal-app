import React, { useMemo } from 'react';
import { StyleSheet, View, ViewStyle, StyleProp } from 'react-native';
import Svg, { Defs, Filter, FeTurbulence, FeColorMatrix, Rect } from 'react-native-svg';
import { useTheme } from '@/theme/ThemeProvider';

/**
 * The grain that stops every surface in the app from looking like flat plastic.
 *
 * It is an SVG fractal-noise filter rather than a bitmap: no asset to ship, it
 * scales to any size, and the opacity is driven by the theme so Sepia Paper
 * feels rougher than Morning Light.
 */
export function PaperTexture({
  opacity,
  style,
  seed = 7,
  pointerEvents = 'none',
}: {
  opacity?: number;
  style?: StyleProp<ViewStyle>;
  seed?: number;
  pointerEvents?: 'none' | 'auto';
}) {
  const theme = useTheme();
  const strength = opacity ?? theme.grain;

  // Rebuilding this SVG on every render is wasteful — the filter is static.
  const grain = useMemo(
    () => (
      <Svg width="100%" height="100%">
        <Defs>
          <Filter id="grain" x="0" y="0" width="100%" height="100%">
            <FeTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={3} seed={seed} />
            <FeColorMatrix type="saturate" values="0" />
          </Filter>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" filter="url(#grain)" />
      </Svg>
    ),
    [seed],
  );

  if (strength <= 0) return null;

  return (
    <View
      pointerEvents={pointerEvents}
      style={[StyleSheet.absoluteFill, { opacity: strength, overflow: 'hidden' }, style]}
    >
      {grain}
    </View>
  );
}
