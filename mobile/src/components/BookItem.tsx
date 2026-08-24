import React, { memo } from 'react';
import { StyleSheet, View, ViewStyle, StyleProp } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from './Text';
import { Pressable } from './Pressable';
import { BookCover, COVER_WIDTH, CoverSize } from './BookCover';
import { ProgressBar } from './ProgressRing';
import { Rating } from './Rating';
import { withAlpha } from '@/lib/color';
import { friendlyDate } from '@/lib/date';
import { progressOf } from '@/store/useLibraryStore';
import type { Book, LibraryEntry } from '@/types';

type Common = {
  book: Book;
  entry?: LibraryEntry;
  onPress?: () => void;
  onLongPress?: () => void;
  index?: number;
  style?: StyleProp<ViewStyle>;
};

const stagger = (index?: number) => (index === undefined ? 0 : Math.min(index, 8) * 45);

/** One book as a row: cover, title, author, and whatever matters most right now. */
export const BookRow = memo(function BookRow({ book, entry, onPress, onLongPress, index, style }: Common) {
  const theme = useTheme();
  const progress = entry ? progressOf(entry, book.pageCount) : 0;
  const reading = entry?.shelf === 'currentlyReading';

  return (
    <Animated.View entering={theme.calm ? undefined : FadeInDown.delay(stagger(index)).duration(360)}>
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        scaleTo={0.985}
        accessibilityRole="button"
        accessibilityLabel={`${book.title}${book.authors[0] ? `, by ${book.authors[0]}` : ''}`}
        style={[styles.row, { paddingVertical: theme.space.md }, style]}
      >
        <BookCover book={book} size="sm" />

        <View style={[styles.rowBody, { marginLeft: theme.space.lg }]}>
          <Text variant="subheading" tone="ink" numberOfLines={2} style={{ fontFamily: 'Lora_600SemiBold' }}>
            {book.title}
          </Text>

          {book.authors[0] ? (
            <Text variant="small" tone="inkFaint" numberOfLines={1} style={{ marginTop: 1 }}>
              {book.authors.join(', ')}
            </Text>
          ) : null}

          {reading ? (
            <View style={{ marginTop: theme.space.sm }}>
              <ProgressBar progress={progress / 100} height={5} />
              <Text variant="caption" tone="inkFaint" style={{ marginTop: 4 }}>
                {book.pageCount
                  ? `page ${entry?.currentPage ?? 0} of ${book.pageCount} · ${progress}%`
                  : `${progress}% through`}
              </Text>
            </View>
          ) : entry?.finishedAt ? (
            <View style={[styles.metaRow, { marginTop: theme.space.sm }]}>
              {entry.rating ? <Rating value={entry.rating} readOnly size={13} /> : null}
              <Text variant="caption" tone="inkFaint" style={entry.rating ? { marginLeft: 8 } : undefined}>
                finished {friendlyDate(entry.finishedAt)}
              </Text>
            </View>
          ) : book.firstPublishYear || book.pageCount ? (
            <Text variant="caption" tone="inkFaint" style={{ marginTop: 6 }}>
              {[book.firstPublishYear, book.pageCount ? `${book.pageCount} pages` : null]
                .filter(Boolean)
                .join(' · ')}
            </Text>
          ) : null}
        </View>

        {entry?.favorite ? (
          <Ionicons name="heart" size={15} color={theme.colors.accent} style={{ marginLeft: theme.space.sm }} />
        ) : null}
      </Pressable>
    </Animated.View>
  );
});

/** One book as a tile in a grid, with its progress printed underneath. */
export const BookTile = memo(function BookTile({
  book,
  entry,
  onPress,
  onLongPress,
  index,
  size = 'md',
  width,
  style,
}: Common & { size?: CoverSize; width?: number }) {
  const theme = useTheme();
  const w = width ?? COVER_WIDTH[size];
  const progress = entry ? progressOf(entry, book.pageCount) : 0;
  const showProgress = entry?.shelf === 'currentlyReading' && progress > 0;

  return (
    <Animated.View
      entering={theme.calm ? undefined : FadeInDown.delay(stagger(index)).duration(380)}
      style={[{ width: w }, style]}
    >
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        scaleTo={0.95}
        accessibilityRole="button"
        accessibilityLabel={`${book.title}${book.authors[0] ? `, by ${book.authors[0]}` : ''}`}
      >
        <View>
          <BookCover book={book} width={w} />
          {entry?.favorite ? (
            <View style={[styles.heart, { backgroundColor: withAlpha(theme.colors.paper, 0.92) }]}>
              <Ionicons name="heart" size={11} color={theme.colors.accent} />
            </View>
          ) : null}
        </View>

        <Text
          variant="small"
          tone="ink"
          numberOfLines={2}
          style={{ marginTop: theme.space.sm, fontFamily: 'Lora_500Medium' }}
        >
          {book.title}
        </Text>

        {book.authors[0] ? (
          <Text variant="caption" tone="inkFaint" numberOfLines={1}>
            {book.authors[0]}
          </Text>
        ) : null}

        {showProgress ? <ProgressBar progress={progress / 100} height={3} style={{ marginTop: 6 }} /> : null}
      </Pressable>
    </Animated.View>
  );
});

/**
 * A book standing on a shelf. Slightly taller than a grid tile, no caption —
 * the shelf view is meant to be browsed with your eyes, like a real one.
 */
export const ShelfBook = memo(function ShelfBook({
  book,
  entry,
  onPress,
  onLongPress,
  width = 74,
  index,
}: Common & { width?: number }) {
  const theme = useTheme();
  const leaning = (index ?? 0) % 7 === 6;

  return (
    <Animated.View
      entering={
        theme.calm
          ? undefined
          : // books arrive by sliding down onto the shelf
            FadeInDown.delay(stagger(index)).duration(420).springify().damping(15)
      }
      style={{ marginRight: 10, transform: [{ rotate: leaning ? '-3deg' : '0deg' }] }}
    >
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        scaleTo={0.94}
        accessibilityRole="button"
        accessibilityLabel={`${book.title}${book.authors[0] ? `, by ${book.authors[0]}` : ''}`}
      >
        <BookCover book={book} width={width} />
        {entry?.shelf === 'currentlyReading' ? <Bookmark /> : null}
      </Pressable>
    </Animated.View>
  );
});

/** The ribbon that pokes out of the top of a book you are part-way through. */
export function Bookmark({ color }: { color?: string }) {
  const theme = useTheme();
  return (
    <View
      pointerEvents="none"
      style={[
        styles.bookmark,
        { backgroundColor: color ?? theme.colors.accent },
        theme.elevation(1),
      ]}
    />
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  rowBody: { flex: 1 },
  metaRow: { flexDirection: 'row', alignItems: 'center' },
  heart: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 19,
    height: 19,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookmark: {
    position: 'absolute',
    top: -7,
    right: 13,
    width: 9,
    height: 30,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
  },
});
