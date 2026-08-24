import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from './Text';
import { Sheet } from './Sheet';
import { Button } from './Button';
import { TextField } from './TextField';
import { Chip } from './Chip';
import { Pressable } from './Pressable';
import { ProgressBar } from './ProgressRing';
import { useLibraryStore, progressOf } from '@/store/useLibraryStore';
import { useSessionsStore } from '@/store/useSessionsStore';
import { useCelebration } from './CelebrationProvider';
import { haptics } from '@/lib/haptics';
import { withAlpha } from '@/lib/color';
import type { Book, LibraryEntry } from '@/types';

const MINUTE_PRESETS = [10, 20, 30, 45, 60, 90];

/**
 * "I read some." One sheet, two numbers, done.
 *
 * Keeping this friction-free is the difference between a reading tracker that
 * gets used every night and one that gets used twice.
 */
export function LogProgressSheet({
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
  const { celebrate } = useCelebration();
  const setProgress = useLibraryStore((s) => s.setProgress);
  const finishReading = useLibraryStore((s) => s.finishReading);
  const log = useSessionsStore((s) => s.log);

  const total = entry?.pageCountOverride ?? book?.pageCount;
  const startPage = entry?.currentPage ?? 0;

  const [page, setPage] = useState(String(startPage));
  const [minutes, setMinutes] = useState<number | null>(null);

  useEffect(() => {
    if (visible) {
      setPage(String(startPage));
      setMinutes(null);
    }
  }, [visible, startPage]);

  const parsed = Number.parseInt(page, 10);
  const endPage = Number.isFinite(parsed) ? Math.max(0, parsed) : startPage;
  const pagesRead = Math.max(0, endPage - startPage);
  const wouldFinish = Boolean(total && endPage >= total);

  const preview = useMemo(() => {
    if (!entry) return 0;
    return progressOf({ ...entry, currentPage: endPage }, book?.pageCount) / 100;
  }, [entry, endPage, book?.pageCount]);

  const submit = () => {
    if (!entry || !book) return;

    if (pagesRead > 0 || minutes) {
      log({
        bookId: book.id,
        startPage,
        endPage: Math.max(startPage, endPage),
        minutes: minutes ?? 0,
      });
    }

    if (wouldFinish) {
      finishReading(entry.id);
      haptics.success();
      celebrate({
        eyebrow: 'Finished',
        title: book.title,
        message: 'Closed, and kept. Would you like to write down what it was like?',
      });
    } else {
      setProgress(entry.id, endPage);
      haptics.settle();
    }

    onClose();
  };

  if (!book || !entry) return null;

  return (
    <Sheet visible={visible} onClose={onClose} title="How far did you get?">
      <View style={{ paddingBottom: theme.space.lg }}>
        <Text variant="small" tone="inkFaint" align="center" style={{ marginBottom: theme.space.lg }}>
          {book.title}
        </Text>

        <View style={styles.pageRow}>
          <Stepper icon="remove" onPress={() => setPage(String(Math.max(0, endPage - 1)))} />

          <View style={styles.pageInput}>
            <TextField
              value={page}
              onChangeText={setPage}
              keyboardType="number-pad"
              selectTextOnFocus
              style={{ ...theme.type.title, textAlign: 'center' }}
              containerStyle={{ minWidth: 130 }}
            />
            <Text variant="caption" tone="inkFaint" align="center" style={{ marginTop: 4 }}>
              {total ? `of ${total} pages` : 'page number'}
            </Text>
          </View>

          <Stepper icon="add" onPress={() => setPage(String(endPage + 1))} />
        </View>

        <View style={{ marginTop: theme.space.lg }}>
          <ProgressBar progress={preview} height={7} />
          <View style={styles.between}>
            <Text variant="caption" tone="inkFaint" style={{ marginTop: 6 }}>
              {pagesRead > 0 ? `+${pagesRead} pages this sitting` : 'no new pages yet'}
            </Text>
            <Text variant="caption" tone="accent" style={{ marginTop: 6 }}>
              {Math.round(preview * 100)}%
            </Text>
          </View>
        </View>

        <Text variant="label" caps tone="inkFaint" style={{ marginTop: theme.space.xl, marginBottom: theme.space.sm }}>
          How long, roughly?
        </Text>
        <View style={styles.chips}>
          {MINUTE_PRESETS.map((value) => (
            <Chip
              key={value}
              label={`${value}m`}
              selected={minutes === value}
              onPress={() => setMinutes(minutes === value ? null : value)}
            />
          ))}
        </View>

        {wouldFinish ? (
          <View
            style={[
              styles.finishNote,
              {
                backgroundColor: withAlpha(theme.colors.success, 0.12),
                borderRadius: theme.radius.md,
                marginTop: theme.space.lg,
                padding: theme.space.md,
              },
            ]}
          >
            <Ionicons name="sparkles-outline" size={16} color={theme.colors.success} />
            <Text variant="small" tone="inkSoft" style={{ marginLeft: 8, flex: 1 }}>
              That is the last page — saving this will move it to Finished.
            </Text>
          </View>
        ) : null}

        <Button
          label={wouldFinish ? 'Finish the book' : 'Save'}
          size="lg"
          full
          onPress={submit}
          style={{ marginTop: theme.space.xl }}
        />
      </View>
    </Sheet>
  );
}

function Stepper({ icon, onPress }: { icon: 'add' | 'remove'; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      haptic="select"
      scaleTo={0.88}
      accessibilityRole="button"
      accessibilityLabel={icon === 'add' ? 'One page more' : 'One page fewer'}
      style={[
        styles.stepper,
        {
          backgroundColor: withAlpha(theme.colors.accentSoft, theme.isDark ? 0.5 : 1),
          borderColor: withAlpha(theme.colors.accent, 0.25),
        },
      ]}
    >
      <Ionicons name={icon} size={20} color={theme.colors.accent} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pageRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14 },
  pageInput: { minWidth: 130 },
  stepper: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  between: { flexDirection: 'row', justifyContent: 'space-between' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  finishNote: { flexDirection: 'row', alignItems: 'center' },
});
