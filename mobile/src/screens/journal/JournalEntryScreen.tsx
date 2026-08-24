import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeOut, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { Card } from '@/components/Card';
import { Chip } from '@/components/Chip';
import { TextField } from '@/components/TextField';
import { Pressable } from '@/components/Pressable';
import { IconButton } from '@/components/Header';
import { Divider, Ornament } from '@/components/Divider';
import { BookCover } from '@/components/BookCover';
import { Sheet } from '@/components/Sheet';
import { VoiceNoteRecorder, VoiceNoteRow } from '@/components/VoiceNotes';

import { useTheme } from '@/theme/ThemeProvider';
import { useJournalStore, isEntryEmpty } from '@/store/useJournalStore';
import { useBooksStore } from '@/store/useBooksStore';
import { useAutosave } from '@/hooks/useDebounced';
import { MOODS, JOURNAL_EMOJI } from '@/data/moods';
import { prettyDate, prettyTime } from '@/lib/date';
import { withAlpha } from '@/lib/color';
import { haptics } from '@/lib/haptics';
import type { RootStackParamList } from '@/navigation/types';
import type { JournalEntry, Mood } from '@/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'JournalEntry'>;

/** The optional prompts, hidden behind "a few more things" so the page stays calm. */
const PROMPTS: { key: keyof JournalEntry; label: string; placeholder: string; multiline?: boolean }[] = [
  { key: 'chapter', label: 'Favourite chapter', placeholder: 'The one you reread immediately' },
  { key: 'favoriteCharacter', label: 'Favourite character', placeholder: 'Who has your heart?' },
  { key: 'favoriteScene', label: 'Favourite scene', placeholder: 'Where were you when it happened?', multiline: true },
  { key: 'prediction', label: 'What happens next', placeholder: 'Guess. You can check later.', multiline: true },
  { key: 'lesson', label: 'Something it taught you', placeholder: 'Even a small thing counts.', multiline: true },
  { key: 'reflection', label: 'Looking back', placeholder: 'How does it sit with you now?', multiline: true },
  { key: 'memory', label: 'A memory it stirred', placeholder: 'Books have a way of doing that.', multiline: true },
];

