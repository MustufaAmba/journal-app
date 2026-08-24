import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Text';
import { Card } from '@/components/Card';
import { BookCover } from '@/components/BookCover';
import { moodMeta } from '@/data/moods';
import { friendlyDate } from '@/lib/date';
import { withAlpha } from '@/lib/color';
import { useBooksStore } from '@/store/useBooksStore';
import type { JournalEntry } from '@/types';

/** One diary page, previewed: the date, the mood, the first few lines. */
export function JournalEntryCard({
  entry,
  onPress,
  showBook,
}: {
  entry: JournalEntry;
  onPress: () => void;
  showBook?: boolean;
}) {
  const theme = useTheme();
  const book = useBooksStore((s) => s.byId[entry.bookId]);
  const mood = moodMeta(entry.mood);

  const extras = [
    entry.favoriteCharacter ? { icon: 'person-outline' as const, text: entry.favoriteCharacter } : null,
    entry.chapter ? { icon: 'bookmark-outline' as const, text: entry.chapter } : null,
    entry.voiceNotes.length ? { icon: 'mic-outline' as const, text: `${entry.voiceNotes.length}` } : null,
    entry.photos.length ? { icon: 'image-outline' as const, text: `${entry.photos.length}` } : null,
  ].filter(Boolean) as { icon: keyof typeof Ionicons.glyphMap; text: string }[];

  return (
    <Card onPress={onPress} ribbon ribbonColor={mood?.hue} style={{ paddingLeft: theme.space.xl }}>
      <View style={styles.header}>
        {showBook && book ? <BookCover book={book} size="xs" style={{ marginRight: theme.space.md }} /> : null}

        <View style={{ flex: 1 }}>
          <View style={styles.metaRow}>
            <Text variant="label" caps tone="inkFaint">
              {friendlyDate(entry.date)}
            </Text>
            {mood ? (
              <Text variant="caption" tone="inkFaint" style={{ marginLeft: 8 }}>
                {mood.emoji} {mood.label}
              </Text>
            ) : null}
            {entry.emoji && !mood ? (
              <Text variant="caption" style={{ marginLeft: 8 }}>
                {entry.emoji}
              </Text>
            ) : null}
          </View>

          {entry.title ? (
            <Text variant="subheading" tone="ink" numberOfLines={1} style={{ fontFamily: 'Lora_600SemiBold' }}>
              {entry.title}
            </Text>
          ) : showBook && book ? (
            <Text variant="subheading" tone="ink" numberOfLines={1} style={{ fontFamily: 'Lora_600SemiBold' }}>
              {book.title}
            </Text>
          ) : null}
        </View>
      </View>

      {entry.text ? (
        <Text variant="hand" tone="inkSoft" numberOfLines={4} style={{ marginTop: theme.space.sm }}>
          {entry.text}
        </Text>
      ) : null}

      {entry.photos.length ? (
        <View style={[styles.photos, { marginTop: theme.space.md }]}>
          {entry.photos.slice(0, 3).map((uri) => (
            <Image
              key={uri}
              source={{ uri }}
              style={[styles.photo, { borderRadius: theme.radius.sm, borderColor: theme.colors.rule }]}
              contentFit="cover"
              cachePolicy="disk"
            />
          ))}
          {entry.photos.length > 3 ? (
            <View
              style={[
                styles.photo,
                styles.morePhotos,
                { borderRadius: theme.radius.sm, backgroundColor: withAlpha(theme.colors.ink, 0.08) },
              ]}
            >
              <Text variant="caption" tone="inkSoft">
                +{entry.photos.length - 3}
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {(extras.length || entry.tags.length) ? (
        <View style={[styles.footer, { marginTop: theme.space.md }]}>
          {extras.map((extra) => (
            <View key={extra.icon} style={styles.extra}>
              <Ionicons name={extra.icon} size={12} color={theme.colors.inkFaint} />
              <Text variant="caption" tone="inkFaint" numberOfLines={1} style={{ marginLeft: 3, maxWidth: 110 }}>
                {extra.text}
              </Text>
            </View>
          ))}
          {entry.tags.slice(0, 2).map((tag) => (
            <Text key={tag} variant="caption" tone="accent">
              #{tag}
            </Text>
          ))}
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center' },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  photos: { flexDirection: 'row', gap: 6 },
  photo: { width: 54, height: 54, borderWidth: StyleSheet.hairlineWidth },
  morePhotos: { alignItems: 'center', justifyContent: 'center' },
  footer: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 12 },
  extra: { flexDirection: 'row', alignItems: 'center' },
});
