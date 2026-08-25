import React, { useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
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
import { QuoteCard, quotePaper } from '@/components/QuoteCard';
import { Sheet } from '@/components/Sheet';
import { BookCover } from '@/components/BookCover';
import { useDialog } from '@/components/DialogProvider';

import { useTheme } from '@/theme/ThemeProvider';
import { useQuotesStore } from '@/store/useQuotesStore';
import { useBooksStore } from '@/store/useBooksStore';
import { useLibraryStore } from '@/store/useLibraryStore';
import { haptics } from '@/lib/haptics';
import { withAlpha } from '@/lib/color';
import type { RootStackParamList } from '@/navigation/types';
import type { Quote } from '@/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'QuoteEditor'>;

const CATEGORIES = ['Beautiful', 'Wise', 'Funny', 'Heartbreaking', 'True', 'Comforting', 'Strange'];

export function QuoteEditorScreen() {
  const theme = useTheme();
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();

  const quotes = useQuotesStore((s) => s.quotes);
  const addQuote = useQuotesStore((s) => s.add);
  const updateQuote = useQuotesStore((s) => s.update);
  const removeQuote = useQuotesStore((s) => s.remove);

  const books = useBooksStore((s) => s.byId);
  const library = useLibraryStore((s) => s.entries);

  const existing = route.params?.quoteId ? quotes[route.params.quoteId] : undefined;
  const seedBook = route.params?.bookId ? books[route.params.bookId] : undefined;

  const [text, setText] = useState(existing?.text ?? '');
  const [bookId, setBookId] = useState<string | undefined>(existing?.bookId ?? seedBook?.id);
  const [page, setPage] = useState(existing?.page ? String(existing.page) : '');
  const [chapter, setChapter] = useState(existing?.chapter ?? '');
  const [speaker, setSpeaker] = useState(existing?.speaker ?? '');
  const [category, setCategory] = useState(existing?.category);
  const [colorIndex, setColorIndex] = useState(existing?.colorIndex ?? 0);
  const [favorite, setFavorite] = useState(existing?.favorite ?? false);
  const [bookSheet, setBookSheet] = useState(false);
  const [sharing, setSharing] = useState(false);

  const shareRef = useRef<View>(null);
  const { confirm, notify } = useDialog();

  const book = bookId ? books[bookId] : undefined;

  const preview: Quote = useMemo(
    () => ({
      id: existing?.id ?? 'preview',
      text: text.trim() || 'The line you could not stop thinking about.',
      bookId,
      bookTitle: book?.title,
      bookAuthor: book?.authors[0],
      page: page ? Number.parseInt(page, 10) || undefined : undefined,
      chapter: chapter.trim() || undefined,
      speaker: speaker.trim() || undefined,
      category,
      favorite,
      colorIndex,
      createdAt: existing?.createdAt ?? Date.now(),
      updatedAt: Date.now(),
    }),
    [existing, text, bookId, book, page, chapter, speaker, category, favorite, colorIndex],
  );

  const booksInLibrary = useMemo(
    () =>
      Object.values(library)
        .map((entry) => books[entry.bookId])
        .filter(Boolean)
        .sort((a, b) => a!.title.localeCompare(b!.title)),
    [library, books],
  );

  const save = () => {
    const trimmed = text.trim();
    if (!trimmed) {
      void notify('Nothing to keep', 'Type the quote first.');
      return;
    }

    const payload = {
      text: trimmed,
      bookId,
      bookTitle: book?.title,
      bookAuthor: book?.authors[0],
      page: page ? Number.parseInt(page, 10) || undefined : undefined,
      chapter: chapter.trim() || undefined,
      speaker: speaker.trim() || undefined,
      category,
      colorIndex,
      favorite,
    };

    if (existing) updateQuote(existing.id, payload);
    else addQuote(payload);

    haptics.success();
    navigation.goBack();
  };

  const confirmDelete = async () => {
    if (!existing) return;
    const gone = await confirm({
      title: 'Let this one go?',
      message: 'The quote will be removed from your collection.',
      confirmLabel: 'Delete',
      cancelLabel: 'Keep it',
      destructive: true,
    });
    if (!gone) return;
    removeQuote(existing.id);
    navigation.goBack();
  };

  const shareAsImage = async () => {
    if (!text.trim()) {
      void notify('Nothing to share', 'Type the quote first.');
      return;
    }
    setSharing(true);
    try {
      const uri = await captureRef(shareRef, { format: 'png', quality: 1, result: 'tmpfile' });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share this quote' });
      } else {
        void notify('Sharing unavailable', 'This device cannot share files.');
      }
    } catch {
      void notify('Could not make the card', 'Something went wrong rendering the image.');
    } finally {
      setSharing(false);
    }
  };

  return (
    <Screen edges={['top', 'bottom']} ambience={false}>
      <View style={[styles.topBar, { paddingHorizontal: theme.space.lg }]}>
        <IconButton name="chevron-down" label="Close" onPress={() => navigation.goBack()} />
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text variant="bodyStrong" tone="ink">
            {existing ? 'Edit quote' : 'Save a quote'}
          </Text>
        </View>
        {existing ? (
          <IconButton name="trash-outline" label="Delete quote" onPress={() => void confirmDelete()} />
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView
          contentContainerStyle={{ padding: theme.space.lg, paddingBottom: 120 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Live preview — this is exactly what gets shared. */}
          <View ref={shareRef} collapsable={false} style={{ backgroundColor: theme.colors.canvas }}>
            <QuoteCard quote={preview} flat />
          </View>

          <View style={[styles.paperRow, { marginTop: theme.space.lg }]}>
            <Text variant="label" caps tone="inkFaint" style={{ marginRight: theme.space.md }}>
              Paper
            </Text>
            {[0, 1, 2, 3, 4, 5].map((index) => (
              <Pressable
                key={index}
                onPress={() => {
                  setColorIndex(index);
                  haptics.select();
                }}
                haptic="none"
                scaleTo={0.85}
                accessibilityLabel={`Paper colour ${index + 1}`}
                style={[
                  styles.swatch,
                  {
                    backgroundColor: quotePaper(theme, index),
                    borderColor: colorIndex === index ? theme.colors.accent : withAlpha(theme.colors.rule, 1),
                    borderWidth: colorIndex === index ? 2 : StyleSheet.hairlineWidth,
                  },
                ]}
              >
                <View />
              </Pressable>
            ))}

            <View style={{ flex: 1 }} />

            <Pressable
              onPress={() => {
                setFavorite((v) => !v);
                haptics.select();
              }}
              scaleTo={0.85}
              accessibilityLabel={favorite ? 'Remove from favourites' : 'Mark as favourite'}
            >
              <Ionicons
                name={favorite ? 'heart' : 'heart-outline'}
                size={22}
                color={favorite ? theme.colors.accent : theme.colors.inkFaint}
              />
            </Pressable>
          </View>

          <Divider style={{ marginVertical: theme.space.lg }} />

          <TextField
            label="The quote"
            placeholder="Type it out, or read it in slowly…"
            value={text}
            onChangeText={setText}
            multiline
            auto
            autoFocus={!existing}
            style={{ minHeight: 120 }}
          />

          <View style={{ height: theme.space.lg }} />

          <Pressable onPress={() => setBookSheet(true)} accessibilityRole="button" accessibilityLabel="Choose book">
            <Card sunken style={styles.bookPicker}>
              {book ? <BookCover book={book} size="xs" /> : null}
              <View style={{ flex: 1, marginLeft: book ? theme.space.md : 0 }}>
                <Text variant="label" caps tone="inkFaint">
                  From
                </Text>
                <Text variant="bodyStrong" tone={book ? 'ink' : 'inkFaint'} numberOfLines={1}>
                  {book?.title ?? 'Pick a book (optional)'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={theme.colors.inkFaint} />
            </Card>
          </Pressable>

          <View style={[styles.pair, { marginTop: theme.space.lg }]}>
            <TextField
              label="Page"
              placeholder="212"
              value={page}
              onChangeText={setPage}
              keyboardType="number-pad"
              containerStyle={{ flex: 1 }}
            />
            <TextField
              label="Chapter"
              placeholder="Optional"
              value={chapter}
              onChangeText={setChapter}
              containerStyle={{ flex: 2 }}
            />
          </View>

          <View style={{ height: theme.space.lg }} />

          <TextField
            label="Who said it"
            placeholder="A character, or leave blank for the author"
            value={speaker}
            onChangeText={setSpeaker}
          />

          <Text variant="label" caps tone="inkFaint" style={{ marginTop: theme.space.xl, marginBottom: theme.space.sm }}>
            What kind of line is it?
          </Text>
          <View style={styles.chips}>
            {CATEGORIES.map((c) => (
              <Chip
                key={c}
                label={c}
                selected={category === c}
                onPress={() => setCategory(category === c ? undefined : c)}
              />
            ))}
          </View>

          <Button label="Keep it" size="lg" full onPress={save} style={{ marginTop: theme.space.xxl }} />
          <Button
            label={sharing ? 'Making the card…' : 'Share as a card'}
            variant="secondary"
            full
            loading={sharing}
            onPress={shareAsImage}
            style={{ marginTop: theme.space.sm }}
          />
        </ScrollView>
      </KeyboardAvoidingView>

      <Sheet visible={bookSheet} onClose={() => setBookSheet(false)} title="Which book?">
        <ScrollView style={{ maxHeight: 400 }} contentContainerStyle={{ paddingBottom: theme.space.lg }}>
          <Pressable
            onPress={() => {
              setBookId(undefined);
              setBookSheet(false);
            }}
            style={[styles.pickRow, { paddingVertical: theme.space.md }]}
          >
            <Text variant="body" tone="inkFaint">
              No book — just a line I liked
            </Text>
          </Pressable>
          {booksInLibrary.map((item) => (
            <View key={item!.id}>
              <Divider />
              <Pressable
                onPress={() => {
                  setBookId(item!.id);
                  setBookSheet(false);
                }}
                style={[styles.pickRow, { paddingVertical: theme.space.md }]}
              >
                <BookCover book={item!} size="xs" />
                <View style={{ flex: 1, marginLeft: theme.space.md }}>
                  <Text variant="bodyStrong" tone="ink" numberOfLines={1}>
                    {item!.title}
                  </Text>
                  {item!.authors[0] ? (
                    <Text variant="caption" tone="inkFaint" numberOfLines={1}>
                      {item!.authors[0]}
                    </Text>
                  ) : null}
                </View>
                {bookId === item!.id ? (
                  <Ionicons name="checkmark-circle" size={18} color={theme.colors.accent} />
                ) : null}
              </Pressable>
            </View>
          ))}
        </ScrollView>
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingBottom: 4 },
  paperRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  swatch: { width: 26, height: 26, borderRadius: 13 },
  bookPicker: { flexDirection: 'row', alignItems: 'center' },
  pair: { flexDirection: 'row', gap: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  pickRow: { flexDirection: 'row', alignItems: 'center' },
});
