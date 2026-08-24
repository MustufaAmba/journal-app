import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Screen } from '@/components/Screen';
import { Text, SectionLabel } from '@/components/Text';
import { Card } from '@/components/Card';
import { Header } from '@/components/Header';
import { Button } from '@/components/Button';
import { Pressable } from '@/components/Pressable';
import { EmptyState } from '@/components/EmptyState';
import { BookCover } from '@/components/BookCover';
import { JournalEntryCard } from '@/screens/journal/JournalEntryCard';
import { Ornament } from '@/components/Divider';

import { useTheme } from '@/theme/ThemeProvider';
import { useAnniversaries, useThisDayInReading } from '@/hooks/useAnniversaries';
import { useCelebration } from '@/components/CelebrationProvider';
import { useLibraryStore } from '@/store/useLibraryStore';
import { prettyDate, format, todayKey } from '@/lib/date';
import { withAlpha } from '@/lib/color';
import type { RootStackParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

/**
 * "This day in reading" — the feature that makes the app better the longer it
 * is kept. Anniversaries of books finished, and journal entries written on
 * this date in previous years.
 */
export function ThisDayScreen() {
  const theme = useTheme();
  const navigation = useNavigation<Nav>();
  const { celebrate } = useCelebration();

  const [today] = useState(() => new Date());
  const anniversaries = useAnniversaries(today);
  const memories = useThisDayInReading(today);
  const markCelebrated = useLibraryStore((s) => s.markCelebrated);

  const isEmpty = !anniversaries.length && !memories.length;
  const dateLabel = useMemo(() => format(today, 'd MMMM'), [today]);

  return (
    <Screen edges={['top', 'bottom']}>
      <Header title="This day in reading" subtitle={dateLabel} back />

      {isEmpty ? (
        <EmptyState
          illustration="tea"
          title={`Nothing from ${dateLabel} yet`}
          message="Once you have been keeping this journal for a year, today will start showing you what you were reading a year ago. It is worth the wait."
          actionLabel="Back to the journal"
          onAction={() => navigation.goBack()}
        />
      ) : (
        <ScrollView contentContainerStyle={{ padding: theme.space.lg, paddingBottom: 130 }} showsVerticalScrollIndicator={false}>
          {anniversaries.length ? (
            <>
              <SectionLabel>Reading anniversaries</SectionLabel>
              {anniversaries.map(({ book, entry, yearsAgo }, index) => (
                <Animated.View
                  key={entry.id}
                  entering={theme.calm ? undefined : FadeInDown.delay(index * 80).duration(440)}
                  style={{ marginBottom: theme.space.md }}
                >
                  <Card ribbon ribbonColor={theme.colors.gild} style={{ paddingLeft: theme.space.xl }}>
                    <View style={styles.row}>
                      <BookCover book={book} size="sm" />
                      <View style={{ flex: 1, marginLeft: theme.space.lg }}>
                        <Text variant="label" caps tone="gild">
                          {yearsAgo === 1 ? 'One year ago today' : `${yearsAgo} years ago today`}
                        </Text>
                        <Text
                          variant="subheading"
                          tone="ink"
                          numberOfLines={2}
                          style={{ marginTop: 2, fontFamily: 'Lora_600SemiBold' }}
                        >
                          {book.title}
                        </Text>
                        {book.authors[0] ? (
                          <Text variant="caption" tone="inkFaint" numberOfLines={1}>
                            {book.authors[0]}
                          </Text>
                        ) : null}
                        <Text variant="caption" tone="inkFaint" style={{ marginTop: 4 }}>
                          Finished {prettyDate(entry.finishedAt!)}
                        </Text>
                      </View>
                    </View>

                    <View style={[styles.actions, { marginTop: theme.space.lg }]}>
                      <Button
                        label="Mark the occasion"
                        size="sm"
                        onPress={() => {
                          markCelebrated(entry.id, todayKey(today));
                          celebrate({
                            eyebrow: yearsAgo === 1 ? 'One year ago today' : `${yearsAgo} years ago today`,
                            title: book.title,
                            message:
                              'You finished this on this very date. Whatever it gave you, it is still yours.',
                            actionLabel: 'Write about it again',
                            onAction: () => navigation.navigate('JournalEntry', { bookId: book.id }),
                          });
                        }}
                      />
                      <Button
                        label="Open"
                        size="sm"
                        variant="secondary"
                        onPress={() => navigation.navigate('BookDetail', { bookId: book.id, entryId: entry.id })}
                      />
                    </View>
                  </Card>
                </Animated.View>
              ))}
            </>
          ) : null}

          {memories.length ? (
            <>
              {anniversaries.length ? <Ornament /> : null}
              <SectionLabel>What you wrote</SectionLabel>
              {memories.map(({ entry, book, yearsAgo }, index) => (
                <Animated.View
                  key={entry.id}
                  entering={theme.calm ? undefined : FadeInDown.delay(index * 80).duration(440)}
                  style={{ marginBottom: theme.space.md }}
                >
                  <View style={[styles.yearTag, { backgroundColor: withAlpha(theme.colors.accent, 0.1), borderRadius: theme.radius.pill }]}>
                    <Ionicons name="time-outline" size={12} color={theme.colors.accent} />
                    <Text variant="caption" tone="accent" style={{ marginLeft: 4, fontFamily: 'Karla_700Bold' }}>
                      {yearsAgo === 1 ? 'a year ago' : `${yearsAgo} years ago`}
                      {book ? ` · ${book.title}` : ''}
                    </Text>
                  </View>
                  <JournalEntryCard
                    entry={entry}
                    showBook
                    onPress={() => navigation.navigate('JournalEntry', { entryId: entry.id })}
                  />
                </Animated.View>
              ))}
            </>
          ) : null}

          <Pressable onPress={() => navigation.navigate('Tabs', { screen: 'Journal' })} style={{ marginTop: theme.space.lg }}>
            <Text variant="small" tone="accent" align="center">
              Read the whole journal
            </Text>
          </Pressable>
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  actions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  yearTag: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 6,
  },
});
