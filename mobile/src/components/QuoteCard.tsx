import React, { forwardRef } from 'react';
import { StyleSheet, View, ViewStyle, StyleProp } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from './Text';
import { Pressable } from './Pressable';
import { PaperTexture } from './PaperTexture';
import { withAlpha, mix } from '@/lib/color';
import type { Quote } from '@/types';

/** Six paper stocks so a wall of quotes looks like a collage, not a spreadsheet. */
export function quotePaper(theme: ReturnType<typeof useTheme>, index: number) {
  const c = theme.colors;
  const tints = [c.paper, c.accentSoft, c.paperSunken, mix(c.paper, c.gild, 0.16), mix(c.paper, c.accent, 0.1), c.paperRaised];
  return tints[Math.abs(index) % tints.length];
}

const QuoteMark = ({ color, size = 30 }: { color: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      d="M9.5 5C6 6.5 4 9.5 4 13v6h7v-7H7.6c.2-2.2 1.3-3.9 3.3-5L9.5 5zm10 0C16 6.5 14 9.5 14 13v6h7v-7h-3.4c.2-2.2 1.3-3.9 3.3-5L19.5 5z"
      fill={color}
    />
  </Svg>
);

/**
 * A quote printed on a card, with the rotated look of something pinned to a
 * board. `flat` turns off the tilt for the share-as-image render.
 */
export const QuoteCard = forwardRef<View, {
  quote: Quote;
  onPress?: () => void;
  onLongPress?: () => void;
  style?: StyleProp<ViewStyle>;
  flat?: boolean;
  compact?: boolean;
  /** deterministic tilt, so a card does not jump when the list re-renders */
  tiltSeed?: number;
}>(function QuoteCard({ quote, onPress, onLongPress, style, flat, compact, tiltSeed = 0 }, ref) {
  const theme = useTheme();
  const paper = quotePaper(theme, quote.colorIndex);
  const tilt = flat ? 0 : ((tiltSeed % 5) - 2) * 0.45;

  const body = (
    <View
      ref={ref}
      collapsable={false}
      style={[
        styles.card,
        {
          backgroundColor: paper,
          borderRadius: theme.radius.lg,
          borderColor: withAlpha(theme.colors.rule, 0.9),
          padding: compact ? theme.space.lg : theme.space.xl,
          transform: [{ rotate: `${tilt}deg` }],
        },
        theme.elevation(2),
        style,
      ]}
    >
      <PaperTexture opacity={theme.grain * 0.9} style={{ borderRadius: theme.radius.lg }} />

      <LinearGradient
        colors={[withAlpha(theme.colors.glow, 0.22), 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.8, y: 0.9 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <View style={{ opacity: 0.28, marginBottom: -6, marginLeft: -4 }}>
        <QuoteMark color={theme.colors.accent} size={compact ? 24 : 32} />
      </View>

      <Text
        variant="quote"
        tone="ink"
        style={{ marginTop: theme.space.xs }}
        numberOfLines={compact ? 5 : undefined}
      >
        {quote.text}
      </Text>

      {quote.speaker ? (
        <Text variant="small" tone="inkFaint" italic style={{ marginTop: theme.space.sm }}>
          — {quote.speaker}
        </Text>
      ) : null}

      <View style={[styles.footer, { marginTop: theme.space.lg, borderTopColor: withAlpha(theme.colors.rule, 0.8) }]}>
        <View style={{ flex: 1 }}>
          {quote.bookTitle ? (
            <Text variant="small" tone="inkSoft" numberOfLines={1} style={{ fontFamily: 'Lora_600SemiBold' }}>
              {quote.bookTitle}
            </Text>
          ) : null}
          <Text variant="caption" tone="inkFaint" numberOfLines={1}>
            {[quote.bookAuthor, quote.chapter, quote.page ? `p. ${quote.page}` : null].filter(Boolean).join(' · ')}
          </Text>
        </View>

        {quote.favorite ? (
          <Svg width={16} height={16} viewBox="0 0 24 24">
            <Path
              d="M12 21s-8-5.2-8-11a4.7 4.7 0 018-3.3A4.7 4.7 0 0120 10c0 5.8-8 11-8 11z"
              fill={theme.colors.accent}
            />
          </Svg>
        ) : null}
      </View>
    </View>
  );

  if (!onPress && !onLongPress) return body;

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      scaleTo={0.98}
      accessibilityRole="button"
      accessibilityLabel={`Quote: ${quote.text.slice(0, 60)}`}
    >
      {body}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: { overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth },
  footer: { flexDirection: 'row', alignItems: 'center', borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 10 },
});
