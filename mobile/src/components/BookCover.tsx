import React, { memo, useMemo, useState } from 'react';
import { StyleSheet, View, ViewStyle, StyleProp } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from './Text';
import { hueFromString, withAlpha, shade } from '@/lib/color';
import type { Book } from '@/types';

/** Cloth colours for books with no cover art. Chosen to look good on a shelf together. */
export const CLOTH_COLORS = [
  '#8C4A3A', '#3F5A4C', '#4A4E6D', '#7A5230', '#6B3C4E',
  '#2F4858', '#7D6B3F', '#5B4B8A', '#8A6234', '#455B4B',
];

export const coverColorFor = (book: Pick<Book, 'id' | 'title' | 'spineColor'>) =>
  book.spineColor ?? hueFromString(book.id || book.title, CLOTH_COLORS);

export type CoverSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export const COVER_WIDTH: Record<CoverSize, number> = {
  xs: 40,
  sm: 64,
  md: 92,
  lg: 128,
  xl: 172,
};

/** Real books are close to 2:3. Everything in the app uses this one ratio. */
export const COVER_RATIO = 1.5;

/**
 * A book cover with a spine, a page block and a little gloss —
 * so even a bare-bones API result still looks like an object you could pick up.
 */
export const BookCover = memo(function BookCover({
  book,
  size = 'md',
  width,
  style,
  rounded,
  showSpine = true,
  dimmed,
}: {
  book: Pick<Book, 'id' | 'title' | 'authors' | 'coverUrl' | 'spineColor'>;
  size?: CoverSize;
  width?: number;
  style?: StyleProp<ViewStyle>;
  rounded?: number;
  showSpine?: boolean;
  dimmed?: boolean;
}) {
  const theme = useTheme();
  const w = width ?? COVER_WIDTH[size];
  const h = Math.round(w * COVER_RATIO);
  const radius = rounded ?? Math.max(3, Math.round(w * 0.045));
  const cloth = useMemo(() => coverColorFor(book), [book]);
  const tiny = w < 70;

  // Open Library does not have art for every edition, and a phone is not
  // always online — either way we fall back to a typeset cloth binding
  // rather than an empty rectangle.
  const [artFailed, setArtFailed] = useState(false);
  const showArt = Boolean(book.coverUrl) && !artFailed;

  return (
    <View
      style={[
        {
          width: w,
          height: h,
          borderRadius: radius,
          backgroundColor: cloth,
        },
        theme.elevation(2),
        style,
      ]}
    >
      <View style={[StyleSheet.absoluteFill, { borderRadius: radius, overflow: 'hidden' }]}>
        {/* The cloth binding sits underneath the art, so a slow or failed
            image reveals something handsome instead of a blank board. */}
        <FallbackCover title={book.title} author={book.authors?.[0]} cloth={cloth} width={w} tiny={tiny} />

        {showArt ? (
          <Animated.View entering={theme.calm ? undefined : FadeIn.duration(320)} style={StyleSheet.absoluteFill}>
            <Image
              source={{ uri: book.coverUrl }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              transition={220}
              cachePolicy="disk"
              recyclingKey={book.id}
              onError={() => setArtFailed(true)}
              accessibilityLabel={`Cover of ${book.title}`}
            />
          </Animated.View>
        ) : null}

        {/* the block of pages, just visible along the fore edge */}
        <LinearGradient
          colors={['rgba(255,255,255,0.55)', 'rgba(255,255,255,0.05)']}
          start={{ x: 1, y: 0 }}
          end={{ x: 0.93, y: 0 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />

        {/* the shadow the spine casts across the front board */}
        {showSpine ? (
          <LinearGradient
            colors={['rgba(0,0,0,0.30)', 'rgba(0,0,0,0.05)', 'rgba(0,0,0,0)']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 0.16, y: 0.5 }}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
        ) : null}

        {/* one soft highlight, top-left, like lamplight */}
        <LinearGradient
          colors={['rgba(255,255,255,0.16)', 'rgba(255,255,255,0)']}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.75, y: 0.7 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />

        {dimmed ? (
          <View
            style={[StyleSheet.absoluteFill, { backgroundColor: withAlpha(theme.colors.canvas, 0.55) }]}
            pointerEvents="none"
          />
        ) : null}
      </View>

      {/* hairline edge so light covers do not bleed into light backgrounds */}
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          {
            borderRadius: radius,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: withAlpha('#000000', 0.18),
          },
        ]}
      />
    </View>
  );
});

/** A typeset cloth binding, for books the internet has no picture of. */
function FallbackCover({
  title,
  author,
  cloth,
  width,
  tiny,
}: {
  title: string;
  author?: string;
  cloth: string;
  width: number;
  tiny: boolean;
}) {
  const pad = Math.max(6, width * 0.1);
  const gold = shade(cloth, 0.62);

  return (
    <LinearGradient colors={[shade(cloth, 0.1), cloth, shade(cloth, -0.16)]} style={StyleSheet.absoluteFill}>
      {/* the debossed rule you get on a hardback */}
      <View
        style={{
          position: 'absolute',
          top: pad * 0.7,
          left: pad * 0.7,
          right: pad * 0.7,
          bottom: pad * 0.7,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: withAlpha(gold, 0.45),
          borderRadius: 2,
        }}
      />
      {!tiny ? (
        <View style={{ flex: 1, padding: pad, justifyContent: 'center' }}>
          <Text
            variant={width > 110 ? 'subheading' : 'small'}
            color={gold}
            align="center"
            numberOfLines={5}
            style={{ fontFamily: 'Lora_600SemiBold' }}
          >
            {title}
          </Text>
          {author && width > 90 ? (
            <Text
              variant="caption"
              color={withAlpha(gold, 0.8)}
              align="center"
              numberOfLines={2}
              style={{ marginTop: 8 }}
            >
              {author}
            </Text>
          ) : null}
        </View>
      ) : (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text variant="caption" color={gold} align="center" numberOfLines={2} style={{ paddingHorizontal: 4 }}>
            {title.slice(0, 18)}
          </Text>
        </View>
      )}
    </LinearGradient>
  );
}
