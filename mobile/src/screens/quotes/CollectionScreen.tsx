import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { Chip } from '@/components/Chip';
import { TextField } from '@/components/TextField';
import { IconButton } from '@/components/Header';
import { SegmentedControl } from '@/components/SegmentedControl';
import { EmptyState } from '@/components/EmptyState';
import { QuoteCard } from '@/components/QuoteCard';
import { StickyNote } from '@/components/StickyNote';

import { useTheme } from '@/theme/ThemeProvider';
import { useQuotesStore, searchQuotes, quoteCategories } from '@/store/useQuotesStore';
import { useNotesStore, searchNotes } from '@/store/useNotesStore';
import { useDebounced } from '@/hooks/useDebounced';
import type { RootStackParamList, TabParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<TabParamList, 'Collection'>;

type Tab = 'quotes' | 'notes';

/**
 * Keepsakes: the quotes and the sticky notes, the two things in the app that
 * are not attached to a particular reading session.
 */
export function CollectionScreen() {
  const theme = useTheme();
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { width } = useWindowDimensions();

  const quotes = useQuotesStore((s) => s.quotes);
  const notes = useNotesStore((s) => s.notes);

  const [tab, setTab] = useState<Tab>(route.params?.tab ?? 'quotes');
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [category, setCategory] = useState<string | null>(null);
  const [favouritesOnly, setFavouritesOnly] = useState(false);

  const debounced = useDebounced(query, 220);
  const categories = useMemo(() => quoteCategories(quotes), [quotes]);

  const visibleQuotes = useMemo(() => {
    let list = searchQuotes(quotes, debounced);
    if (category) list = list.filter((q) => q.category === category);
    if (favouritesOnly) list = list.filter((q) => q.favorite);
    return list;
  }, [quotes, debounced, category, favouritesOnly]);

  const visibleNotes = useMemo(() => searchNotes(notes, debounced), [notes, debounced]);

  const gutter = theme.space.lg;
  const noteColumns = width > 640 ? 3 : 2;
  const noteWidth = Math.floor((width - gutter * 2 - 12 * (noteColumns - 1)) / noteColumns);

  const create = () =>
    tab === 'quotes' ? navigation.navigate('QuoteEditor', {}) : navigation.navigate('NoteEditor', {});

  return (
    <Screen edges={['top']}>
      <View style={[styles.topBar, { paddingHorizontal: gutter }]}>
        <View style={{ flex: 1 }}>
          <Text variant="title" tone="ink">
            Keepsakes
          </Text>
          <Text variant="caption" tone="inkFaint">
            {Object.keys(quotes).length} quotes · {Object.keys(notes).length} notes
          </Text>
        </View>
        <IconButton
          name={searching ? 'close' : 'search-outline'}
          label={searching ? 'Close search' : 'Search'}
          onPress={() => {
            setSearching((v) => !v);
            if (searching) setQuery('');
          }}
        />
        <IconButton
          name="add"
          label={tab === 'quotes' ? 'Save a quote' : 'Write a note'}
          onPress={create}
          style={{ marginLeft: theme.space.sm }}
        />
      </View>

      <View style={{ paddingHorizontal: gutter, paddingVertical: theme.space.md }}>
        <SegmentedControl<Tab>
          value={tab}
          onChange={setTab}
          segments={[
            { value: 'quotes', label: 'Quotes', icon: 'chatbox-ellipses-outline' },
            { value: 'notes', label: 'Notes', icon: 'reader-outline' },
          ]}
        />
      </View>

      {searching ? (
        <View style={{ paddingHorizontal: gutter, paddingBottom: theme.space.md }}>
          <TextField
            placeholder={tab === 'quotes' ? 'Search your quotes…' : 'Search your notes…'}
            value={query}
            onChangeText={setQuery}
            autoFocus
            returnKeyType="search"
            right={<Ionicons name="search" size={16} color={theme.colors.inkFaint} />}
          />
        </View>
      ) : null}

      {tab === 'quotes' && (categories.length > 0 || Object.keys(quotes).length > 2) ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: gutter, gap: 8, paddingBottom: theme.space.md }}
          style={{ flexGrow: 0 }}
        >
          <Chip
            label="♡ Favourites"
            selected={favouritesOnly}
            onPress={() => setFavouritesOnly((v) => !v)}
          />
          {categories.map((c) => (
            <Chip key={c} label={c} selected={category === c} onPress={() => setCategory(category === c ? null : c)} />
          ))}
        </ScrollView>
      ) : null}

      {tab === 'quotes' ? (
        visibleQuotes.length ? (
          <FlashList
            data={visibleQuotes}
            keyExtractor={(quote) => quote.id}
            contentContainerStyle={{ paddingHorizontal: gutter, paddingBottom: 130 }}
            renderItem={({ item, index }) => (
              <View style={{ marginBottom: theme.space.lg }}>
                <QuoteCard
                  quote={item}
                  tiltSeed={index}
                  onPress={() => navigation.navigate('QuoteEditor', { quoteId: item.id })}
                />
              </View>
            )}
          />
        ) : (
          <EmptyState
            illustration="openBook"
            title={debounced ? 'No quotes match' : 'No quotes yet'}
            message={
              debounced
                ? 'Try another word.'
                : 'The lines that stopped you mid-page belong here. You can share them as little cards later.'
            }
            actionLabel={debounced ? undefined : 'Save a quote'}
            onAction={debounced ? undefined : create}
          />
        )
      ) : visibleNotes.length ? (
        <FlashList
          data={visibleNotes}
          keyExtractor={(note) => note.id}
          numColumns={noteColumns}
          contentContainerStyle={{ paddingHorizontal: gutter, paddingBottom: 130 }}
          renderItem={({ item, index }) => (
            <View style={{ paddingRight: 12, paddingBottom: 12 }}>
              <StickyNote
                note={item}
                width={noteWidth}
                tiltSeed={index}
                onPress={() => navigation.navigate('NoteEditor', { noteId: item.id })}
              />
            </View>
          )}
        />
      ) : (
        <EmptyState
          illustration="candle"
          title={debounced ? 'Nothing found' : 'The pinboard is empty'}
          message={
            debounced
              ? 'Try another word.'
              : 'Quick thoughts, reading lists, half-formed ideas. They stick here until you need them.'
          }
          actionLabel={debounced ? undefined : 'Write a note'}
          onAction={debounced ? undefined : create}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', paddingBottom: 4 },
});
