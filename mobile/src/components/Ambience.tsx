import React, { memo, useMemo } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '@/theme/ThemeProvider';
import { useSettingsStore } from '@/store/useSettingsStore';
import { ambienceForSeason } from '@/lib/season';
import { withAlpha } from '@/lib/color';
import type { Ambience as AmbienceKind } from '@/theme/palettes';

/**
 * The weather of the app.
 *
 * Each theme has an ambience that drifts behind the content — dust in the
 * library, leaves in autumn, rain on the window. It is deliberately slow and
 * low-contrast: you should notice it only when you stop and look.
 *
 * Everything runs on the UI thread through Reanimated, so scrolling stays at
 * 60fps, and the whole system switches off when Reduce Motion is on.
 */

type ParticleConfig = {
  count: number;
  render: (index: number, seed: Seed, color: string, size: number) => React.ReactNode;
};

type Seed = {
  x: number;
  delay: number;
  duration: number;
  size: number;
  drift: number;
  spin: number;
  opacity: number;
};

/** Deterministic pseudo-random so particles do not re-scatter on every render. */
function makeSeeds(count: number, salt: number): Seed[] {
  const rand = (n: number) => {
    const x = Math.sin((n + 1) * 12.9898 + salt * 78.233) * 43758.5453;
    return x - Math.floor(x);
  };
  return Array.from({ length: count }, (_, i) => ({
    x: rand(i * 4),
    delay: rand(i * 4 + 1) * 8000,
    duration: 9000 + rand(i * 4 + 2) * 14000,
    size: 0.5 + rand(i * 4 + 3) * 0.9,
    drift: (rand(i * 7) - 0.5) * 2,
    spin: (rand(i * 11) - 0.5) * 2,
    opacity: 0.25 + rand(i * 13) * 0.55,
  }));
}

/* ------------------------------- shapes ------------------------------- */

