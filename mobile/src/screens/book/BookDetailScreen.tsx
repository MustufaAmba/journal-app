import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedScrollHandler, useSharedValue, FadeIn } from 'react-native-reanimated';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Screen } from '@/components/Screen';
import { Text, SectionLabel } from '@/components/Text';
import { Card } from '@/components/Card';
import { Chip } from '@/components/Chip';
import { Button } from '@/components/Button';
import { Pressable } from '@/components/Pressable';
import { IconButton } from '@/components/Header';
import { Divider, Ornament } from '@/components/Divider';
import { Rating } from '@/components/Rating';
import { ProgressBar } from '@/components/ProgressRing';
import { BookTile } from '@/components/BookItem';
import { QuoteCard } from '@/components/QuoteCard';
import { StickyNote } from '@/components/StickyNote';
import { Rail, SectionHeader } from '@/components/Section';
import { LogProgressSheet } from '@/components/LogProgressSheet';
import { Sheet } from '@/components/Sheet';
import { MarkdownText } from '@/components/MarkdownText';
import { usePickCover } from '@/components/CoverPicker';

import { BookHero, HERO_HEIGHT } from './BookHero';
import { ReadingTimeline } from './ReadingTimeline';
import { JournalEntryCard } from '@/screens/journal/JournalEntryCard';

