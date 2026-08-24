import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { Chip } from '@/components/Chip';
import { Card } from '@/components/Card';
import { Pressable } from '@/components/Pressable';
import { IconButton } from '@/components/Header';
import { SegmentedControl } from '@/components/SegmentedControl';
import { EmptyState } from '@/components/EmptyState';
import { Sheet } from '@/components/Sheet';
import { Divider } from '@/components/Divider';
import { BookRow, BookTile, ShelfBook } from '@/components/BookItem';
import { BookSpine } from '@/components/BookSpine';
import { Shelf } from '@/components/Shelf';
import { DraggableGrid } from '@/components/DraggableGrid';
import { BookActionsSheet } from './BookActionsSheet';

import { useTheme } from '@/theme/ThemeProvider';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useBooksStore } from '@/store/useBooksStore';
import { useLibraryStore, shelfEntries } from '@/store/useLibraryStore';
import { SHELVES, SHELF_ORDER } from '@/data/shelves';
import { haptics } from '@/lib/haptics';
import { withAlpha } from '@/lib/color';
import type { RootStackParamList, TabParamList } from '@/navigation/types';
import type { Book, LibraryEntry, ShelfId } from '@/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<TabParamList, 'Library'>;

type ViewMode = 'bookshelf' | 'grid' | 'list' | 'spines';
type SortMode = 'manual' | 'title' | 'author' | 'added' | 'rating' | 'progress';

const SORTS: { value: SortMode; label: string; hint: string }[] = [
  { value: 'manual', label: 'How I arranged them', hint: 'Drag books to rearrange' },
  { value: 'added', label: 'Recently added', hint: 'Newest first' },
  { value: 'title', label: 'Title', hint: 'A to Z' },
  { value: 'author', label: 'Author', hint: 'A to Z' },
  { value: 'rating', label: 'Rating', hint: 'Best first' },
  { value: 'progress', label: 'Progress', hint: 'Furthest along first' },
];

