import React, { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from './Text';
import { Pressable } from './Pressable';
import { coverColorFor } from './BookCover';
import { withAlpha, shade } from '@/lib/color';
import type { Book } from '@/types';

/**
 * A book seen edge-on, the way it actually sits on a shelf: title running up
 * the spine, gilt bands top and bottom, thickness derived from page count.
 */
export const BookSpine = memo(function BookSpine({
  book,
  height = 168,
  onPress,
  onLongPress,
  highlighted,
}: {
  book: Pick<Book, 'id' | 'title' | 'authors' | 'pageCount' | 'spineColor'>;
  height?: number;
  onPress?: () => void;
  onLongPress?: () => void;
  highlighted?: boolean;
}) {
  const theme = useTheme();
  const cloth = useMemo(() => coverColorFor(book), [book]);
  const gold = shade(cloth, 0.6);

  // A 900-page doorstop should look like one. Clamp so the shelf stays tidy.
  const width = useMemo(() => {
    const pages = book.pageCount ?? 280;
    return Math.round(Math.max(22, Math.min(52, 18 + pages / 16)));
  }, [book.pageCount]);

  // Leave room for the gilt bands at both ends.
  const titleLength = height - 52;

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      scaleTo={0.97}
      accessibilityRole="button"
      accessibilityLabel={`${book.title}${book.authors?.[0] ? ` by ${book.authors[0]}` : ''}`}
      style={{ marginRight: 3 }}
    >
      <View
        style={[
          {
            width,
            height,
            borderRadius: 3,
            backgroundColor: cloth,
            overflow: 'hidden',
            transform: [{ translateY: highlighted ? -8 : 0 }],
          },
          theme.elevation(2),
        ]}
      >
        <LinearGradient
          colors={[shade(cloth, 0.22), cloth, shade(cloth, -0.24)]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />

        {/* gilt bands */}
        <View style={[styles.band, { top: 12, backgroundColor: withAlpha(gold, 0.55) }]} />
        <View style={[styles.band, { top: 16, backgroundColor: withAlpha(gold, 0.3) }]} />
        <View style={[styles.band, { bottom: 12, backgroundColor: withAlpha(gold, 0.55) }]} />
        <View style={[styles.band, { bottom: 16, backgroundColor: withAlpha(gold, 0.3) }]} />

        {/*
          The title has to be laid out horizontally at full length and *then*
          rotated. Left in the normal flow it would be measured against the
          spine's ~30px width and truncated to nothing, so it is positioned
          absolutely — out of reach of the parent's cross-axis sizing — and
          centred by hand.
        */}
        <View
          pointerEvents="none"
          style={[
            styles.titleWrap,
            {
              width: titleLength,
              height: 18,
              left: (width - titleLength) / 2,
              top: height / 2 - 9,
            },
          ]}
        >
          <Text
            numberOfLines={1}
            variant="small"
            color={gold}
            style={[styles.verticalTitle, { fontFamily: 'Lora_600SemiBold' }]}
          >
            {book.title}
          </Text>
        </View>
      </View>
    </Pressable>
  );
});

/** Thickness of a book, from its page count. Shared by upright and flat books. */
export function spineThickness(pageCount?: number): number {
  return Math.round(Math.max(22, Math.min(52, 18 + (pageCount ?? 280) / 16)));
}

/** How wide a book lying flat is, relative to an upright spine's height. */
export const FLAT_WIDTH_RATIO = 0.62;

/**
 * Books lying flat, piled on top of each other.
 *
 * Nobody shelves a whole wall of upright spines — there is always a short
 * stack lying down at the end of a run, usually the ones being read or the
 * ones too tall to stand. Each book in the pile is nudged a few pixels sideways
 * so it looks stacked by hand rather than machine-aligned.
 */
export const FlatBookStack = memo(function FlatBookStack({
  books,
  spineHeight = 168,
  onPress,
  onLongPress,
}: {
  books: Pick<Book, 'id' | 'title' | 'authors' | 'pageCount' | 'spineColor'>[];
  spineHeight?: number;
  onPress?: (bookId: string) => void;
  onLongPress?: (bookId: string) => void;
}) {
  const theme = useTheme();
  const width = Math.round(spineHeight * FLAT_WIDTH_RATIO);

  return (
    <View style={[styles.stack, { width, marginRight: 3 }]}>
      {/* Drawn bottom-up so the top book of the pile renders last. */}
      {books.map((book, index) => {
        const cloth = coverColorFor(book);
        const gold = shade(cloth, 0.6);
        const thickness = Math.round(spineThickness(book.pageCount) * 0.72);
        // A hand-made pile is never perfectly squared off.
        const nudge = ((index % 3) - 1) * 3;

        return (
          <Pressable
            key={book.id}
            onPress={onPress ? () => onPress(book.id) : undefined}
            onLongPress={onLongPress ? () => onLongPress(book.id) : undefined}
            scaleTo={0.97}
            accessibilityRole="button"
            accessibilityLabel={`${book.title}${book.authors?.[0] ? ` by ${book.authors[0]}` : ''}`}
            style={{ marginLeft: nudge }}
          >
            <View
              style={[
                {
                  width: width - Math.abs(nudge),
                  height: thickness,
                  borderRadius: 3,
                  backgroundColor: cloth,
                  overflow: 'hidden',
                },
                theme.elevation(1),
              ]}
            >
              <LinearGradient
                colors={[shade(cloth, 0.22), cloth, shade(cloth, -0.24)]}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              {/* gilt bands, now running vertically across the spine */}
              <View style={[styles.flatBand, { left: 10, backgroundColor: withAlpha(gold, 0.5) }]} />
              <View style={[styles.flatBand, { right: 10, backgroundColor: withAlpha(gold, 0.5) }]} />

              <View style={styles.flatTitle}>
                <Text
                  numberOfLines={1}
                  variant="caption"
                  color={gold}
                  style={{ fontFamily: 'Lora_600SemiBold', fontSize: Math.min(11, thickness * 0.46) }}
                >
                  {book.title}
                </Text>
              </View>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  band: { position: 'absolute', left: 3, right: 3, height: 1.5 },
  stack: { justifyContent: 'flex-end', alignItems: 'center' },
  flatBand: { position: 'absolute', top: 2, bottom: 2, width: 1.5 },
  flatTitle: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  titleWrap: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  // Rotating the text is what turns a coloured rectangle into a spine.
  verticalTitle: { transform: [{ rotate: '-90deg' }], textAlign: 'center', width: '100%' },
});
