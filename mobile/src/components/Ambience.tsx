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

/** Wings held open, seen from above — reads at 14px, which is all it needs to. */
const Butterfly = memo(({ color, size }: { color: string; size: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      d="M12 12c-1-4-4-8-7-8-2 0-3 2-2 4 1 3 5 4 9 4zM12 12c1-4 4-8 7-8 2 0 3 2 2 4-1 3-5 4-9 4z"
      fill={color}
      opacity={0.92}
    />
    <Path
      d="M12 12c-1 3-3 7-6 7-1.6 0-2.4-1.4-1.6-3 .9-1.8 4-3.4 7.6-4zM12 12c1 3 3 7 6 7 1.6 0 2.4-1.4 1.6-3-.9-1.8-4-3.4-7.6-4z"
      fill={color}
      opacity={0.68}
    />
    <Path d="M12 8.5c.5 0 .8.4.8 1v5c0 .6-.3 1-.8 1s-.8-.4-.8-1v-5c0-.6.3-1 .8-1z" fill={color} />
  </Svg>
));

/** Blunter wings, no colour in them — a moth is a butterfly's night shift. */
const Moth = memo(({ color, size }: { color: string; size: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M12 12C9 7 5 5 3 7c-1.6 1.6-.4 5 3 6 2 .6 4.2.6 6 -1zM12 12c3-5 7-7 9-5 1.6 1.6.4 5-3 6-2 .6-4.2.6-6-1z" fill={color} opacity={0.75} />
    <Path d="M12 11.5c.5 0 .9.5.9 1.2v3.6c0 .7-.4 1.2-.9 1.2s-.9-.5-.9-1.2v-3.6c0-.7.4-1.2.9-1.2z" fill={color} opacity={0.9} />
    <Path d="M11.2 11.2 9.4 8.6M12.8 11.2l1.8-2.6" stroke={color} strokeWidth={0.8} strokeLinecap="round" />
  </Svg>
));

const Feather = memo(({ color, size }: { color: string; size: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M18 3c-6 1-11 6-12 12-.3 1.7 0 3 .6 4 1-.6 2-2 2.6-3.6C10.6 11 14 6.5 18 3z" fill={color} opacity={0.8} />
    <Path d="M18 3C14 6.5 10.6 11 9.2 15.4" stroke={color} strokeWidth={0.7} opacity={0.9} />
  </Svg>
));

/** A torn half-page, turning as it falls. */
const PageScrap = memo(({ color, size }: { color: string; size: number }) => (
  <Svg width={size} height={size * 1.25} viewBox="0 0 20 25">
    <Path d="M2 1h13l3 3v20H2z" fill={color} opacity={0.85} />
    <Path d="M5 7h9M5 11h9M5 15h6" stroke={color} strokeWidth={0.9} opacity={0.45} />
  </Svg>
));

/* ------------------------------ particle ------------------------------ */

/** Drawn size per kind, at seed size 1. Module scope: it never changes. */
const BASE_SIZE: Partial<Record<AmbienceKind, number>> = {
  leaves: 18,
  blossom: 18,
  butterflies: 20,
  moths: 18,
  feathers: 17,
  pages: 15,
  steam: 40,
  bubbles: 10,
  rain: 2,
  embers: 4,
};

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

  // Embers and bubbles climb; dust hangs and drifts upward in the light.
  const rising = kind === 'dust' || kind === 'steam' || kind === 'fireflies' || kind === 'embers' || kind === 'bubbles';
  const fast = kind === 'rain';
  // Things with wings wander much further sideways than things that merely fall.
  const winged = kind === 'butterflies' || kind === 'moths';
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
    const x = seed.x * width + sway.value * (fast ? 4 : winged ? 70 : 26) * seed.drift;
    // Fade in at the start of the journey and out at the end.
    const fade = Math.sin(Math.PI * p);
    return {
      transform: [
        { translateX: x },
        { translateY: y },
        {
          rotate: `${sway.value * seed.spin * (
            kind === 'leaves' || kind === 'blossom' || kind === 'pages' || kind === 'feathers' ? 90
            : winged ? 26
            : 12
          )}deg`,
        },
        // A wing-beat: the shape squashes horizontally as it banks.
        { scaleX: winged ? 0.55 + Math.abs(Math.sin(sway.value * 3.2)) * 0.45 : 1 },
        { scale: kind === 'steam' ? 0.6 + p * 1.6 : 1 },
      ],
      opacity: seed.opacity * fade * (kind === 'steam' ? 0.5 : 1),
    };
  });

  const px = Math.round((BASE_SIZE[kind] ?? 4) * (seed.size + 0.4));

  return (
    <Animated.View style={[styles.particle, style]} pointerEvents="none">
      {kind === 'leaves' ? (
        <Leaf color={color} size={px} />
      ) : kind === 'blossom' ? (
        <Petal color={color} size={px} />
      ) : kind === 'butterflies' ? (
        <Butterfly color={color} size={px} />
      ) : kind === 'moths' ? (
        <Moth color={color} size={px} />
      ) : kind === 'feathers' ? (
        <Feather color={color} size={px} />
      ) : kind === 'pages' ? (
        <PageScrap color={color} size={px} />
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
      dust: { count: 10, color: theme.colors.glow },
      leaves: { count: 8, color: theme.colors.accent },
      steam: { count: 5, color: theme.colors.paperRaised },
      rain: { count: 14, color: withAlpha(theme.colors.glow, 0.55) },
      fireflies: { count: 9, color: theme.colors.glow },
      snow: { count: 12, color: '#FFFFFF' },
      blossom: { count: 8, color: theme.colors.accentSoft },
      stars: { count: 16, color: theme.colors.glow },
      // Fewer of these: a butterfly is an event, not weather.
      butterflies: { count: 6, color: theme.colors.accent },
      moths: { count: 6, color: withAlpha(theme.colors.glow, 0.7) },
      feathers: { count: 7, color: theme.colors.inkFaint },
      embers: { count: 9, color: theme.colors.glow },
      bubbles: { count: 8, color: withAlpha(theme.colors.paperRaised, 0.7) },
      pages: { count: 7, color: theme.colors.paperRaised },
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
