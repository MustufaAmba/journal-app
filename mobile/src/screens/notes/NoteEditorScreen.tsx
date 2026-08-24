import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { Chip } from '@/components/Chip';
import { TextField } from '@/components/TextField';
import { Pressable } from '@/components/Pressable';
import { IconButton } from '@/components/Header';
import { MarkdownText } from '@/components/MarkdownText';
import { SegmentedControl } from '@/components/SegmentedControl';
import { noteColors } from '@/components/StickyNote';
import { PaperTexture } from '@/components/PaperTexture';

import { useTheme } from '@/theme/ThemeProvider';
import { useNotesStore, NOTE_COLOR_COUNT } from '@/store/useNotesStore';
import { useBooksStore } from '@/store/useBooksStore';
import { useAutosave } from '@/hooks/useDebounced';
import { friendlyDate } from '@/lib/date';
import { withAlpha, isLight } from '@/lib/color';
import { haptics } from '@/lib/haptics';
import type { RootStackParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'NoteEditor'>;

const MARKDOWN_HINTS = [
  { insert: '**bold**', label: 'B' },
  { insert: '*italic*', label: 'i' },
  { insert: '# ', label: 'H' },
  { insert: '- ', label: '•' },
  { insert: '- [ ] ', label: '☐' },
  { insert: '> ', label: '❝' },
];

export function NoteEditorScreen() {
  const theme = useTheme();
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();

  const notes = useNotesStore((s) => s.notes);
  const createNote = useNotesStore((s) => s.create);
  const saveNote = useNotesStore((s) => s.save);
  const removeNote = useNotesStore((s) => s.remove);
  const discardIfEmpty = useNotesStore((s) => s.discardIfEmpty);

  const idRef = useRef<string | null>(route.params?.noteId ?? null);
  if (!idRef.current) {
    idRef.current = createNote({ bookId: route.params?.bookId }).id;
  }
  const noteId = idRef.current;
  const note = notes[noteId];

  const book = useBooksStore((s) => (note?.bookId ? s.byId[note.bookId] : undefined));

  const [title, setTitle] = useState(note?.title ?? '');
  const [body, setBody] = useState(note?.body ?? '');
  const [colorIndex, setColorIndex] = useState(note?.colorIndex ?? 0);
  const [pinned, setPinned] = useState(note?.pinned ?? false);
  const [tags, setTags] = useState<string[]>(note?.tags ?? []);
  const [tagInput, setTagInput] = useState('');
  const [mode, setMode] = useState<'write' | 'read'>('write');

  const draft = { title, body, colorIndex, pinned, tags };

  useAutosave(draft, (value) => saveNote(noteId, value), 600);

  useEffect(() => () => discardIfEmpty(noteId), [discardIfEmpty, noteId]);

  const paper = noteColors(theme)[colorIndex % NOTE_COLOR_COUNT];
  const ink = isLight(paper) ? '#2E2418' : theme.colors.ink;

  const addTag = useCallback(() => {
    const tag = tagInput.trim().replace(/^#/, '').toLowerCase();
    if (!tag || tags.includes(tag)) {
      setTagInput('');
      return;
    }
    setTags([...tags, tag]);
    setTagInput('');
    haptics.select();
  }, [tagInput, tags]);

  const confirmDelete = () => {
    Alert.alert('Throw this note away?', 'It will not be recoverable.', [
      { text: 'Keep it', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          removeNote(noteId);
          haptics.warn();
          navigation.goBack();
        },
      },
    ]);
  };

  const insert = (snippet: string) => {
    setBody((current) => (current.endsWith('\n') || !current ? current + snippet : `${current}\n${snippet}`));
    haptics.tap();
  };

  return (
    <Screen edges={['top', 'bottom']} ambience={false}>
      <View style={[styles.topBar, { paddingHorizontal: theme.space.lg }]}>
        <IconButton name="chevron-down" label="Close" onPress={() => navigation.goBack()} />
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text variant="caption" tone="inkFaint">
            {note ? friendlyDate(note.updatedAt) : 'New note'}
            {book ? ` · ${book.title}` : ''}
          </Text>
        </View>
        <IconButton
          name={pinned ? 'pin' : 'pin-outline'}
          label={pinned ? 'Unpin note' : 'Pin note'}
          color={pinned ? theme.colors.danger : undefined}
          onPress={() => {
            setPinned((v) => !v);
            haptics.select();
          }}
        />
        <IconButton name="trash-outline" label="Delete note" onPress={confirmDelete} style={{ marginLeft: theme.space.sm }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView
          contentContainerStyle={{ padding: theme.space.lg, paddingBottom: 110 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View
            style={[
              styles.sheet,
              { backgroundColor: paper, borderRadius: theme.radius.lg, padding: theme.space.lg },
              theme.elevation(2),
            ]}
          >
            <PaperTexture opacity={0.06} />

            <TextField
              placeholder="Title"
              value={title}
              onChangeText={setTitle}
              containerStyle={{ marginBottom: theme.space.md }}
              style={{ ...theme.type.heading, fontFamily: 'Lora_600SemiBold', color: ink }}
              placeholderTextColor={withAlpha(ink, 0.4)}
            />

            <SegmentedControl<'write' | 'read'>
              compact
              value={mode}
              onChange={setMode}
              segments={[
                { value: 'write', label: 'Write', icon: 'create-outline' },
                { value: 'read', label: 'Preview', icon: 'eye-outline' },
              ]}
              style={{ marginBottom: theme.space.md }}
            />

            {mode === 'write' ? (
              <>
                <TextField
                  placeholder={'Markdown works here.\n\n# A heading\n- a list\n**bold** and *italic*'}
                  value={body}
                  onChangeText={setBody}
                  multiline
                  auto
                  autoFocus={!route.params?.noteId}
                  style={{ minHeight: 260, color: ink }}
                  placeholderTextColor={withAlpha(ink, 0.4)}
                  containerStyle={{ backgroundColor: withAlpha('#ffffff', 0.25) }}
                />

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 6, paddingTop: theme.space.md }}
                >
                  {MARKDOWN_HINTS.map((hint) => (
                    <Pressable
                      key={hint.insert}
                      onPress={() => insert(hint.insert)}
                      haptic="none"
                      scaleTo={0.9}
                      accessibilityLabel={`Insert ${hint.insert.trim()}`}
                      style={[
                        styles.mdButton,
                        { backgroundColor: withAlpha(ink, 0.08), borderRadius: theme.radius.sm },
                      ]}
                    >
                      <Text variant="small" color={withAlpha(ink, 0.75)} style={{ fontFamily: 'Karla_700Bold' }}>
                        {hint.label}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </>
            ) : (
              <View style={{ minHeight: 260 }}>
                {body.trim() ? (
                  <MarkdownText value={body} color={ink} />
                ) : (
                  <Text variant="body" color={withAlpha(ink, 0.5)} italic>
                    Nothing to preview yet.
                  </Text>
                )}
              </View>
            )}
          </View>

          {/* Colour */}
          <View style={[styles.colorRow, { marginTop: theme.space.lg }]}>
            <Text variant="label" caps tone="inkFaint" style={{ marginRight: theme.space.md }}>
              Colour
            </Text>
            {noteColors(theme).map((color, index) => (
              <Pressable
                key={index}
                onPress={() => {
                  setColorIndex(index);
                  haptics.select();
                }}
                haptic="none"
                scaleTo={0.85}
                accessibilityLabel={`Note colour ${index + 1}`}
                style={[
                  styles.swatch,
                  {
                    backgroundColor: color,
                    borderColor: colorIndex === index ? theme.colors.accent : withAlpha(theme.colors.rule, 1),
                    borderWidth: colorIndex === index ? 2 : StyleSheet.hairlineWidth,
                  },
                ]}
              >
                <View />
              </Pressable>
            ))}
          </View>

          {/* Tags */}
          <Text variant="label" caps tone="inkFaint" style={{ marginTop: theme.space.xl, marginBottom: theme.space.sm }}>
            Tags
          </Text>
          <View style={[styles.tags, { marginBottom: tags.length ? theme.space.md : 0 }]}>
            {tags.map((tag) => (
              <Chip key={tag} label={`#${tag}`} selected onPress={() => setTags(tags.filter((t) => t !== tag))} />
            ))}
          </View>
          <TextField
            placeholder="to-read, quotes, ideas…"
            value={tagInput}
            onChangeText={setTagInput}
            onSubmitEditing={addTag}
            returnKeyType="done"
            autoCapitalize="none"
            right={
              tagInput.trim() ? (
                <Pressable onPress={addTag} accessibilityLabel="Add tag">
                  <Ionicons name="add-circle" size={20} color={theme.colors.accent} />
                </Pressable>
              ) : undefined
            }
          />

          <Text variant="caption" tone="inkFaint" align="center" style={{ marginTop: theme.space.xl }}>
            Notes save themselves. Close the page whenever you like.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingBottom: 4 },
  sheet: { overflow: 'hidden' },
  colorRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  swatch: { width: 28, height: 28, borderRadius: 6 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  mdButton: { paddingHorizontal: 11, paddingVertical: 6, minWidth: 34, alignItems: 'center' },
});