const Leaf = memo(({ color, size }: { color: string; size: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      d="M21 3C11 3 3 8 3 16c0 2 .6 3.7 1.7 5C8 17 12 14.5 17 13c-4 3-7.5 5.4-10 9.5.9.3 1.8.5 2.8.5C18 23 21 14 21 3z"
      fill={color}
    />
  </Svg>
));

const Petal = memo(({ color, size }: { color: string; size: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M12 2c5 4 8 8 8 12a8 8 0 11-16 0c0-4 3-8 8-12z" fill={color} opacity={0.85} />
  </Svg>
));

/* ------------------------------ particle ------------------------------ */

function FallingParticle({
  seed,
  height,
  width,
  color,
  kind,
  calm,
}: {
  seed: Seed;
  height: number;
  width: number;
  color: string;
  kind: AmbienceKind;
  calm: boolean;
}) {
  const progress = useSharedValue(0);
  const sway = useSharedValue(0);

  const rising = kind === 'dust' || kind === 'steam' || kind === 'fireflies';
  const fast = kind === 'rain';
  const duration = fast ? seed.duration * 0.16 : seed.duration;

  React.useEffect(() => {
    if (calm) return;
    progress.value = withDelay(
      seed.delay,
      withRepeat(withTiming(1, { duration, easing: Easing.linear }), -1, false),
    );
    sway.value = withDelay(
      seed.delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 3200 + seed.size * 1800, easing: Easing.inOut(Easing.sin) }),
          withTiming(-1, { duration: 3200 + seed.size * 1800, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        true,
      ),
    );
  }, [calm, duration, progress, sway, seed.delay, seed.size]);

  const style = useAnimatedStyle(() => {
    const p = progress.value;
    const travel = height + 120;
    const y = rising ? travel - p * travel - 60 : p * travel - 60;
    const x = seed.x * width + sway.value * (fast ? 4 : 26) * seed.drift;
    // Fade in at the start of the journey and out at the end.
    const fade = Math.sin(Math.PI * p);
    return {
      transform: [
        { translateX: x },
        { translateY: y },
        { rotate: `${sway.value * seed.spin * (kind === 'leaves' || kind === 'blossom' ? 90 : 12)}deg` },
        { scale: kind === 'steam' ? 0.6 + p * 1.6 : 1 },
      ],
      opacity: seed.opacity * fade * (kind === 'steam' ? 0.5 : 1),
    };
  });

  const px = Math.round(
    (kind === 'leaves' || kind === 'blossom' ? 18 : kind === 'steam' ? 40 : kind === 'rain' ? 2 : 4) *
      (seed.size + 0.4),
  );

  return (
    <Animated.View style={[styles.particle, style]} pointerEvents="none">
      {kind === 'leaves' ? (
        <Leaf color={color} size={px} />
      ) : kind === 'blossom' ? (
        <Petal color={color} size={px} />
      ) : (
        <View
          style={{
            width: px,
            height: kind === 'rain' ? px * 9 : px,
            borderRadius: kind === 'rain' ? px : px / 2,
            backgroundColor: color,
          }}
        />
      )}
    </Animated.View>
  );
}

/** Fireflies and stars do not travel — they breathe in place. */
function TwinklingParticle({
  seed,
  height,
  width,
  color,
  glow,
  calm,
}: {
  seed: Seed;
  height: number;
  width: number;
  color: string;
  glow: boolean;
  calm: boolean;
}) {
  const pulse = useSharedValue(0);

  React.useEffect(() => {
    if (calm) return;
    pulse.value = withDelay(
      seed.delay * 0.4,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 1400 + seed.size * 2600, easing: Easing.inOut(Easing.quad) }),
          withTiming(0, { duration: 1800 + seed.size * 2600, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
        false,
      ),
    );
  }, [calm, pulse, seed.delay, seed.size]);

  const drift = useSharedValue(0);
  React.useEffect(() => {
    if (calm || !glow) return;
    drift.value = withRepeat(
      withTiming(1, { duration: 9000 + seed.size * 7000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, [calm, drift, glow, seed.size]);

  const size = Math.round((glow ? 5 : 2.5) * (seed.size + 0.5));

  const style = useAnimatedStyle(() => ({
    left: seed.x * width + drift.value * 40 * seed.drift,
    top: seed.opacity * height + drift.value * 26 * seed.spin,
    opacity: 0.12 + pulse.value * seed.opacity,
    transform: [{ scale: 0.7 + pulse.value * 0.6 }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size,
          backgroundColor: color,
          shadowColor: color,
          shadowOpacity: glow ? 0.9 : 0.5,
          shadowRadius: glow ? 8 : 4,
          shadowOffset: { width: 0, height: 0 },
        },
        style,
      ]}
    />
  );
}

/* ------------------------------- surface ------------------------------ */

export function Ambience({ intensity = 1 }: { intensity?: number }) {
  const theme = useTheme();
  const enabled = useSettingsStore((s) => s.ambience);
  const seasonal = useSettingsStore((s) => s.seasonalDecorations);
  const { width, height } = useWindowDimensions();

  // The theme sets the weather; the calendar is allowed to nudge it.
  const kind = useMemo(
    () => ambienceForSeason(theme.ambience, seasonal),
    [theme.ambience, seasonal],
  );

  const config = useMemo(() => {
    const base: Record<AmbienceKind, { count: number; color: string }> = {
      dust: { count: 20, color: theme.colors.glow },
      leaves: { count: 12, color: theme.colors.accent },
      steam: { count: 7, color: theme.colors.paperRaised },
      rain: { count: 26, color: withAlpha(theme.colors.glow, 0.55) },
      fireflies: { count: 16, color: theme.colors.glow },
      snow: { count: 22, color: '#FFFFFF' },
      blossom: { count: 12, color: theme.colors.accentSoft },
      stars: { count: 30, color: theme.colors.glow },
    };
    return base[kind];
  }, [kind, theme.colors]);

  const seeds = useMemo(
    () => makeSeeds(Math.round(config.count * intensity), kind.length),
    [config.count, intensity, kind],
  );

  if (!enabled || theme.calm) return null;

  const twinkles = kind === 'stars' || kind === 'fireflies';

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {seeds.map((seed, index) =>
        twinkles ? (
          <TwinklingParticle
            key={index}
            seed={seed}
            width={width}
            height={height}
            color={config.color}
            glow={kind === 'fireflies'}
            calm={theme.calm}
          />
        ) : (
          <FallingParticle
            key={index}
            seed={seed}
            width={width}
            height={height}
            color={config.color}
            kind={kind}
            calm={theme.calm}
          />
        ),
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  particle: { position: 'absolute', top: 0, left: 0 },
});
