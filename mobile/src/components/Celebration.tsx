import React, { useEffect, useMemo } from 'react';
import { Modal, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from './Text';
import { Button } from './Button';
import { PaperTexture } from './PaperTexture';
import { haptics } from '@/lib/haptics';
import { withAlpha } from '@/lib/color';

/**
 * The confetti moment.
 *
 * Not the loud kind — these are little scraps of coloured paper and gold leaf
 * that fall the way petals do, then settle. Fired when a book is finished, a
 * streak reaches a round number, or a reading anniversary comes round.
 */

const PIECE_COUNT = 34;

function Confetti({ colors }: { colors: string[] }) {
  const { width, height } = useWindowDimensions();

  const pieces = useMemo(
    () =>
      Array.from({ length: PIECE_COUNT }, (_, i) => {
        const rand = (n: number) => {
          const x = Math.sin((i + 1) * (n + 3) * 17.13) * 43758.5453;
          return x - Math.floor(x);
        };
        return {
          x: rand(1) * width,
          delay: rand(2) * 900,
          duration: 2200 + rand(3) * 2200,
          size: 6 + rand(4) * 9,
          color: colors[Math.floor(rand(5) * colors.length)],
          spin: (rand(6) - 0.5) * 4,
          drift: (rand(7) - 0.5) * 140,
          round: rand(8) > 0.72,
        };
      }),
    [colors, width],
  );

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {pieces.map((piece, index) => (
        <ConfettiPiece key={index} piece={piece} height={height} />
      ))}
    </View>
  );
}

function ConfettiPiece({
  piece,
  height,
}: {
  piece: {
    x: number;
    delay: number;
    duration: number;
    size: number;
    color: string;
    spin: number;
    drift: number;
    round: boolean;
  };
  height: number;
}) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      piece.delay,
      withTiming(1, { duration: piece.duration, easing: Easing.out(Easing.quad) }),
    );
  }, [piece.delay, piece.duration, progress]);

  const style = useAnimatedStyle(() => {
    const p = progress.value;
    return {
      transform: [
        { translateX: piece.x + Math.sin(p * Math.PI * 2.2) * piece.drift * 0.4 },
        { translateY: -40 + p * (height + 90) },
        { rotate: `${p * piece.spin * 720}deg` },
        { scaleX: Math.cos(p * Math.PI * 5) },
      ],
      // Fade out only in the last quarter of the fall.
      opacity: p > 0.75 ? 1 - (p - 0.75) * 4 : 1,
    };
  });

  return (
    <Animated.View
      style={[
        styles.piece,
        {
          width: piece.size,
          height: piece.round ? piece.size : piece.size * 0.55,
          borderRadius: piece.round ? piece.size : 1.5,
          backgroundColor: piece.color,
        },
        style,
      ]}
    />
  );
}

export type CelebrationProps = {
  visible: boolean;
  onDismiss: () => void;
  title: string;
  message: string;
  /** small line above the title — "Reading anniversary", "12 day streak" */
  eyebrow?: string;
  actionLabel?: string;
  onAction?: () => void;
  children?: React.ReactNode;
};

export function Celebration({
  visible,
  onDismiss,
  title,
  message,
  eyebrow,
  actionLabel,
  onAction,
  children,
}: CelebrationProps) {
  const theme = useTheme();
  const scale = useSharedValue(0.86);

  const palette = useMemo(
    () => [theme.colors.accent, theme.colors.gild, theme.colors.glow, theme.colors.paper, theme.colors.success],
    [theme.colors],
  );

  useEffect(() => {
    if (!visible) {
      scale.value = 0.86;
      return;
    }
    haptics.success();
    scale.value = withSequence(
      withSpring(1.03, { damping: 11, stiffness: 180 }),
      withSpring(1, { damping: 15, stiffness: 200 }),
    );
  }, [visible, scale]);

  const cardStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onDismiss}>
      <View style={[styles.backdrop, { backgroundColor: theme.colors.scrim }]}>
        <Confetti colors={palette} />

        <Animated.View
          entering={FadeIn.duration(260)}
          exiting={FadeOut.duration(180)}
          style={[
            styles.card,
            {
              backgroundColor: theme.colors.paperRaised,
              borderRadius: theme.radius.xl,
              padding: theme.space.xl,
              borderColor: withAlpha(theme.colors.gild, 0.4),
            },
            theme.elevation(3),
            cardStyle,
          ]}
        >
          <PaperTexture opacity={theme.grain} />

          {eyebrow ? (
            <Text variant="label" caps tone="accent" align="center" style={{ marginBottom: theme.space.sm }}>
              {eyebrow}
            </Text>
          ) : null}

          <Text variant="title" tone="ink" align="center">
            {title}
          </Text>

          <Text variant="body" tone="inkFaint" align="center" style={{ marginTop: theme.space.sm }}>
            {message}
          </Text>

          {children ? <View style={{ marginTop: theme.space.lg }}>{children}</View> : null}

          <View style={{ marginTop: theme.space.xl, alignItems: 'center', gap: theme.space.sm }}>
            {actionLabel && onAction ? <Button label={actionLabel} onPress={onAction} /> : null}
            <Button label="Lovely" variant="ghost" onPress={onDismiss} />
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 360, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  piece: { position: 'absolute', top: 0, left: 0 },
});