import { useTheme } from '@/theme/ThemeProvider';
import { useBookDetail, useRelatedBooks } from '@/hooks/useBookSearch';
import { useBooksStore } from '@/store/useBooksStore';
import { useLibraryStore, progressOf } from '@/store/useLibraryStore';
import { useJournalStore, journalForBook } from '@/store/useJournalStore';
import { useQuotesStore, quotesForBook } from '@/store/useQuotesStore';
import { useNotesStore, notesForBook } from '@/store/useNotesStore';
import { useSessionsStore, sessionsForBook } from '@/store/useSessionsStore';
import { SHELVES, SHELF_ORDER } from '@/data/shelves';
import { prettyDate, friendlyDate, daysBetween } from '@/lib/date';
import { withAlpha } from '@/lib/color';
import { haptics } from '@/lib/haptics';
import type { RootStackParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'BookDetail'>;

export function BookDetailScreen() {
  const theme = useTheme();
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const insets = useSafeAreaInsets();
  const scrollY = useSharedValue(0);

  const { bookId } = route.params;

  const cached = useBooksStore((s) => s.byId[bookId]);
  const { data, isLoading } = useBookDetail(bookId);
  const book = data ?? cached;

  const entries = useLibraryStore((s) => s.entries);
  const addToLibrary = useLibraryStore((s) => s.add);
  const setRating = useLibraryStore((s) => s.setRating);
  const toggleFavorite = useLibraryStore((s) => s.toggleFavorite);
  const moveToShelf = useLibraryStore((s) => s.moveToShelf);
  const startReading = useLibraryStore((s) => s.startReading);
  const reread = useLibraryStore((s) => s.reread);

  const entry = useMemo(
    () => Object.values(entries).find((e) => e.bookId === bookId),
    [entries, bookId],
  );

  const journal = useJournalStore((s) => s.entries);
  const quotes = useQuotesStore((s) => s.quotes);
  const notes = useNotesStore((s) => s.notes);
  const sessions = useSessionsStore((s) => s.sessions);

  const bookJournal = useMemo(() => journalForBook(journal, bookId), [journal, bookId]);
  const bookQuotes = useMemo(() => quotesForBook(quotes, bookId), [quotes, bookId]);
  const bookNotes = useMemo(() => notesForBook(notes, bookId), [notes, bookId]);
  const bookSessions = useMemo(() => sessionsForBook(sessions, bookId), [sessions, bookId]);

  const { data: related } = useRelatedBooks(book);

  const mergeBookFields = useBooksStore((s) => s.merge);
  // Open Library has no art for every edition, and none at all for a book
  // added by hand — either way the reader can supply the real cover.
  const { busy: coverBusy, fromCamera, fromLibrary } = usePickCover(book?.coverUrl, (coverUrl) =>
    mergeBookFields(bookId, { coverUrl }),
  );

  const [summaryOpen, setSummaryOpen] = useState(false);
  const [logging, setLogging] = useState(false);
  const [shelfSheet, setShelfSheet] = useState(false);

  const onScroll = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  if (!book) {
    return (
      <Screen edges={['top', 'bottom']}>
        <View style={styles.centered}>
          <Text variant="body" tone="inkFaint">
            {isLoading ? 'Fetching the book…' : 'That book could not be found.'}
          </Text>
          <Button label="Go back" variant="ghost" onPress={() => navigation.goBack()} style={{ marginTop: 12 }} />
        </View>
      </Screen>
    );
  }

  const total = entry?.pageCountOverride ?? book.pageCount;
  const progress = entry ? progressOf(entry, book.pageCount) : 0;
  const onShelf = Boolean(entry);
  const finished = entry?.shelf === 'finished';

  const facts = [
    book.publisher ? { label: 'Publisher', value: book.publisher } : null,
    book.publishedDate ? { label: 'Published', value: book.publishedDate } : null,
    total ? { label: 'Pages', value: String(total) } : null,
    book.language ? { label: 'Language', value: book.language } : null,
    book.isbn13 ?? book.isbn10 ? { label: 'ISBN', value: (book.isbn13 ?? book.isbn10)! } : null,
    book.series
      ? { label: 'Series', value: book.seriesPosition ? `${book.series} #${book.seriesPosition}` : book.series }
      : null,
  ].filter(Boolean) as { label: string; value: string }[];

  const readingDays =
    entry?.startedAt && entry?.finishedAt ? Math.max(1, daysBetween(entry.startedAt, entry.finishedAt)) : null;

  return (
    <Screen edges={[]} wash={false}>
      {/* floating chrome — the hero art scrolls beneath it */}
      <View style={[styles.chrome, { top: insets.top + 6, paddingHorizontal: theme.space.lg }]} pointerEvents="box-none">
        <IconButton name="chevron-back" label="Go back" onPress={() => navigation.goBack()} />
        <View style={{ flex: 1 }} />
        {onShelf ? (
          <IconButton
            name={entry?.favorite ? 'heart' : 'heart-outline'}
            label={entry?.favorite ? 'Remove from favourites' : 'Add to favourites'}
            color={entry?.favorite ? theme.colors.accent : undefined}
            onPress={() => entry && toggleFavorite(entry.id)}
          />
        ) : null}
        <IconButton
          name="ellipsis-horizontal"
          label="More options"
          onPress={() => setShelfSheet(true)}
          style={{ marginLeft: theme.space.sm }}
        />
      </View>

      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 140 }}
      >
        <BookHero book={book} scrollY={scrollY} />

        <View style={{ paddingHorizontal: theme.space.lg }}>
          {/* Progress / primary action */}
          {onShelf && entry ? (
            <Card raise={2}>
              <View style={styles.rowBetween}>
                <View style={{ flex: 1 }}>
                  <Text variant="label" caps tone="accent">
                    {SHELVES[entry.shelf].name}
                  </Text>
                  <Text variant="subheading" tone="ink" style={{ marginTop: 2 }}>
                    {finished
                      ? `Finished ${entry.finishedAt ? friendlyDate(entry.finishedAt) : ''}`
                      : total
                        ? `Page ${entry.currentPage} of ${total}`
                        : `${progress}% through`}
                  </Text>
                </View>
                <Text variant="title" tone="accent" style={{ fontFamily: 'Lora_600SemiBold' }}>
                  {progress}%
                </Text>
              </View>

              <ProgressBar progress={progress / 100} height={7} style={{ marginTop: theme.space.md }} />

              <View style={[styles.actions, { marginTop: theme.space.lg }]}>
                {finished ? (
                  <>
                    <Button label="Read it again" variant="secondary" onPress={() => reread(entry.id)} />
                    <Button
                      label="Write about it"
                      onPress={() => navigation.navigate('JournalEntry', { bookId: book.id })}
                    />
                  </>
                ) : (
                  <>
                    <Button label="I read some" onPress={() => setLogging(true)} />
                    <Button
                      label="Journal"
                      variant="secondary"
                      onPress={() => navigation.navigate('JournalEntry', { bookId: book.id })}
                    />
                  </>
                )}
              </View>

              {finished ? (
                <>
                  <Divider style={{ marginVertical: theme.space.lg }} />
                  <View style={styles.rowBetween}>
                    <Text variant="small" tone="inkFaint">
                      What did you make of it?
                    </Text>
                    <Rating
                      value={entry.rating ?? 0}
                      onChange={(value) => setRating(entry.id, value)}
                      size={24}
                    />
                  </View>
                </>
              ) : null}
            </Card>
          ) : (
            <Card raise={2}>
              <Text variant="subheading" tone="ink">
                Not on your shelves yet
              </Text>
              <Text variant="small" tone="inkFaint" style={{ marginTop: 4 }}>
                Add it and you can track it, write about it, and keep its best lines.
              </Text>
              <View style={[styles.actions, { marginTop: theme.space.lg }]}>
                <Button
                  label="Want to read"
                  variant="secondary"
                  onPress={() => {
                    addToLibrary(book, 'wantToRead');
                    haptics.settle();
                  }}
                />
                <Button
                  label="Start reading"
                  onPress={() => {
                    const created = addToLibrary(book, 'currentlyReading');
                    startReading(created.id);
                    haptics.settle();
                  }}
                />
              </View>
            </Card>
          )}

          {/* Genres */}
          {book.genres.length ? (
            <View style={[styles.chips, { marginTop: theme.space.lg }]}>
              {book.genres.slice(0, 8).map((genre) => (
                <Chip
                  key={genre}
                  label={genre}
                  small
                  onPress={() => navigation.navigate('Search', { initialQuery: genre })}
                />
              ))}
            </View>
          ) : null}

          {/* Summary */}
          {book.summary ? (
            <View style={{ marginTop: theme.space.xl }}>
              <SectionLabel>About this book</SectionLabel>
              <Text variant="body" tone="inkSoft" numberOfLines={summaryOpen ? undefined : 6}>
                {book.summary.replace(/\s*\(\[source\]\[\d+\]\)/g, '').trim()}
              </Text>
              {book.summary.length > 320 ? (
                <Pressable onPress={() => setSummaryOpen((v) => !v)} style={{ marginTop: 6 }}>
                  <Text variant="small" tone="accent" style={{ fontFamily: 'Karla_700Bold' }}>
                    {summaryOpen ? 'Less' : 'Read more'}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}

          {/* Facts */}
          {facts.length ? (
            <View style={{ marginTop: theme.space.xl }}>
              <SectionLabel>Particulars</SectionLabel>
              <Card sunken padded={false}>
                {facts.map((fact, index) => (
                  <View key={fact.label}>
                    {index > 0 ? <Divider inset={theme.space.lg} /> : null}
                    <View style={[styles.factRow, { padding: theme.space.md, paddingHorizontal: theme.space.lg }]}>
                      <Text variant="small" tone="inkFaint">
                        {fact.label}
                      </Text>
                      <Text
                        variant="small"
                        tone="ink"
                        style={{ flex: 1, textAlign: 'right', marginLeft: theme.space.lg }}
                        numberOfLines={2}
                      >
                        {fact.value}
                      </Text>
                    </View>
                  </View>
                ))}
              </Card>
            </View>
          ) : null}

          {/* Author */}
          {book.authors.length ? (
            <View style={{ marginTop: theme.space.xl }}>
              <SectionLabel>The author</SectionLabel>
              {book.authors.map((author, index) => (
                <Card
                  key={author}
                  onPress={
                    book.authorKeys?.[index]
                      ? () => navigation.navigate('Author', { authorKey: book.authorKeys![index], name: author })
                      : () => navigation.navigate('Search', { initialQuery: author, mode: 'author' })
                  }
                  style={{ marginBottom: theme.space.sm }}
                >
                  <View style={styles.rowBetween}>
                    <View style={{ flex: 1 }}>
                      <Text variant="subheading" tone="ink">
                        {author}
                      </Text>
                      <Text variant="caption" tone="inkFaint">
                        See their other books
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={theme.colors.inkFaint} />
                  </View>
                </Card>
              ))}
            </View>
          ) : null}
        </View>

        {/* Reading timeline */}
        {onShelf && entry ? (
          <View style={{ marginTop: theme.space.xxl }}>
            <SectionHeader
              title="Reading timeline"
              action={bookSessions.length ? 'Full log' : undefined}
              onAction={bookSessions.length ? () => navigation.navigate('ReadingLog', { bookId: book.id }) : undefined}
            />
            <View style={{ paddingHorizontal: theme.space.lg }}>
              <ReadingTimeline entry={entry} sessions={bookSessions} readingDays={readingDays} />
            </View>
          </View>
        ) : null}

        {/* Journal */}
        <View style={{ marginTop: theme.space.xxl }}>
          <SectionHeader
            title="Your journal"
            action="Write"
            onAction={() => navigation.navigate('JournalEntry', { bookId: book.id })}
          />
          {bookJournal.length ? (
            <View style={{ paddingHorizontal: theme.space.lg, gap: theme.space.md }}>
              {bookJournal.slice(0, 4).map((item) => (
                <JournalEntryCard
                  key={item.id}
                  entry={item}
                  onPress={() => navigation.navigate('JournalEntry', { entryId: item.id })}
                />
              ))}
            </View>
          ) : (
            <Card style={{ marginHorizontal: theme.space.lg }} onPress={() => navigation.navigate('JournalEntry', { bookId: book.id })}>
              <Text variant="hand" tone="inkFaint" align="center">
                Nothing written down yet. What did you think of it?
              </Text>
            </Card>
          )}
        </View>

        {/* Quotes */}
        <View style={{ marginTop: theme.space.xxl }}>
          <SectionHeader
            title="Lines worth keeping"
            action="Add"
            onAction={() => navigation.navigate('QuoteEditor', { bookId: book.id })}
          />
          {bookQuotes.length ? (
            <Rail>
              {bookQuotes.map((quote, index) => (
                <View key={quote.id} style={{ width: 290 }}>
                  <QuoteCard
                    quote={quote}
                    compact
                    tiltSeed={index}
                    onPress={() => navigation.navigate('QuoteEditor', { quoteId: quote.id })}
                  />
                </View>
              ))}
            </Rail>
          ) : (
            <Card style={{ marginHorizontal: theme.space.lg }} onPress={() => navigation.navigate('QuoteEditor', { bookId: book.id })}>
              <Text variant="hand" tone="inkFaint" align="center">
                Save the sentence you had to read twice.
              </Text>
            </Card>
          )}
        </View>

        {/* Notes */}
        {bookNotes.length ? (
          <View style={{ marginTop: theme.space.xxl }}>
            <SectionHeader title="Notes" />
            <Rail>
              {bookNotes.map((note, index) => (
                <StickyNote
                  key={note.id}
                  note={note}
                  width={168}
                  tiltSeed={index}
                  onPress={() => navigation.navigate('NoteEditor', { noteId: note.id })}
                />
              ))}
            </Rail>
          </View>
        ) : null}

        {/* Related */}
        {related?.length ? (
          <View style={{ marginTop: theme.space.xxl }}>
            <Ornament />
            <SectionHeader title="If you liked this" />
            <Rail>
              {related.slice(0, 12).map((other, index) => (
                <BookTile
                  key={other.id}
                  book={other}
                  index={index}
                  onPress={() => navigation.push('BookDetail', { bookId: other.id })}
                />
              ))}
            </Rail>
          </View>
        ) : null}
      </Animated.ScrollView>

      <LogProgressSheet visible={logging} onClose={() => setLogging(false)} book={book} entry={entry} />

      <Sheet visible={shelfSheet} onClose={() => setShelfSheet(false)} title="Move this book">
        <View style={{ paddingBottom: theme.space.lg }}>
          {onShelf && entry ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
              {SHELF_ORDER.filter((id) => id !== 'favorites').map((id) => (
                <Chip
                  key={id}
                  label={SHELVES[id].name}
                  selected={entry.shelf === id}
                  onPress={() => {
                    moveToShelf(entry.id, id);
                    haptics.settle();
                    setShelfSheet(false);
                  }}
                />
              ))}
            </ScrollView>
          ) : (
            <Text variant="small" tone="inkFaint">
              Add the book to a shelf first.
            </Text>
          )}

          <Divider style={{ marginVertical: theme.space.lg }} />

          <Text variant="label" caps tone="inkFaint" style={{ marginBottom: theme.space.sm }}>
            {book.coverUrl ? 'Replace the cover' : 'This book has no cover'}
          </Text>
          <View style={[styles.actions, { marginBottom: theme.space.lg }]}>
            <Button
              label="Photograph it"
              variant="secondary"
              loading={coverBusy === 'camera'}
              onPress={() => void fromCamera()}
            />
            <Button
              label="Choose a photo"
              variant="secondary"
              loading={coverBusy === 'library'}
              onPress={() => void fromLibrary()}
            />
          </View>

          <Button
            label="Save a quote"
            variant="secondary"
            full
            onPress={() => {
              setShelfSheet(false);
              setTimeout(() => navigation.navigate('QuoteEditor', { bookId: book.id }), 220);
            }}
          />
          <View style={{ height: theme.space.sm }} />
          <Button
            label="Add a note"
            variant="secondary"
            full
            onPress={() => {
              setShelfSheet(false);
              setTimeout(() => navigation.navigate('NoteEditor', { bookId: book.id }), 220);
            }}
          />
        </View>
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  chrome: { position: 'absolute', left: 0, right: 0, zIndex: 10, flexDirection: 'row', alignItems: 'center' },
  rowBetween: { flexDirection: 'row', alignItems: 'center' },
  actions: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  factRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
