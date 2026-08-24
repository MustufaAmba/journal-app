import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { Card } from '@/components/Card';
import { Chip } from '@/components/Chip';
import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';
import { Pressable } from '@/components/Pressable';
import { IconButton } from '@/components/Header';
import { Divider } from '@/components/Divider';
import { EmptyState } from '@/components/EmptyState';
import { BookRow } from '@/components/BookItem';
import { Sheet } from '@/components/Sheet';
import { BookCover } from '@/components/BookCover';

import { useTheme } from '@/theme/ThemeProvider';
import { useBookSearch } from '@/hooks/useBookSearch';
import { useDebounced } from '@/hooks/useDebounced';
import { useLibraryStore } from '@/store/useLibraryStore';
import { useJournalStore, searchJournal } from '@/store/useJournalStore';
import { useNotesStore, searchNotes } from '@/store/useNotesStore';
import { useQuotesStore, searchQuotes } from '@/store/useQuotesStore';
import { useBooksStore } from '@/store/useBooksStore';
import { kv } from '@/lib/storage';
import { SHELVES, SHELF_ORDER } from '@/data/shelves';
import { haptics } from '@/lib/haptics';
import { withAlpha } from '@/lib/color';
import type { SearchMode } from '@/api/openLibrary';
import type { RootStackParamList } from '@/navigation/types';
import type { Book, ShelfId } from '@/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'Search'>;

const RECENT_KEY = 'search.recent';
const MAX_RECENT = 8;

const MODES: { value: SearchMode; label: string }[] = [
  { value: 'all', label: 'Everything' },
  { value: 'title', label: 'Title' },
  { value: 'author', label: 'Author' },
  { value: 'isbn', label: 'ISBN' },
];

