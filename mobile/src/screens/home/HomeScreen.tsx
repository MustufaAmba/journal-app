import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { Card } from '@/components/Card';
import { Pressable } from '@/components/Pressable';
import { IconButton, ParallaxTitle } from '@/components/Header';
import { SectionHeader, Rail } from '@/components/Section';
import { BookTile } from '@/components/BookItem';
import { QuoteCard } from '@/components/QuoteCard';
import { EmptyState } from '@/components/EmptyState';
import { Ornament } from '@/components/Divider';
import { LogProgressSheet } from '@/components/LogProgressSheet';
import { ILLUSTRATIONS, illustrationForDay } from '@/components/illustrations';

import { ContinueReadingCard } from './ContinueReadingCard';
import { TodayCard } from './TodayCard';

import { useTheme } from '@/theme/ThemeProvider';
import { useAuthStore } from '@/store/useAuthStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useBooksStore } from '@/store/useBooksStore';
import { useLibraryStore, shelfEntries, continueReading } from '@/store/useLibraryStore';
import { useSessionsStore, totalsForDay, currentStreak, readToday } from '@/store/useSessionsStore';
import { useQuotesStore, allQuotes } from '@/store/useQuotesStore';
import { useGoalsStore } from '@/store/useGoalsStore';
import { useMilestones } from '@/hooks/useMilestones';
import { useAnniversaries, useThisDayInReading } from '@/hooks/useAnniversaries';
import { useSubjectShelf } from '@/hooks/useBookSearch';
import { greeting } from '@/data/greetings';
import { wisdomForDay } from '@/data/wisdom';
import { withAlpha } from '@/lib/color';
import { friendlyDate } from '@/lib/date';
import type { RootStackParamList } from '@/navigation/types';
import type { Book, LibraryEntry } from '@/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function HomeScreen() {
  const theme = useTheme();
  const navigation = useNavigation<Nav>();
  const scrollY = useSharedValue(0);

  const user = useAuthStore((s) => s.user);
  const dedication = useSettingsStore((s) => s.dedication);
  const dedicationSeen = useSettingsStore((s) => s.dedicationSeen);

  const books = useBooksStore((s) => s.byId);
  const entries = useLibraryStore((s) => s.entries);
  const sessions = useSessionsStore((s) => s.sessions);
  const quotes = useQuotesStore((s) => s.quotes);
  const goals = useGoalsStore((s) => s.goals);

  const [logging, setLogging] = useState<{ book: Book; entry: LibraryEntry } | null>(null);

  // Postcards for milestones reached since the last time the app was open.
  useMilestones();

  const anniversaries = useAnniversaries();
  const memories = useThisDayInReading();

  const hello = useMemo(
    () => greeting(user?.name?.trim() || dedication?.to?.trim()),
    [user?.name, dedication?.to],
  );
  const wisdom = useMemo(() => wisdomForDay(), []);
  const DailyIllustration = ILLUSTRATIONS[illustrationForDay()];

  const currentEntry = useMemo(() => continueReading(entries), [entries]);
  const currentBook = currentEntry ? books[currentEntry.bookId] : undefined;

  const reading = useMemo(() => shelfEntries(entries, 'currentlyReading'), [entries]);
  const finished = useMemo(
    () =>
      Object.values(entries)
        .filter((e) => e.finishedAt)
        .sort((a, b) => (b.finishedAt ?? 0) - (a.finishedAt ?? 0))
        .slice(0, 10),
    [entries],
  );
  const recentlyAdded = useMemo(
    () => Object.values(entries).sort((a, b) => b.addedAt - a.addedAt).slice(0, 10),
    [entries],
  );

  const today = totalsForDay(sessions);
  const streak = currentStreak(sessions);
  const didReadToday = readToday(sessions);

  const favouriteQuote = useMemo(() => {
    const all = allQuotes(quotes);
    const favourites = all.filter((q) => q.favorite);
    const pool = favourites.length ? favourites : all;
    if (!pool.length) return null;
    // stable for the day
    const seed = new Date().getDate() + new Date().getMonth() * 31;
    return pool[seed % pool.length];
  }, [quotes]);

  // A gentle recommendation, seeded by whatever the reader last finished.
  const suggestionSubject = useMemo(() => {
    const source = finished[0] ?? recentlyAdded[0];
    const book = source ? books[source.bookId] : undefined;
    return book?.genres[0] ?? 'fiction';
  }, [finished, recentlyAdded, books]);

  const { data: suggestions } = useSubjectShelf(suggestionSubject, Object.keys(entries).length > 0);

  const libraryEmpty = Object.keys(entries).length === 0;

  const onScroll = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  const openBook = (bookId: string, entryId?: string) => navigation.navigate('BookDetail', { bookId, entryId });

  return (
    <Screen edges={['top']}>
      <View style={[styles.topBar, { paddingHorizontal: theme.space.lg }]}>
        <View style={{ flex: 1 }} />
        <IconButton
          name="search-outline"
          label="Search for a book"
          onPress={() => navigation.navigate('Search')}
        />
        <IconButton
          name="settings-outline"
          label="Settings"
          onPress={() => navigation.navigate('Settings')}
          style={{ marginLeft: theme.space.sm }}
        />
      </View>

      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        <ParallaxTitle title={hello.hello} subtitle={hello.sub} scrollY={scrollY} />

        {/* The dedication waits behind the cover until it has been read once. */}
        {dedication && !dedicationSeen ? (
          <Pressable
            onPress={() => navigation.navigate('Dedication')}
            style={{ marginHorizontal: theme.space.lg, marginBottom: theme.space.lg }}
          >
            <Card ribbon raise={2} style={{ paddingLeft: theme.space.xl }}>
              <Text variant="label" caps tone="accent">
                There is something written in the front
              </Text>
              <Text variant="hand" tone="ink" style={{ marginTop: 4 }}>
                Tap to read it
              </Text>
            </Card>
          </Pressable>
        ) : null}

        {libraryEmpty ? (
          <EmptyState
            illustration="shelf"
            title="An empty shelf, for now"
            message="Find the book you are reading and it will appear here, with somewhere to write about it."
            actionLabel="Find a book"
            onAction={() => navigation.navigate('Search')}
            secondaryLabel="Scan a barcode"
            onSecondary={() => navigation.navigate('Scanner')}
          />
        ) : (
          <>
            {currentBook && currentEntry ? (
              <View style={{ marginBottom: theme.space.lg }}>
                <ContinueReadingCard
                  book={currentBook}
                  entry={currentEntry}
                  sessions={sessions}
                  onOpen={() => openBook(currentBook.id, currentEntry.id)}
                  onLogProgress={() => setLogging({ book: currentBook, entry: currentEntry })}
                />
              </View>
            ) : (
              <Card
                onPress={() => navigation.navigate('Tabs', { screen: 'Library', params: { shelf: 'wantToRead' } })}
                style={{ marginHorizontal: theme.space.lg, marginBottom: theme.space.lg }}
              >
                <Text variant="subheading" tone="ink">
                  Nothing open at the moment
                </Text>
                <Text variant="small" tone="inkFaint" style={{ marginTop: 4 }}>
                  Your Want to Read shelf has some candidates.
                </Text>
              </Card>
            )}

            <View style={{ marginBottom: theme.space.xl }}>
              <TodayCard
                pages={today.pages}
                minutes={today.minutes}
                pageGoal={goals.pagesPerDay}
                minuteGoal={goals.minutesPerDay}
                streak={streak}
                readToday={didReadToday}
                onPress={() => navigation.navigate('Goals')}
              />
            </View>
          </>
        )}

        {/* This day in reading */}
        {memories.length || anniversaries.length ? (
          <View style={{ marginBottom: theme.space.xl }}>
            <SectionHeader
              title="This day in reading"
              action="See all"
              onAction={() => navigation.navigate('ThisDay')}
            />
            <Rail>
              {anniversaries.map(({ book, entry, yearsAgo }) => (
                <Pressable key={`ann-${entry.id}`} onPress={() => openBook(book.id, entry.id)}>
                  <Card
                    ribbon
                    ribbonColor={theme.colors.gild}
                    style={{ width: 240, paddingLeft: theme.space.xl }}
                  >
                    <Text variant="label" caps tone="gild">
                      {yearsAgo === 1 ? 'One year ago today' : `${yearsAgo} years ago today`}
                    </Text>
                    <Text
                      variant="subheading"
                      tone="ink"
                      numberOfLines={2}
                      style={{ marginTop: 4, fontFamily: 'Lora_600SemiBold' }}
                    >
                      You finished {book.title}
                    </Text>
                  </Card>
                </Pressable>
              ))}

              {memories.map(({ entry, book, yearsAgo }) => (
                <Pressable
                  key={`mem-${entry.id}`}
                  onPress={() => navigation.navigate('JournalEntry', { entryId: entry.id })}
                >
                  <Card style={{ width: 240 }}>
                    <Text variant="label" caps tone="inkFaint">
                      {yearsAgo === 1 ? 'A year ago' : `${yearsAgo} years ago`}
                      {book ? ` · ${book.title}` : ''}
                    </Text>
                    <Text variant="hand" tone="ink" numberOfLines={4} style={{ marginTop: 6 }}>
                      {entry.text || entry.title || 'A note with no words, only a mood.'}
                    </Text>
                  </Card>
                </Pressable>
              ))}
            </Rail>
          </View>
        ) : null}

        {/* Currently reading shelf */}
        {reading.length > 1 ? (
          <View style={{ marginBottom: theme.space.xl }}>
            <SectionHeader
              title="On the go"
              action="Library"
              onAction={() =>
                navigation.navigate('Tabs', { screen: 'Library', params: { shelf: 'currentlyReading' } })
              }
            />
            <Rail>
              {reading.map((entry, index) => {
                const book = books[entry.bookId];
                if (!book) return null;
                return (
                  <BookTile
                    key={entry.id}
                    book={book}
                    entry={entry}
                    index={index}
                    onPress={() => openBook(book.id, entry.id)}
                  />
                );
              })}
            </Rail>
          </View>
        ) : null}

        {/* Quote of the day */}
        {favouriteQuote ? (
          <View style={{ marginBottom: theme.space.xl, paddingHorizontal: theme.space.lg }}>
            <QuoteCard
              quote={favouriteQuote}
              tiltSeed={2}
              onPress={() => navigation.navigate('Tabs', { screen: 'Collection', params: { tab: 'quotes' } })}
            />
          </View>
        ) : (
          <View style={{ marginBottom: theme.space.xl, paddingHorizontal: theme.space.lg }}>
            <Card style={{ paddingVertical: theme.space.xl }}>
              <Text variant="quote" tone="ink" align="center">
                “{wisdom.text}”
              </Text>
              <Text variant="small" tone="inkFaint" align="center" style={{ marginTop: theme.space.md }}>
                {wisdom.author}
              </Text>
            </Card>
          </View>
        )}

        {/* Recently finished */}
        {finished.length ? (
          <View style={{ marginBottom: theme.space.xl }}>
            <SectionHeader
              title="Recently finished"
              action="All"
              onAction={() => navigation.navigate('Tabs', { screen: 'Library', params: { shelf: 'finished' } })}
            />
            <Rail>
              {finished.map((entry, index) => {
                const book = books[entry.bookId];
                if (!book) return null;
                return (
                  <View key={entry.id} style={{ width: 92 }}>
                    <BookTile
                      book={book}
                      entry={entry}
                      index={index}
                      onPress={() => openBook(book.id, entry.id)}
                    />
                    {entry.finishedAt ? (
                      <Text variant="caption" tone="inkFaint" numberOfLines={1}>
                        {friendlyDate(entry.finishedAt)}
                      </Text>
                    ) : null}
                  </View>
                );
              })}
            </Rail>
          </View>
        ) : null}

        {/* Recently added */}
        {recentlyAdded.length > 2 ? (
          <View style={{ marginBottom: theme.space.xl }}>
            <SectionHeader title="Newly on the shelf" />
            <Rail>
              {recentlyAdded.map((entry, index) => {
                const book = books[entry.bookId];
                if (!book) return null;
                return (
                  <BookTile
                    key={entry.id}
                    book={book}
                    entry={entry}
                    index={index}
                    onPress={() => openBook(book.id, entry.id)}
                  />
                );
              })}
            </Rail>
          </View>
        ) : null}

        {/* The daily illustration — no purpose beyond being nice to look at. */}
        <View style={styles.dailyArt}>
          <DailyIllustration size={190} />
          <Text variant="caption" tone="inkFaint" align="center" style={{ marginTop: theme.space.sm }}>
            {wisdom.text.length < 70 ? `“${wisdom.text}”` : 'Somewhere quiet, later today.'}
          </Text>
        </View>

        {/* Recommendations */}
        {suggestions?.length ? (
          <View style={{ marginBottom: theme.space.xl }}>
            <Ornament />
            <SectionHeader title="You might enjoy" />
            <Text
              variant="small"
              tone="inkFaint"
              style={{ paddingHorizontal: theme.space.lg, marginTop: -8, marginBottom: theme.space.md }}
            >
              Because you have been reading {suggestionSubject.toLowerCase()}
            </Text>
            <Rail>
              {suggestions.slice(0, 12).map((book, index) => (
                <BookTile
                  key={book.id}
                  book={book}
                  index={index}
                  onPress={() => openBook(book.id)}
                />
              ))}
            </Rail>
          </View>
        ) : null}

        {!libraryEmpty ? (
          <Pressable
            onPress={() => navigation.navigate('Search')}
            style={{ marginHorizontal: theme.space.lg, marginTop: theme.space.sm }}
          >
            <Card
              style={[
                styles.addRow,
                { borderStyle: 'dashed', borderColor: withAlpha(theme.colors.accent, 0.4) },
              ]}
            >
              <Ionicons name="add-circle-outline" size={20} color={theme.colors.accent} />
              <Text variant="bodyStrong" tone="accent" style={{ marginLeft: 8 }}>
                Add another book
              </Text>
            </Card>
          </Pressable>
        ) : null}
      </Animated.ScrollView>

      <LogProgressSheet
        visible={Boolean(logging)}
        onClose={() => setLogging(null)}
        book={logging?.book}
        entry={logging?.entry}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', paddingBottom: 4 },
  dailyArt: { alignItems: 'center', paddingHorizontal: 32, marginBottom: 32 },
  addRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
});