export function LibraryScreen() {
  const theme = useTheme();
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { width } = useWindowDimensions();

  const defaultView = useSettingsStore((s) => s.defaultLibraryView);
  const patchSettings = useSettingsStore((s) => s.patch);

  const books = useBooksStore((s) => s.byId);
  const entries = useLibraryStore((s) => s.entries);
  const reorder = useLibraryStore((s) => s.reorder);

  const [shelf, setShelf] = useState<ShelfId>(route.params?.shelf ?? 'currentlyReading');
  const [view, setView] = useState<ViewMode>(defaultView);
  const [sort, setSort] = useState<SortMode>('manual');
  const [arranging, setArranging] = useState(false);
  const [sortSheet, setSortSheet] = useState(false);
  const [actionTarget, setActionTarget] = useState<{ book: Book; entry: LibraryEntry } | null>(null);

  useEffect(() => {
    if (route.params?.shelf) setShelf(route.params.shelf);
  }, [route.params?.shelf]);

  const counts = useMemo(() => {
    const out = {} as Record<ShelfId, number>;
    SHELF_ORDER.forEach((id) => {
      out[id] = shelfEntries(entries, id).length;
    });
    return out;
  }, [entries]);

  const items = useMemo(() => {
    const list = shelfEntries(entries, shelf)
      .map((entry) => ({ entry, book: books[entry.bookId] }))
      .filter((item): item is { entry: LibraryEntry; book: Book } => Boolean(item.book));

    const sorted = [...list];
    switch (sort) {
      case 'title':
        sorted.sort((a, b) => a.book.title.localeCompare(b.book.title));
        break;
      case 'author':
        sorted.sort((a, b) => (a.book.authors[0] ?? '~').localeCompare(b.book.authors[0] ?? '~'));
        break;
      case 'added':
        sorted.sort((a, b) => b.entry.addedAt - a.entry.addedAt);
        break;
      case 'rating':
        sorted.sort((a, b) => (b.entry.rating ?? 0) - (a.entry.rating ?? 0));
        break;
      case 'progress': {
        const pct = (item: { entry: LibraryEntry; book: Book }) =>
          item.book.pageCount ? item.entry.currentPage / item.book.pageCount : 0;
        sorted.sort((a, b) => pct(b) - pct(a));
        break;
      }
      default:
        break; // already in manual order
    }
    return sorted;
  }, [entries, books, shelf, sort]);

  const openBook = useCallback(
    (book: Book, entry: LibraryEntry) => navigation.navigate('BookDetail', { bookId: book.id, entryId: entry.id }),
    [navigation],
  );

  const onLongPress = useCallback((book: Book, entry: LibraryEntry) => {
    haptics.lift();
    setActionTarget({ book, entry });
  }, []);

  const handleReorder = useCallback(
    (orderedKeys: string[]) => reorder(shelf, orderedKeys),
    [reorder, shelf],
  );

  const gutter = theme.space.lg;
  const gridColumns = width > 700 ? 5 : 3;
  const gridWidth = Math.floor((width - gutter * 2 - 12 * (gridColumns - 1)) / gridColumns);

  const meta = SHELVES[shelf];
  const canArrange = sort === 'manual' && items.length > 1;

  return (
    <Screen edges={['top']}>
      <View style={[styles.topBar, { paddingHorizontal: gutter }]}>
        <View style={{ flex: 1 }}>
          <Text variant="title" tone="ink">
            Library
          </Text>
          <Text variant="caption" tone="inkFaint">
            {Object.values(entries).length} books, all yours
          </Text>
        </View>
        <IconButton name="swap-vertical-outline" label="Sort books" onPress={() => setSortSheet(true)} />
        <IconButton
          name="add"
          label="Add a book"
          onPress={() => navigation.navigate('Search')}
          style={{ marginLeft: theme.space.sm }}
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: gutter, gap: 8, paddingVertical: theme.space.md }}
        style={{ flexGrow: 0 }}
      >
        {SHELF_ORDER.map((id) => (
          <Chip
            key={id}
            label={`${SHELVES[id].name}${counts[id] ? `  ${counts[id]}` : ''}`}
            selected={shelf === id}
            onPress={() => {
              setShelf(id);
              setArranging(false);
            }}
          />
        ))}
      </ScrollView>

      <View style={[styles.viewRow, { paddingHorizontal: gutter, marginBottom: theme.space.md }]}>
        <SegmentedControl<ViewMode>
          compact
          value={view}
          onChange={(next) => {
            setView(next);
            setArranging(false);
            patchSettings({ defaultLibraryView: next });
          }}
          segments={[
            { value: 'bookshelf', icon: 'library-outline' },
            { value: 'grid', icon: 'grid-outline' },
            { value: 'list', icon: 'list-outline' },
            { value: 'spines', icon: 'reorder-four-outline' },
          ]}
          style={{ flex: 1, maxWidth: 210 }}
        />

        {canArrange && (view === 'grid' || view === 'bookshelf') ? (
          <Pressable
            onPress={() => {
              haptics.select();
              setArranging((v) => !v);
            }}
            style={[
              styles.arrangeButton,
              {
                backgroundColor: arranging ? theme.colors.accent : withAlpha(theme.colors.accent, 0.1),
                borderRadius: theme.radius.pill,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel={arranging ? 'Finish arranging' : 'Arrange books'}
          >
            <Ionicons
              name={arranging ? 'checkmark' : 'move-outline'}
              size={14}
              color={arranging ? theme.colors.accentInk : theme.colors.accent}
            />
            <Text
              variant="caption"
              color={arranging ? theme.colors.accentInk : theme.colors.accent}
              style={{ marginLeft: 5, fontFamily: 'Karla_700Bold' }}
            >
              {arranging ? 'Done' : 'Arrange'}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {!items.length ? (
        <EmptyState
          illustration={shelf === 'finished' ? 'cat' : shelf === 'wishlist' ? 'tea' : 'shelf'}
          title={meta.name}
          message={meta.empty}
          actionLabel="Find a book"
          onAction={() => navigation.navigate('Search')}
        />
      ) : view === 'list' ? (
        <FlashList
          data={items}
          keyExtractor={(item) => item.entry.id}
          contentContainerStyle={{ paddingHorizontal: gutter, paddingBottom: 120 }}
          ItemSeparatorComponent={() => <Divider />}
          renderItem={({ item, index }) => (
            <BookRow
              book={item.book}
              entry={item.entry}
              index={index}
              onPress={() => openBook(item.book, item.entry)}
              onLongPress={() => onLongPress(item.book, item.entry)}
            />
          )}
        />
      ) : view === 'spines' ? (
        <SpineView
          items={items}
          onPress={openBook}
          onLongPress={onLongPress}
          gutter={gutter}
          width={width}
        />
      ) : view === 'grid' && arranging ? (
        <ScrollView contentContainerStyle={{ padding: gutter, paddingBottom: 140 }}>
          <ArrangeHint />
          <DraggableGrid
            items={items}
            keyExtractor={(item) => item.entry.id}
            numColumns={gridColumns}
            itemWidth={gridWidth}
            itemHeight={Math.round(gridWidth * 1.5) + 46}
            gap={12}
            onReorder={handleReorder}
            renderItem={(item, index, dragging) => (
              <BookTile
                book={item.book}
                entry={item.entry}
                width={gridWidth}
                style={dragging ? { opacity: 0.94 } : undefined}
              />
            )}
          />
        </ScrollView>
      ) : view === 'grid' ? (
        <FlashList
          data={items}
          keyExtractor={(item) => item.entry.id}
          numColumns={gridColumns}
          contentContainerStyle={{ paddingHorizontal: gutter, paddingBottom: 120 }}
          renderItem={({ item, index }) => (
            <View style={{ paddingRight: 12, paddingBottom: 18 }}>
              <BookTile
                book={item.book}
                entry={item.entry}
                index={index}
                width={gridWidth}
                onPress={() => openBook(item.book, item.entry)}
                onLongPress={() => onLongPress(item.book, item.entry)}
              />
            </View>
          )}
        />
      ) : (
        <BookshelfView
          items={items}
          onPress={openBook}
          onLongPress={onLongPress}
          gutter={gutter}
          width={width}
          arranging={arranging}
          onReorder={handleReorder}
        />
      )}

      <Sheet visible={sortSheet} onClose={() => setSortSheet(false)} title="Arrange the shelf by">
        <View style={{ paddingBottom: theme.space.lg }}>
          {SORTS.map((option) => (
            <Pressable
              key={option.value}
              onPress={() => {
                setSort(option.value);
                if (option.value !== 'manual') setArranging(false);
                setSortSheet(false);
              }}
              style={[styles.sortRow, { paddingVertical: theme.space.md }]}
              accessibilityRole="radio"
              accessibilityState={{ selected: sort === option.value }}
            >
              <View style={{ flex: 1 }}>
                <Text variant="bodyStrong" tone={sort === option.value ? 'accent' : 'ink'}>
                  {option.label}
                </Text>
                <Text variant="caption" tone="inkFaint">
                  {option.hint}
                </Text>
              </View>
              {sort === option.value ? (
                <Ionicons name="checkmark-circle" size={20} color={theme.colors.accent} />
              ) : null}
            </Pressable>
          ))}
        </View>
      </Sheet>

      <BookActionsSheet
        visible={Boolean(actionTarget)}
        onClose={() => setActionTarget(null)}
        book={actionTarget?.book}
        entry={actionTarget?.entry}
      />
    </Screen>
  );
}

function ArrangeHint() {
  const theme = useTheme();
  return (
    <Animated.View entering={FadeIn.duration(300)} style={{ marginBottom: theme.space.lg }}>
      <Card sunken style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Ionicons name="hand-left-outline" size={17} color={theme.colors.accent} />
        <Text variant="small" tone="inkSoft" style={{ marginLeft: 10, flex: 1 }}>
          Press and hold a book, then move it wherever you like.
        </Text>
      </Card>
    </Animated.View>
  );
}

/** Books standing upright on wooden planks, five or six to a shelf. */
function BookshelfView({
  items,
  onPress,
  onLongPress,
  gutter,
  width,
  arranging,
  onReorder,
}: {
  items: { book: Book; entry: LibraryEntry }[];
  onPress: (book: Book, entry: LibraryEntry) => void;
  onLongPress: (book: Book, entry: LibraryEntry) => void;
  gutter: number;
  width: number;
  arranging: boolean;
  onReorder: (keys: string[]) => void;
}) {
  const theme = useTheme();
  const bookWidth = 74;
  const perShelf = Math.max(2, Math.floor((width - gutter * 2) / (bookWidth + 10)));

  const rows = useMemo(() => {
    const out: { book: Book; entry: LibraryEntry }[][] = [];
    for (let i = 0; i < items.length; i += perShelf) out.push(items.slice(i, i + perShelf));
    return out;
  }, [items, perShelf]);

  if (arranging) {
    return (
      <ScrollView contentContainerStyle={{ padding: gutter, paddingBottom: 140 }}>
        <ArrangeHint />
        <DraggableGrid
          items={items}
          keyExtractor={(item) => item.entry.id}
          numColumns={perShelf}
          itemWidth={bookWidth}
          itemHeight={Math.round(bookWidth * 1.5) + 16}
          gap={10}
          onReorder={onReorder}
          renderItem={(item) => <ShelfBook book={item.book} entry={item.entry} width={bookWidth} />}
        />
      </ScrollView>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={{ paddingHorizontal: gutter, paddingBottom: 130, paddingTop: 4 }}
      showsVerticalScrollIndicator={false}
    >
      {rows.map((row, rowIndex) => (
        <Shelf key={rowIndex} style={{ marginBottom: theme.space.xl }}>
          {row.map((item, index) => (
            <ShelfBook
              key={item.entry.id}
              book={item.book}
              entry={item.entry}
              index={rowIndex * perShelf + index}
              width={bookWidth}
              onPress={() => onPress(item.book, item.entry)}
              onLongPress={() => onLongPress(item.book, item.entry)}
            />
          ))}
        </Shelf>
      ))}
    </ScrollView>
  );
}

/** The same books seen edge-on, packed tight the way a real shelf is. */
function SpineView({
  items,
  onPress,
  onLongPress,
  gutter,
  width,
}: {
  items: { book: Book; entry: LibraryEntry }[];
  onPress: (book: Book, entry: LibraryEntry) => void;
  onLongPress: (book: Book, entry: LibraryEntry) => void;
  gutter: number;
  width: number;
}) {
  const theme = useTheme();
  const available = width - gutter * 2;

  // Pack spines onto shelves by their real widths rather than a fixed count.
  const rows = useMemo(() => {
    const out: { book: Book; entry: LibraryEntry }[][] = [];
    let current: { book: Book; entry: LibraryEntry }[] = [];
    let used = 0;

    items.forEach((item) => {
      const spineWidth = Math.max(22, Math.min(52, 18 + (item.book.pageCount ?? 280) / 16)) + 3;
      if (used + spineWidth > available && current.length) {
        out.push(current);
        current = [];
        used = 0;
      }
      current.push(item);
      used += spineWidth;
    });
    if (current.length) out.push(current);
    return out;
  }, [items, available]);

  return (
    <ScrollView
      contentContainerStyle={{ paddingHorizontal: gutter, paddingBottom: 130, paddingTop: 4 }}
      showsVerticalScrollIndicator={false}
    >
      {rows.map((row, rowIndex) => (
        <Shelf key={rowIndex} style={{ marginBottom: theme.space.xl }}>
          {row.map((item) => (
            <BookSpine
              key={item.entry.id}
              book={item.book}
              height={168}
              highlighted={item.entry.shelf === 'currentlyReading'}
              onPress={() => onPress(item.book, item.entry)}
              onLongPress={() => onLongPress(item.book, item.entry)}
            />
          ))}
        </Shelf>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', paddingBottom: 4 },
  viewRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  arrangeButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8 },
  sortRow: { flexDirection: 'row', alignItems: 'center' },
});