export function SearchScreen() {
  const theme = useTheme();
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();

  const [query, setQuery] = useState(route.params?.initialQuery ?? '');
  const [mode, setMode] = useState<SearchMode>(route.params?.mode ?? 'all');
  const [recent, setRecent] = useState<string[]>(() => kv.get<string[]>(RECENT_KEY, []));
  const [adding, setAdding] = useState<Book | null>(null);

  const debounced = useDebounced(query, 420);
  const { data: results, isFetching, isError, refetch } = useBookSearch(debounced, mode);

  const addToLibrary = useLibraryStore((s) => s.add);
  const entries = useLibraryStore((s) => s.entries);
  const books = useBooksStore((s) => s.byId);

  // Searching also looks inside everything the reader has written.
  const journal = useJournalStore((s) => s.entries);
  const notes = useNotesStore((s) => s.notes);
  const quotes = useQuotesStore((s) => s.quotes);

  const mine = useMemo(() => {
    const q = debounced.trim();
    if (q.length < 2) return { journal: [], notes: [], quotes: [], shelf: [] };
    const lower = q.toLowerCase();
    return {
      journal: searchJournal(journal, q).slice(0, 3),
      notes: searchNotes(notes, q).slice(0, 3),
      quotes: searchQuotes(quotes, q).slice(0, 3),
      shelf: Object.values(entries)
        .map((entry) => ({ entry, book: books[entry.bookId] }))
        .filter(
          (item) =>
            item.book &&
            (item.book.title.toLowerCase().includes(lower) ||
              item.book.authors.some((a) => a.toLowerCase().includes(lower))),
        )
        .slice(0, 4),
    };
  }, [debounced, journal, notes, quotes, entries, books]);

  const rememberQuery = useCallback(
    (value: string) => {
      const trimmed = value.trim();
      if (trimmed.length < 2) return;
      const next = [trimmed, ...recent.filter((r) => r !== trimmed)].slice(0, MAX_RECENT);
      setRecent(next);
      kv.set(RECENT_KEY, next);
    },
    [recent],
  );

  const addBook = (book: Book, shelf: ShelfId) => {
    addToLibrary(book, shelf);
    haptics.success();
    setAdding(null);
  };

  const showingMine =
    mine.journal.length + mine.notes.length + mine.quotes.length + mine.shelf.length > 0;

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={[styles.topBar, { paddingHorizontal: theme.space.lg }]}>
        <IconButton name="chevron-down" label="Close search" onPress={() => navigation.goBack()} />
        <View style={{ flex: 1, marginLeft: theme.space.md }}>
          <TextField
            placeholder="A title, an author, an ISBN…"
            value={query}
            onChangeText={setQuery}
            autoFocus={!route.params?.initialQuery}
            returnKeyType="search"
            autoCapitalize="none"
            onSubmitEditing={() => rememberQuery(query)}
            right={
              query ? (
                <Pressable onPress={() => setQuery('')} accessibilityLabel="Clear search">
                  <Ionicons name="close-circle" size={17} color={theme.colors.inkFaint} />
                </Pressable>
              ) : (
                <Ionicons name="search" size={16} color={theme.colors.inkFaint} />
              )
            }
          />
        </View>
        <IconButton
          name="barcode-outline"
          label="Scan a barcode"
          onPress={() => navigation.navigate('Scanner')}
          style={{ marginLeft: theme.space.sm }}
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: theme.space.lg, gap: 8, paddingVertical: theme.space.md }}
        style={{ flexGrow: 0 }}
      >
        {MODES.map((m) => (
          <Chip key={m.value} label={m.label} selected={mode === m.value} onPress={() => setMode(m.value)} />
        ))}
      </ScrollView>

      {debounced.trim().length < 2 ? (
        <ScrollView contentContainerStyle={{ padding: theme.space.lg, paddingBottom: 120 }}>
          {recent.length ? (
            <>
              <View style={styles.recentHeader}>
                <Text variant="label" caps tone="inkFaint">
                  Recent searches
                </Text>
                <Pressable
                  onPress={() => {
                    setRecent([]);
                    kv.remove(RECENT_KEY);
                  }}
                >
                  <Text variant="caption" tone="accent">
                    Clear
                  </Text>
                </Pressable>
              </View>
              <View style={[styles.chips, { marginBottom: theme.space.xl }]}>
                {recent.map((term) => (
                  <Chip key={term} label={term} onPress={() => setQuery(term)} />
                ))}
              </View>
            </>
          ) : null}

          <EmptyState
            compact
            illustration="bookcase"
            title="What are we looking for?"
            message="Search the whole of Open Library — over forty million books, most of them with covers."
            actionLabel="Scan a barcode instead"
            onAction={() => navigation.navigate('Scanner')}
            secondaryLabel="Add a book by hand"
            onSecondary={() => navigation.navigate('AddBookManually', {})}
          />
        </ScrollView>
      ) : (
        <FlashList
          data={results ?? []}
          keyExtractor={(book) => book.id}
          contentContainerStyle={{ paddingHorizontal: theme.space.lg, paddingBottom: 120 }}
          keyboardShouldPersistTaps="handled"
          ItemSeparatorComponent={() => <Divider />}
          ListHeaderComponent={
            showingMine ? (
              <View style={{ paddingVertical: theme.space.md }}>
                <Text variant="label" caps tone="inkFaint" style={{ marginBottom: theme.space.sm }}>
                  From your own shelves
                </Text>

                {mine.shelf.map((item) => (
                  <BookRow
                    key={item.entry.id}
                    book={item.book!}
                    entry={item.entry}
                    onPress={() =>
                      navigation.navigate('BookDetail', { bookId: item.book!.id, entryId: item.entry.id })
                    }
                  />
                ))}

                {mine.journal.map((entry) => (
                  <ResultRow
                    key={entry.id}
                    icon="create-outline"
                    title={entry.title || 'Journal entry'}
                    subtitle={entry.text.slice(0, 90)}
                    onPress={() => navigation.navigate('JournalEntry', { entryId: entry.id })}
                  />
                ))}

                {mine.quotes.map((quote) => (
                  <ResultRow
                    key={quote.id}
                    icon="chatbox-ellipses-outline"
                    title={quote.text.slice(0, 60)}
                    subtitle={quote.bookTitle}
                    onPress={() => navigation.navigate('QuoteEditor', { quoteId: quote.id })}
                  />
                ))}

                {mine.notes.map((note) => (
                  <ResultRow
                    key={note.id}
                    icon="reader-outline"
                    title={note.title || note.body.slice(0, 50)}
                    subtitle={note.body.slice(0, 90)}
                    onPress={() => navigation.navigate('NoteEditor', { noteId: note.id })}
                  />
                ))}

                <Divider style={{ marginTop: theme.space.md }} />
                <Text variant="label" caps tone="inkFaint" style={{ marginTop: theme.space.lg }}>
                  From Open Library
                </Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            isFetching ? (
              <View style={styles.loading}>
                <ActivityIndicator color={theme.colors.accent} />
                <Text variant="small" tone="inkFaint" style={{ marginTop: theme.space.md }}>
                  Looking through the stacks…
                </Text>
              </View>
            ) : isError ? (
              <EmptyState
                compact
                illustration="window"
                title="Could not reach the library"
                message="Open Library might be having a quiet moment, or the connection dropped."
                actionLabel="Try again"
                onAction={() => refetch()}
                secondaryLabel="Add the book by hand"
                onSecondary={() => navigation.navigate('AddBookManually', { title: query })}
              />
            ) : (
              <EmptyState
                compact
                illustration="cat"
                title="Nothing found"
                message="Try fewer words, or a different spelling. Some books are only findable by ISBN."
                actionLabel="Add it by hand"
                onAction={() => navigation.navigate('AddBookManually', { title: query })}
              />
            )
          }
          ListFooterComponent={
            results?.length ? (
              <Pressable
                onPress={() => navigation.navigate('AddBookManually', { title: query })}
                style={{ marginTop: theme.space.xl }}
              >
                <Card
                  style={[
                    styles.manualRow,
                    { borderStyle: 'dashed', borderColor: withAlpha(theme.colors.accent, 0.4) },
                  ]}
                >
                  <Ionicons name="pencil-outline" size={17} color={theme.colors.accent} />
                  <Text variant="small" tone="accent" style={{ marginLeft: 8 }}>
                    Not here? Add the book by hand
                  </Text>
                </Card>
              </Pressable>
            ) : null
          }
          renderItem={({ item, index }) => (
            <BookRow
              book={item}
              entry={Object.values(entries).find((e) => e.bookId === item.id)}
              index={index}
              onPress={() => {
                rememberQuery(debounced);
                navigation.navigate('BookDetail', { bookId: item.id });
              }}
              onLongPress={() => {
                haptics.lift();
                setAdding(item);
              }}
            />
          )}
        />
      )}

      <Sheet visible={Boolean(adding)} onClose={() => setAdding(null)} title="Put it on a shelf">
        {adding ? (
          <View style={{ paddingBottom: theme.space.lg }}>
            <View style={styles.addHeader}>
              <BookCover book={adding} size="sm" />
              <View style={{ flex: 1, marginLeft: theme.space.lg }}>
                <Text variant="subheading" tone="ink" numberOfLines={2} style={{ fontFamily: 'Lora_600SemiBold' }}>
                  {adding.title}
                </Text>
                {adding.authors[0] ? (
                  <Text variant="small" tone="inkFaint" numberOfLines={1}>
                    {adding.authors[0]}
                  </Text>
                ) : null}
              </View>
            </View>

            <Divider style={{ marginVertical: theme.space.lg }} />

            <View style={styles.chips}>
              {SHELF_ORDER.filter((id) => id !== 'favorites' && id !== 'archive').map((id) => (
                <Chip key={id} label={SHELVES[id].name} onPress={() => addBook(adding, id)} />
              ))}
            </View>

            <Button
              label="Open the book instead"
              variant="ghost"
              full
              style={{ marginTop: theme.space.lg }}
              onPress={() => {
                const book = adding;
                setAdding(null);
                setTimeout(() => navigation.navigate('BookDetail', { bookId: book.id }), 220);
              }}
            />
          </View>
        ) : null}
      </Sheet>
    </Screen>
  );
}

function ResultRow({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable onPress={onPress} style={[styles.resultRow, { paddingVertical: theme.space.md }]}>
      <View
        style={[
          styles.resultIcon,
          { backgroundColor: withAlpha(theme.colors.accent, 0.1), borderRadius: theme.radius.sm },
        ]}
      >
        <Ionicons name={icon} size={16} color={theme.colors.accent} />
      </View>
      <View style={{ flex: 1, marginLeft: theme.space.md }}>
        <Text variant="bodyStrong" tone="ink" numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" tone="inkFaint" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={15} color={theme.colors.inkFaint} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', paddingBottom: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  recentHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  loading: { paddingVertical: 60, alignItems: 'center' },
  manualRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  addHeader: { flexDirection: 'row', alignItems: 'center' },
  resultRow: { flexDirection: 'row', alignItems: 'center' },
  resultIcon: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
});
