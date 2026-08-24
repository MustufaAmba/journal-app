import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { Chip } from '@/components/Chip';
import { TextField } from '@/components/TextField';
import { IconButton } from '@/components/Header';
import { EmptyState } from '@/components/EmptyState';
import { Pressable } from '@/components/Pressable';
import { Sheet } from '@/components/Sheet';
import { BookCover } from '@/components/BookCover';
import { Divider } from '@/components/Divider';
import { JournalEntryCard } from './JournalEntryCard';

import { useTheme } from '@/theme/ThemeProvider';
import { useJournalStore, allEntriesNewestFirst, allJournalTags, searchJournal } from '@/store/useJournalStore';
import { useBooksStore } from '@/store/useBooksStore';
import { useLibraryStore } from '@/store/useLibraryStore';
import { useDebounced } from '@/hooks/useDebounced';
import { MOODS } from '@/data/moods';
import { format } from '@/lib/date';
import type { RootStackParamList } from '@/navigation/types';
import type { JournalEntry, Mood } from '@/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

type Row =
  | { kind: 'month'; key: string; label: string }
  | { kind: 'entry'; key: string; entry: JournalEntry };

export function JournalScreen() {
  const theme = useTheme();
  const navigation = useNavigation<Nav>();

  const entries = useJournalStore((s) => s.entries);
  const books = useBooksStore((s) => s.byId);
  const library = useLibraryStore((s) => s.entries);

  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [mood, setMood] = useState<Mood | null>(null);
  const [tag, setTag] = useState<string | null>(null);
  const [picker, setPicker] = useState(false);

  const debounced = useDebounced(query, 250);
  const tags = useMemo(() => allJournalTags(entries), [entries]);

  const filtered = useMemo(() => {
    let list = debounced.trim() ? searchJournal(entries, debounced) : allEntriesNewestFirst(entries);
    if (mood) list = list.filter((e) => e.mood === mood);
    if (tag) list = list.filter((e) => e.tags.includes(tag));
    return list;
  }, [entries, debounced, mood, tag]);

  // Group by month so a long journal reads like a diary with tabbed sections.
  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [];
    let lastMonth = '';
    filtered.forEach((entry) => {
      const label = format(new Date(entry.date), 'MMMM yyyy');
      if (label !== lastMonth) {
        out.push({ kind: 'month', key: `m-${label}`, label });
        lastMonth = label;
      }
      out.push({ kind: 'entry', key: entry.id, entry });
    });
    return out;
  }, [filtered]);

  const booksWithEntries = useMemo(
    () =>
      Object.values(library)
        .map((e) => books[e.bookId])
        .filter(Boolean)
        .sort((a, b) => a!.title.localeCompare(b!.title)),
    [library, books],
  );

  const totalEntries = Object.values(entries).filter((e) => !e.draft).length;

  return (
    <Screen edges={['top']}>
      <View style={[styles.topBar, { paddingHorizontal: theme.space.lg }]}>
        <View style={{ flex: 1 }}>
          <Text variant="title" tone="ink">
            Journal
          </Text>
          <Text variant="caption" tone="inkFaint">
            {totalEntries} {totalEntries === 1 ? 'entry' : 'entries'}, in your own words
          </Text>
        </View>
        <IconButton
          name={searching ? 'close' : 'search-outline'}
          label={searching ? 'Close search' : 'Search the journal'}
          onPress={() => {
            setSearching((v) => !v);
            if (searching) setQuery('');
          }}
        />
        <IconButton
          name="create-outline"
          label="Write a new entry"
          onPress={() => setPicker(true)}
          style={{ marginLeft: theme.space.sm }}
        />
      </View>

      {searching ? (
        <View style={{ paddingHorizontal: theme.space.lg, paddingBottom: theme.space.md }}>
          <TextField
            placeholder="Search everything you have written…"
            value={query}
            onChangeText={setQuery}
            autoFocus
            returnKeyType="search"
            right={<Ionicons name="search" size={16} color={theme.colors.inkFaint} />}
          />
        </View>
      ) : null}

      {(tags.length || totalEntries > 3) && !searching ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: theme.space.lg, gap: 8, paddingBottom: theme.space.md }}
          style={{ flexGrow: 0 }}
        >
          {MOODS.filter((m) => Object.values(entries).some((e) => e.mood === m.id)).map((m) => (
            <Chip
              key={m.id}
              label={`${m.emoji} ${m.label}`}
              tint={m.hue}
              selected={mood === m.id}
              onPress={() => setMood(mood === m.id ? null : m.id)}
            />
          ))}
          {tags.slice(0, 12).map((t) => (
            <Chip key={t} label={`#${t}`} selected={tag === t} onPress={() => setTag(tag === t ? null : t)} />
          ))}
        </ScrollView>
      ) : null}

      {!rows.length ? (
        <EmptyState
          illustration="quill"
          title={debounced || mood || tag ? 'Nothing matches' : 'The diary is blank'}
          message={
            debounced || mood || tag
              ? 'Try a different word, or clear the filters.'
              : 'Every book gets a page of its own here — what you thought, what you felt, what you want to remember.'
          }
          actionLabel={debounced || mood || tag ? undefined : 'Write the first entry'}
          onAction={debounced || mood || tag ? undefined : () => setPicker(true)}
        />
      ) : (
        <FlashList
          data={rows}
          keyExtractor={(row) => row.key}
          contentContainerStyle={{ paddingHorizontal: theme.space.lg, paddingBottom: 130 }}
          renderItem={({ item }) =>
            item.kind === 'month' ? (
              <View style={{ paddingTop: theme.space.lg, paddingBottom: theme.space.sm }}>
                <Text variant="label" caps tone="inkFaint">
                  {item.label}
                </Text>
              </View>
            ) : (
              <View style={{ marginBottom: theme.space.md }}>
                <JournalEntryCard
                  entry={item.entry}
                  showBook
                  onPress={() => navigation.navigate('JournalEntry', { entryId: item.entry.id })}
                />
              </View>
            )
          }
        />
      )}

      <Sheet visible={picker} onClose={() => setPicker(false)} title="Which book?">
        <ScrollView style={{ maxHeight: 420 }} contentContainerStyle={{ paddingBottom: theme.space.lg }}>
          {booksWithEntries.length ? (
            booksWithEntries.map((book, index) => (
              <View key={book!.id}>
                {index > 0 ? <Divider /> : null}
                <Pressable
                  onPress={() => {
                    setPicker(false);
                    setTimeout(() => navigation.navigate('JournalEntry', { bookId: book!.id }), 220);
                  }}
                  style={[styles.pickRow, { paddingVertical: theme.space.md }]}
                >
                  <BookCover book={book!} size="xs" />
                  <View style={{ flex: 1, marginLeft: theme.space.md }}>
                    <Text variant="bodyStrong" tone="ink" numberOfLines={1}>
                      {book!.title}
                    </Text>
                    {book!.authors[0] ? (
                      <Text variant="caption" tone="inkFaint" numberOfLines={1}>
                        {book!.authors[0]}
                      </Text>
                    ) : null}
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={theme.colors.inkFaint} />
                </Pressable>
              </View>
            ))
          ) : (
            <View style={{ paddingVertical: theme.space.xl, alignItems: 'center' }}>
              <Text variant="body" tone="inkFaint" align="center">
                Add a book to your library first, then it will show up here.
              </Text>
            </View>
          )}
        </ScrollView>
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', paddingBottom: 8 },
  pickRow: { flexDirection: 'row', alignItems: 'center' },
});
