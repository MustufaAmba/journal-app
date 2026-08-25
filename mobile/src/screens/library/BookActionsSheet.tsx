import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Text';
import { Sheet } from '@/components/Sheet';
import { Pressable } from '@/components/Pressable';
import { Chip } from '@/components/Chip';
import { Divider } from '@/components/Divider';
import { BookCover } from '@/components/BookCover';
import { Rating } from '@/components/Rating';
import { useDialog } from '@/components/DialogProvider';
import { useLibraryStore } from '@/store/useLibraryStore';
import { SHELVES, SHELF_ORDER } from '@/data/shelves';
import { haptics } from '@/lib/haptics';
import type { RootStackParamList } from '@/navigation/types';
import type { Book, LibraryEntry } from '@/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

/** Long-press menu for a book: shelf, rating, favourite, journal, remove. */
export function BookActionsSheet({
  visible,
  onClose,
  book,
  entry,
}: {
  visible: boolean;
  onClose: () => void;
  book?: Book;
  entry?: LibraryEntry;
}) {
  const theme = useTheme();
  const navigation = useNavigation<Nav>();

  const moveToShelf = useLibraryStore((s) => s.moveToShelf);
  const toggleFavorite = useLibraryStore((s) => s.toggleFavorite);
  const setRating = useLibraryStore((s) => s.setRating);
  const remove = useLibraryStore((s) => s.remove);
  const { confirm } = useDialog();

  if (!book || !entry) return null;

  const confirmRemove = async () => {
    const gone = await confirm({
      title: 'Take this off the shelf?',
      message: `“${book.title}” will be removed from your library. Journal entries and quotes about it are kept.`,
      confirmLabel: 'Remove',
      cancelLabel: 'Keep it',
      destructive: true,
    });
    if (!gone) return;
    remove(entry.id);
    onClose();
  };

  const go = (action: () => void) => {
    onClose();
    // Let the sheet finish closing before the next screen slides in.
    setTimeout(action, 220);
  };

  return (
    <Sheet visible={visible} onClose={onClose}>
      <View style={{ paddingBottom: theme.space.lg }}>
        <View style={styles.header}>
          <BookCover book={book} size="sm" />
          <View style={{ flex: 1, marginLeft: theme.space.lg }}>
            <Text variant="subheading" tone="ink" numberOfLines={2} style={{ fontFamily: 'Lora_600SemiBold' }}>
              {book.title}
            </Text>
            {book.authors[0] ? (
              <Text variant="small" tone="inkFaint" numberOfLines={1}>
                {book.authors[0]}
              </Text>
            ) : null}
            <Rating
              value={entry.rating ?? 0}
              size={19}
              onChange={(value) => {
                setRating(entry.id, value);
              }}
              style={{ marginTop: 6 }}
            />
          </View>
        </View>

        <Divider style={{ marginVertical: theme.space.lg }} />

        <Text variant="label" caps tone="inkFaint" style={{ marginBottom: theme.space.sm }}>
          Move to shelf
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {SHELF_ORDER.filter((id) => id !== 'favorites').map((id) => (
            <Chip
              key={id}
              label={SHELVES[id].name}
              selected={entry.shelf === id}
              onPress={() => {
                moveToShelf(entry.id, id);
                haptics.settle();
              }}
            />
          ))}
        </ScrollView>

        <Divider style={{ marginVertical: theme.space.lg }} />

        <Action
          icon={entry.favorite ? 'heart' : 'heart-outline'}
          label={entry.favorite ? 'Remove from favourites' : 'Add to favourites'}
          tint={entry.favorite ? theme.colors.accent : undefined}
          onPress={() => toggleFavorite(entry.id)}
        />
        <Action
          icon="create-outline"
          label="Write a journal entry"
          onPress={() => go(() => navigation.navigate('JournalEntry', { bookId: book.id }))}
        />
        <Action
          icon="chatbox-ellipses-outline"
          label="Save a quote"
          onPress={() => go(() => navigation.navigate('QuoteEditor', { bookId: book.id }))}
        />
        <Action
          icon="reader-outline"
          label="Reading log"
          onPress={() => go(() => navigation.navigate('ReadingLog', { bookId: book.id }))}
        />
        <Action
          icon="information-circle-outline"
          label="Book details"
          onPress={() => go(() => navigation.navigate('BookDetail', { bookId: book.id, entryId: entry.id }))}
        />

        <Divider style={{ marginVertical: theme.space.sm }} />

        <Action icon="trash-outline" label="Remove from library" danger onPress={() => void confirmRemove()} />
      </View>
    </Sheet>
  );
}

function Action({
  icon,
  label,
  onPress,
  danger,
  tint,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  danger?: boolean;
  tint?: string;
}) {
  const theme = useTheme();
  const color = danger ? theme.colors.danger : (tint ?? theme.colors.inkSoft);
  return (
    <Pressable onPress={onPress} style={styles.action} accessibilityRole="button" accessibilityLabel={label}>
      <Ionicons name={icon} size={19} color={color} />
      <Text variant="body" color={danger ? theme.colors.danger : theme.colors.ink} style={{ marginLeft: 14 }}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center' },
  action: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13 },
});
