import React from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Text';
import { BookCover, coverColorFor } from '@/components/BookCover';
import { withAlpha, shade } from '@/lib/color';
import type { Book } from '@/types';

export const HERO_HEIGHT = 400;

/**
 * The top of the book page.
 *
 * The cover's own artwork is blurred up behind it to colour the whole screen,
 * so opening a book about the sea feels blue and one about autumn feels gold.
 * Everything parallaxes gently as you scroll, and the cover tilts as if it
 * were being lifted off a table.
 */
export function BookHero({ book, scrollY }: { book: Book; scrollY: SharedValue<number> }) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const cloth = coverColorFor(book);

  const backdropStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(scrollY.value, [-200, 0, HERO_HEIGHT], [-100, 0, HERO_HEIGHT * 0.5], Extrapolation.CLAMP) },
      { scale: interpolate(scrollY.value, [-200, 0], [1.35, 1], Extrapolation.CLAMP) },
    ],
  }));

  const coverStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 800 },
      { translateY: interpolate(scrollY.value, [0, HERO_HEIGHT], [0, -70], Extrapolation.CLAMP) },
      { scale: interpolate(scrollY.value, [-140, 0, 200], [1.12, 1, 0.88], Extrapolation.CLAMP) },
      { rotateX: `${interpolate(scrollY.value, [0, 220], [0, 12], Extrapolation.CLAMP)}deg` },
    ],
    opacity: interpolate(scrollY.value, [140, 300], [1, 0], Extrapolation.CLAMP),
  }));

  const titleStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [60, 200], [1, 0], Extrapolation.CLAMP),
    transform: [{ translateY: interpolate(scrollY.value, [0, 200], [0, -24], Extrapolation.CLAMP) }],
  }));

  return (
    <View style={[styles.hero, { height: HERO_HEIGHT }]}>
      <Animated.View style={[StyleSheet.absoluteFill, backdropStyle]}>
        {book.coverUrl ? (
          <Image
            source={{ uri: book.coverUrl }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            blurRadius={60}
            cachePolicy="disk"
          />
        ) : (
          <LinearGradient
            colors={[shade(cloth, 0.2), cloth]}
            style={StyleSheet.absoluteFill}
          />
        )}
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: withAlpha(theme.colors.canvas, theme.isDark ? 0.62 : 0.5) },
          ]}
        />
      </Animated.View>

      {/* fade the blurred art into the page below it */}
      <LinearGradient
        colors={['transparent', withAlpha(theme.colors.canvas, 0.6), theme.colors.canvas]}
        locations={[0.35, 0.78, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <View style={styles.heroContent}>
        <Animated.View style={coverStyle}>
          <BookCover book={book} width={Math.min(178, width * 0.44)} />
        </Animated.View>

        <Animated.View style={[styles.heroText, { paddingHorizontal: theme.space.xl }, titleStyle]}>
          <Text variant="title" tone="ink" align="center" numberOfLines={3}>
            {book.title}
          </Text>
          {book.subtitle ? (
            <Text variant="small" tone="inkFaint" align="center" italic numberOfLines={2} style={{ marginTop: 2 }}>
              {book.subtitle}
            </Text>
          ) : null}
          {book.authors.length ? (
            <Text variant="subheading" tone="inkSoft" align="center" style={{ marginTop: 6 }}>
              {book.authors.join(' · ')}
            </Text>
          ) : null}
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { overflow: 'hidden' },
  heroContent: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 18, paddingTop: 56 },
  heroText: { marginTop: 18 },
});