export function JournalEntryScreen() {
  const theme = useTheme();
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();

  const entries = useJournalStore((s) => s.entries);
  const startEntry = useJournalStore((s) => s.startEntry);
  const save = useJournalStore((s) => s.save);
  const removeEntry = useJournalStore((s) => s.remove);
  const discardIfEmpty = useJournalStore((s) => s.discardIfEmpty);
  const addPhoto = useJournalStore((s) => s.addPhoto);
  const removePhoto = useJournalStore((s) => s.removePhoto);
  const addVoiceNote = useJournalStore((s) => s.addVoiceNote);
  const removeVoiceNote = useJournalStore((s) => s.removeVoiceNote);

  // Create the entry up front so autosave always has a real record to write to.
  const idRef = useRef<string | null>(route.params.entryId ?? null);
  if (!idRef.current) {
    idRef.current = startEntry(route.params.bookId ?? '').id;
  }
  const entryId = idRef.current;

  const entry = entries[entryId];
  const book = useBooksStore((s) => (entry?.bookId ? s.byId[entry.bookId] : undefined));

  const [draft, setDraft] = useState(() => entry);
  const [showPrompts, setShowPrompts] = useState(false);
  const [emojiSheet, setEmojiSheet] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [savedFlash, setSavedFlash] = useState(false);

  // Keep the local draft in step if the record is replaced from elsewhere.
  useEffect(() => {
    if (entry && !draft) setDraft(entry);
  }, [entry, draft]);

  const patch = useCallback((changes: Partial<JournalEntry>) => {
    setDraft((current) => (current ? { ...current, ...changes } : current));
  }, []);

  // The promise of the app: you never press save.
  useAutosave(
    draft,
    (value) => {
      if (!value) return;
      const { id, createdAt, updatedAt, draft: isDraft, ...rest } = value;
      save(entryId, rest);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1400);
    },
    700,
  );

  useEffect(
    () => () => {
      // Nothing typed? Do not leave an empty page behind.
      discardIfEmpty(entryId);
    },
    [discardIfEmpty, entryId],
  );

  const pickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Photos are locked', 'Marginalia needs permission to open your photo library.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.75,
      allowsMultipleSelection: true,
      selectionLimit: 6,
    });
    if (result.canceled) return;
    result.assets.forEach((asset) => addPhoto(entryId, asset.uri));
    haptics.settle();
  };

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Camera is locked', 'Marginalia needs permission to use the camera.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.75 });
    if (result.canceled) return;
    result.assets.forEach((asset) => addPhoto(entryId, asset.uri));
    haptics.settle();
  };

  const addTag = () => {
    const tag = tagInput.trim().replace(/^#/, '').toLowerCase();
    if (!tag || draft?.tags.includes(tag)) {
      setTagInput('');
      return;
    }
    patch({ tags: [...(draft?.tags ?? []), tag] });
    setTagInput('');
    haptics.select();
  };

  const confirmDelete = () => {
    Alert.alert('Tear out this page?', 'This entry will be gone for good.', [
      { text: 'Keep it', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          removeEntry(entryId);
          haptics.warn();
          navigation.goBack();
        },
      },
    ]);
  };

  const promptsFilled = useMemo(
    () => PROMPTS.filter((p) => Boolean((draft?.[p.key] as string | undefined)?.trim())).length,
    [draft],
  );

  if (!draft) {
    return (
      <Screen edges={['top']}>
        <View style={styles.centered}>
          <Text tone="inkFaint">That entry is no longer here.</Text>
        </View>
      </Screen>
    );
  }

  const currentMood = MOODS.find((m) => m.id === draft.mood);

  return (
    <Screen edges={['top']} ambience={false}>
      <View style={[styles.topBar, { paddingHorizontal: theme.space.lg }]}>
        <IconButton name="chevron-down" label="Close" onPress={() => navigation.goBack()} />
        <View style={{ flex: 1, alignItems: 'center' }}>
          <SavedIndicator visible={savedFlash} />
        </View>
        <IconButton name="trash-outline" label="Delete entry" onPress={confirmDelete} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
        keyboardVerticalOffset={8}
      >
        <ScrollView
          contentContainerStyle={{ padding: theme.space.lg, paddingBottom: 90 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Which book, and when */}
          {book ? (
            <Pressable
              onPress={() => navigation.navigate('BookDetail', { bookId: book.id })}
              style={[styles.bookRow, { marginBottom: theme.space.lg }]}
            >
              <BookCover book={book} size="xs" />
              <View style={{ flex: 1, marginLeft: theme.space.md }}>
                <Text variant="bodyStrong" tone="ink" numberOfLines={1}>
                  {book.title}
                </Text>
                <Text variant="caption" tone="inkFaint">
                  {prettyDate(draft.date)} · {prettyTime(draft.createdAt)}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={theme.colors.inkFaint} />
            </Pressable>
          ) : (
            <Text variant="caption" tone="inkFaint" style={{ marginBottom: theme.space.lg }}>
              {prettyDate(draft.date)}
            </Text>
          )}

          {/* Title */}
          <TextField
            placeholder="Give this page a name (optional)"
            value={draft.title ?? ''}
            onChangeText={(value) => patch({ title: value })}
            style={{ ...theme.type.heading, fontFamily: 'Lora_600SemiBold' }}
          />

          {/* Mood */}
          <Text variant="label" caps tone="inkFaint" style={{ marginTop: theme.space.xl, marginBottom: theme.space.sm }}>
            How did it leave you?
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {MOODS.map((m) => (
              <Chip
                key={m.id}
                label={`${m.emoji} ${m.label}`}
                tint={m.hue}
                selected={draft.mood === m.id}
                onPress={() => {
                  patch({ mood: draft.mood === m.id ? undefined : (m.id as Mood) });
                  haptics.select();
                }}
              />
            ))}
          </ScrollView>

          {/* The page itself */}
          <View style={{ marginTop: theme.space.xl }}>
            <View style={styles.writeHeader}>
              <Text variant="label" caps tone="inkFaint">
                The entry
              </Text>
              <Pressable onPress={() => setEmojiSheet(true)} haptic="select" style={styles.emojiButton}>
                <Text variant="body">{draft.emoji ?? '🙂'}</Text>
                <Ionicons name="chevron-down" size={12} color={theme.colors.inkFaint} style={{ marginLeft: 2 }} />
              </Pressable>
            </View>

            <RuledPaper>
              <TextField
                placeholder="What happened, what you felt, what you want to remember…"
                value={draft.text}
                onChangeText={(value) => patch({ text: value })}
                handwritten
                auto
                multiline
                style={{ minHeight: 220, lineHeight: 30 }}
                containerStyle={{ backgroundColor: 'transparent' }}
              />
            </RuledPaper>

            <Text variant="caption" tone="inkFaint" align="right" style={{ marginTop: 4 }}>
              {draft.text.trim().split(/\s+/).filter(Boolean).length} words
            </Text>
          </View>

          {/* Photos */}
          <View style={{ marginTop: theme.space.xl }}>
            <View style={styles.writeHeader}>
              <Text variant="label" caps tone="inkFaint">
                Photographs
              </Text>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <SmallButton icon="camera-outline" label="Camera" onPress={takePhoto} />
                <SmallButton icon="images-outline" label="Library" onPress={pickPhoto} />
              </View>
            </View>

            {draft.photos.length ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                {draft.photos.map((uri) => (
                  <Animated.View key={uri} entering={FadeIn.duration(250)} exiting={FadeOut.duration(180)}>
                    <View style={[styles.polaroid, { backgroundColor: theme.colors.paperRaised, borderRadius: 4 }, theme.elevation(2)]}>
                      <Image source={{ uri }} style={styles.photo} contentFit="cover" cachePolicy="disk" />
                      <Pressable
                        onPress={() => removePhoto(entryId, uri)}
                        scaleTo={0.85}
                        accessibilityLabel="Remove photo"
                        style={[styles.removePhoto, { backgroundColor: withAlpha(theme.colors.canvas, 0.9) }]}
                      >
                        <Ionicons name="close" size={13} color={theme.colors.ink} />
                      </Pressable>
                    </View>
                  </Animated.View>
                ))}
              </ScrollView>
            ) : (
              <Text variant="small" tone="inkFaint">
                A photo of the page, the cover, the café. Whatever you were looking at.
              </Text>
            )}
          </View>

          {/* Voice notes */}
          <View style={{ marginTop: theme.space.xl }}>
            <Text variant="label" caps tone="inkFaint" style={{ marginBottom: theme.space.sm }}>
              Voice notes
            </Text>
            <Card sunken>
              <VoiceNoteRecorder onRecorded={(note) => addVoiceNote(entryId, note)} />

              {draft.voiceNotes.length ? (
                <View style={{ marginTop: theme.space.lg, gap: theme.space.sm }}>
                  {draft.voiceNotes.map((note) => (
                    <VoiceNoteRow
                      key={note.uri}
                      uri={note.uri}
                      durationMs={note.durationMs}
                      onDelete={() => removeVoiceNote(entryId, note.uri)}
                    />
                  ))}
                </View>
              ) : null}
            </Card>
          </View>

          {/* Optional prompts */}
          <Ornament />

          <Pressable
            onPress={() => setShowPrompts((v) => !v)}
            style={styles.promptToggle}
            accessibilityRole="button"
          >
            <Ionicons
              name={showPrompts ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={theme.colors.accent}
            />
            <Text variant="bodyStrong" tone="accent" style={{ marginLeft: 6 }}>
              {showPrompts ? 'Fewer questions' : 'A few more things'}
            </Text>
            {promptsFilled && !showPrompts ? (
              <Text variant="caption" tone="inkFaint" style={{ marginLeft: 8 }}>
                {promptsFilled} filled in
              </Text>
            ) : null}
          </Pressable>

          {showPrompts ? (
            <Animated.View entering={FadeIn.duration(260)} style={{ marginTop: theme.space.lg, gap: theme.space.lg }}>
              {PROMPTS.map((prompt) => (
                <TextField
                  key={prompt.key as string}
                  label={prompt.label}
                  placeholder={prompt.placeholder}
                  value={(draft[prompt.key] as string | undefined) ?? ''}
                  onChangeText={(value) => patch({ [prompt.key]: value } as Partial<JournalEntry>)}
                  multiline={prompt.multiline}
                  auto={prompt.multiline}
                  style={prompt.multiline ? { minHeight: 76 } : undefined}
                />
              ))}

              <TextField
                label="Page"
                placeholder="Where were you?"
                value={draft.pageRef ? String(draft.pageRef) : ''}
                onChangeText={(value) => {
                  const parsed = Number.parseInt(value, 10);
                  patch({ pageRef: Number.isFinite(parsed) ? parsed : undefined });
                }}
                keyboardType="number-pad"
              />
            </Animated.View>
          ) : null}

          {/* Tags */}
          <Divider style={{ marginVertical: theme.space.xl }} />

          <Text variant="label" caps tone="inkFaint" style={{ marginBottom: theme.space.sm }}>
            Tags
          </Text>
          <View style={[styles.tags, { marginBottom: draft.tags.length ? theme.space.md : 0 }]}>
            {draft.tags.map((tag) => (
              <Chip
                key={tag}
                label={`#${tag}`}
                selected
                onPress={() => patch({ tags: draft.tags.filter((t) => t !== tag) })}
              />
            ))}
          </View>
          <TextField
            placeholder="comfort-read, cried-on-the-bus, autumn…"
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
            {isEntryEmpty(draft)
              ? 'This page is blank — it will not be kept unless you write something.'
              : 'Everything here saves itself as you go.'}
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>

      <Sheet visible={emojiSheet} onClose={() => setEmojiSheet(false)} title="Mark the page">
        <View style={[styles.emojiGrid, { paddingBottom: theme.space.xl }]}>
          {JOURNAL_EMOJI.map((emoji) => (
            <Pressable
              key={emoji}
              onPress={() => {
                patch({ emoji: draft.emoji === emoji ? undefined : emoji });
                setEmojiSheet(false);
              }}
              haptic="select"
              scaleTo={0.85}
              style={[
                styles.emojiCell,
                {
                  backgroundColor:
                    draft.emoji === emoji ? withAlpha(theme.colors.accent, 0.16) : 'transparent',
                  borderRadius: theme.radius.md,
                },
              ]}
            >
              <Text variant="heading">{emoji}</Text>
            </Pressable>
          ))}
        </View>
      </Sheet>
    </Screen>
  );
}

