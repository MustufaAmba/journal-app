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

const styles = StyleSheet.create({
  band: { position: 'absolute', left: 3, right: 3, height: 1.5 },
  titleWrap: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  // Rotating the text is what turns a coloured rectangle into a spine.
  verticalTitle: { transform: [{ rotate: '-90deg' }], textAlign: 'center', width: '100%' },
});
