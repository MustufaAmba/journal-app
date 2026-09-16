import React, { useMemo } from 'react';
import { StyleSheet, View, ViewStyle, StyleProp } from 'react-native';
import Svg, { Circle, Defs, Pattern, Rect } from 'react-native-svg';
import { useTheme } from '@/theme/ThemeProvider';

/**
 * The grain that stops every surface in the app from looking like flat plastic.
 *
 * This used to be an SVG `feTurbulence` filter, which was beautiful and far too
 * expensive: the filter is evaluated per pixel, so a full-screen grain layer
 * asked the GPU for fractal noise across two-and-a-half million pixels — and
 * there is one of these behind every screen and inside every Card, a dozen or
 * more alive at once. On a real phone it locked the UI up.
 *
 * So the tooth is drawn instead: a small tile of deterministic specks, which
 * the renderer rasterises ONCE and then repeats across the surface. Same grain
 * at the opacities we actually use, for a fraction of the cost.
 */

/** Tile edge, in points. Small enough to be cheap, large enough not to read as a repeat. */
const TILE = 64;
const SPECK_COUNT = 40;

/** Deterministic, so the grain is identical on every surface and every launch. */
const SPECKS = (() => {
  const rand = (n: number) => {
    const x = Math.sin((n + 1) * 12.9898) * 43758.5453;
    return x - Math.floor(x);
  };
  return Array.from({ length: SPECK_COUNT }, (_, i) => ({
    cx: rand(i * 5) * TILE,
    cy: rand(i * 5 + 1) * TILE,
    r: 0.45 + rand(i * 5 + 2) * 0.85,
    // A mix of light and dark flecks, so the grain sits on pale and dark
    // themes alike rather than only darkening things.
    light: rand(i * 5 + 3) > 0.62,
    o: 0.3 + rand(i * 5 + 4) * 0.7,
  }));
})();

export function PaperTexture({
  opacity,
  style,
  seed = 7,
  pointerEvents = 'none',
}: {
  opacity?: number;
  style?: StyleProp<ViewStyle>;
  /** Kept for callers; shifts the tile so adjacent surfaces do not line up. */
  seed?: number;
  pointerEvents?: 'none' | 'auto';
}) {
  const theme = useTheme();
  const strength = opacity ?? theme.grain;

  // The tile is static, so it is built once and reused for the lifetime of
  // the component rather than rebuilt on every theme tick or re-render.
  const grain = useMemo(() => {
    const id = `grain${seed}`;
    const shift = (seed * 7) % TILE;
    return (
      <Svg width="100%" height="100%">
        <Defs>
          <Pattern
            id={id}
            x={shift}
            y={shift}
            width={TILE}
            height={TILE}
            patternUnits="userSpaceOnUse"
          >
            {SPECKS.map((s, i) => (
              <Circle
                key={i}
                cx={s.cx}
                cy={s.cy}
                r={s.r}
                fill={s.light ? '#FFFFFF' : '#000000'}
                opacity={s.o}
              />
            ))}
          </Pattern>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
    );
  }, [seed]);

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
