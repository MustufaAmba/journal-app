import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Text';
import { Card } from '@/components/Card';
import { Pressable } from '@/components/Pressable';
import { BookCover } from '@/components/BookCover';
import { ProgressBar } from '@/components/ProgressRing';
import { progressOf } from '@/store/useLibraryStore';
import { readingPace } from '@/store/useSessionsStore';
import { withAlpha } from '@/lib/color';
import { friendlyDate } from '@/lib/date';
import type { Book, LibraryEntry, ReadingSession } from '@/types';

/**
 * The single most-used control in the app: the book you are in the middle of,
 * how far through you are, and a one-tap way to record that you read some more.
 */
export function ContinueReadingCard({
  book,
  entry,
  sessions,
  onOpen,
  onLogProgress,
}: {
  book: Book;
  entry: LibraryEntry;
  sessions: Record<string, ReadingSession>;
  onOpen: () => void;
  onLogProgress: () => void;
}) {
  const theme = useTheme();
  const total = entry.pageCountOverride ?? book.pageCount;
  const progress = progressOf(entry, book.pageCount);
  const remaining = total ? Math.max(0, total - entry.currentPage) : null;

  // "About four evenings left" is far friendlier than a date.
  const pace = readingPace(sessions);
  const daysLeft = remaining && pace > 1 ? Math.ceil(remaining / pace) : null;

  return (
    <Animated.View entering={theme.calm ? undefined : FadeInDown.duration(420)}>
      <Card padded={false} raise={2} style={{ marginHorizontal: theme.space.lg }}>
        <LinearGradient
          colors={[withAlpha(theme.colors.glow, theme.isDark ? 0.14 : 0.3), 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />

        <Pressable onPress={onOpen} scaleTo={0.985} accessibilityRole="button" accessibilityLabel={`Open ${book.title}`}>
          <View style={[styles.top, { padding: theme.space.lg }]}>
            <BookCover book={book} size="md" />

            <View style={[styles.info, { marginLeft: theme.space.lg }]}>
              <Text variant="label" caps tone="accent">
                Still reading
              </Text>
              <Text
                variant="heading"
                tone="ink"
                numberOfLines={2}
                style={{ marginTop: 2, fontFamily: 'Lora_600SemiBold' }}
              >
                {book.title}
              </Text>
              {book.authors[0] ? (
                <Text variant="small" tone="inkFaint" numberOfLines={1}>
                  {book.authors[0]}
                </Text>
              ) : null}

              <View style={{ marginTop: theme.space.md }}>
                <ProgressBar progress={progress / 100} height={6} />
                <View style={[styles.progressMeta, { marginTop: 6 }]}>
                  <Text variant="caption" tone="inkSoft">
                    {total ? `page ${entry.currentPage} of ${total}` : `${progress}% in`}
                  </Text>
                  <Text variant="caption" tone="inkFaint">
                    {progress}%
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </Pressable>

        <View style={[styles.footer, { borderTopColor: withAlpha(theme.colors.rule, 0.9), paddingHorizontal: theme.space.lg }]}>
          <View style={{ flex: 1 }}>
            <Text variant="caption" tone="inkFaint" numberOfLines={1}>
              {daysLeft
                ? `About ${daysLeft} ${daysLeft === 1 ? 'day' : 'days'} left at your pace`
                : remaining
                  ? `${remaining} pages to go`
                  : entry.startedAt
                    ? `Started ${friendlyDate(entry.startedAt)}`
                    : 'Just opened'}
            </Text>
          </View>

          <Pressable
            onPress={onLogProgress}
            haptic="settle"
            scaleTo={0.94}
            accessibilityRole="button"
            accessibilityLabel="Log reading progress"
            style={[
              styles.logButton,
              { backgroundColor: theme.colors.accent, borderRadius: theme.radius.pill },
            ]}
          >
            <Ionicons name="bookmark" size={13} color={theme.colors.accentInk} />
            <Text variant="caption" color={theme.colors.accentInk} style={{ marginLeft: 5, fontFamily: 'Karla_700Bold' }}>
              I read some
            </Text>
          </Pressable>
        </View>
      </Card>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row' },
  info: { flex: 1, justifyContent: 'center' },
  progressMeta: { flexDirection: 'row', justifyContent: 'space-between' },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingVertical: 10,
  },
  logButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 7 },
});