/** "Saved" fades in for a moment after each autosave, then gets out of the way. */
function SavedIndicator({ visible }: { visible: boolean }) {
  const theme = useTheme();
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withTiming(visible ? 1 : 0, { duration: 220 });
  }, [visible, opacity]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View style={[styles.saved, style]}>
      <Ionicons name="checkmark-circle" size={13} color={theme.colors.success} />
      <Text variant="caption" tone="inkFaint" style={{ marginLeft: 4 }}>
        Saved
      </Text>
    </Animated.View>
  );
}

/** Faint ruled lines behind the writing area, like a real notebook. */
function RuledPaper({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.ruled,
        {
          backgroundColor: withAlpha(theme.colors.paper, theme.isDark ? 0.5 : 0.8),
          borderRadius: theme.radius.md,
          borderColor: withAlpha(theme.colors.rule, 0.9),
        },
      ]}
    >
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {Array.from({ length: 14 }, (_, i) => (
          <View
            key={i}
            style={{
              position: 'absolute',
              top: 44 + i * 30,
              left: 14,
              right: 14,
              height: StyleSheet.hairlineWidth,
              backgroundColor: withAlpha(theme.colors.rule, 0.7),
            }}
          />
        ))}
        {/* the red margin line down the left */}
        <View
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: 30,
            width: StyleSheet.hairlineWidth,
            backgroundColor: withAlpha(theme.colors.danger, 0.28),
          }}
        />
      </View>
      {children}
    </View>
  );
}

function SmallButton({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      haptic="select"
      scaleTo={0.93}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[
        styles.smallButton,
        { backgroundColor: withAlpha(theme.colors.accent, 0.1), borderRadius: theme.radius.pill },
      ]}
    >
      <Ionicons name={icon} size={13} color={theme.colors.accent} />
      <Text variant="caption" tone="accent" style={{ marginLeft: 4, fontFamily: 'Karla_700Bold' }}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingBottom: 4 },
  saved: { flexDirection: 'row', alignItems: 'center' },
  bookRow: { flexDirection: 'row', alignItems: 'center' },
  writeHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  emojiButton: { flexDirection: 'row', alignItems: 'center' },
  ruled: { borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden', paddingLeft: 12 },
  polaroid: { padding: 6, paddingBottom: 14 },
  photo: { width: 112, height: 112, borderRadius: 2 },
  removePhoto: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promptToggle: { flexDirection: 'row', alignItems: 'center', alignSelf: 'center' },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  smallButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5 },
  emojiGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  emojiCell: { width: '18%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
});
