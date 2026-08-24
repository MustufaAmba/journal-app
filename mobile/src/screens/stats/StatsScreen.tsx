import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Screen } from '@/components/Screen';
import { Text, SectionLabel } from '@/components/Text';
import { Card } from '@/components/Card';
import { Header } from '@/components/Header';
import { Chip } from '@/components/Chip';
import { Pressable } from '@/components/Pressable';
import { Divider, Ornament } from '@/components/Divider';
import { Heatmap } from '@/components/Heatmap';
import { EmptyState } from '@/components/EmptyState';
import { BookCover } from '@/components/BookCover';
import { Rating } from '@/components/Rating';
import { Sheet } from '@/components/Sheet';

import { useTheme } from '@/theme/ThemeProvider';
import { useStats } from '@/hooks/useStats';
import { useSessionsStore, totalsForDay } from '@/store/useSessionsStore';
import { duration, prettyDate } from '@/lib/date';
import { withAlpha } from '@/lib/color';
import type { RootStackParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const MONTHS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

export function StatsScreen() {
  const theme = useTheme();
  const navigation = useNavigation<Nav>();
  const { width } = useWindowDimensions();

  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState(thisYear);
  const stats = useStats(year);
  const sessions = useSessionsStore((s) => s.sessions);

  const [selectedDay, setSelectedDay] = useState<{ date: string; pages: number; minutes: number } | null>(null);

  const years = useMemo(() => {
    const found = new Set<number>([thisYear]);
    Object.values(sessions).forEach((s) => found.add(Number(s.date.slice(0, 4))));
    return Array.from(found).sort((a, b) => b - a);
  }, [sessions, thisYear]);

  const maxMonthly = Math.max(1, ...stats.monthly);
  const hasData = stats.booksFinished > 0 || stats.pagesRead > 0;

  if (!hasData) {
    return (
      <Screen edges={['top']}>
        <Header title="Statistics" back />
        <EmptyState
          illustration="bookcase"
          title="Nothing to count yet"
          message="Finish a book or log a little reading and this page fills up with heatmaps, genres and favourite authors."
        />
      </Screen>
    );
  }

  return (
    <Screen edges={['top']}>
      <Header title="Statistics" subtitle="Everything you have read, counted up" back />

      <ScrollView contentContainerStyle={{ padding: theme.space.lg, paddingBottom: 130 }} showsVerticalScrollIndicator={false}>
        {/* Headline numbers */}
        <View style={styles.tiles}>
          <Tile icon="book" label="books" value={String(stats.booksFinished)} index={0} />
          <Tile icon="document-text" label="pages" value={stats.pagesRead.toLocaleString()} index={1} />
          <Tile
            icon="time"
            label="reading"
            value={stats.hoursRead >= 1 ? `${Math.round(stats.hoursRead)}h` : duration(stats.hoursRead * 60)}
            index={2}
          />
          <Tile icon="flame" label="day streak" value={String(stats.streak)} index={3} accent />
        </View>

        {/* Heatmap */}
        <View style={{ marginTop: theme.space.xl }}>
          <SectionLabel>The last six months</SectionLabel>
          <Card>
            <Heatmap data={stats.heatmap} onSelectDay={setSelectedDay} />
            <Divider style={{ marginVertical: theme.space.lg }} />
            <View style={styles.rowBetween}>
              <Text variant="small" tone="inkFaint">
                Longest streak
              </Text>
              <Text variant="bodyStrong" tone="ink">
                {stats.bestStreak} {stats.bestStreak === 1 ? 'day' : 'days'}
              </Text>
            </View>
            <View style={[styles.rowBetween, { marginTop: 6 }]}>
              <Text variant="small" tone="inkFaint">
                Days with reading logged
              </Text>
              <Text variant="bodyStrong" tone="ink">
                {stats.daysRead}
              </Text>
            </View>
          </Card>
        </View>

        {/* Year picker + monthly bars */}
        <View style={{ marginTop: theme.space.xl }}>
          <View style={styles.yearRow}>
            <SectionLabel style={{ marginBottom: 0 }}>Pages by month</SectionLabel>
            <View style={{ flex: 1 }} />
            {years.slice(0, 4).map((y) => (
              <Chip key={y} label={String(y)} small selected={year === y} onPress={() => setYear(y)} style={{ marginLeft: 6 }} />
            ))}
          </View>

          <Card style={{ marginTop: theme.space.sm }}>
            <View style={styles.chart}>
              {stats.monthly.map((pages, index) => {
                const height = Math.max(3, (pages / maxMonthly) * 110);
                const isCurrent = year === thisYear && index === new Date().getMonth();
                return (
                  <View key={index} style={styles.barColumn}>
                    <Animated.View
                      entering={theme.calm ? undefined : FadeInDown.delay(index * 35).duration(420)}
                      style={[
                        styles.bar,
                        {
                          height,
                          backgroundColor: isCurrent ? theme.colors.accent : withAlpha(theme.colors.accent, 0.4),
                          borderRadius: 4,
                        },
                      ]}
                    />
                    <Text variant="caption" tone={isCurrent ? 'accent' : 'inkFaint'} style={{ marginTop: 5, fontSize: 10 }}>
                      {MONTHS[index]}
                    </Text>
                  </View>
                );
              })}
            </View>
            <Text variant="caption" tone="inkFaint" align="center" style={{ marginTop: theme.space.sm }}>
              {stats.monthly.reduce((a, b) => a + b, 0).toLocaleString()} pages logged in {year}
            </Text>
          </Card>
        </View>

        {/* Genres */}
        {stats.topGenres.length ? (
          <View style={{ marginTop: theme.space.xl }}>
            <SectionLabel>What you read</SectionLabel>
            <Card>
              {stats.topGenres.map((genre, index) => {
                const share = genre.count / stats.topGenres[0].count;
                return (
                  <View key={genre.name} style={{ marginBottom: index === stats.topGenres.length - 1 ? 0 : 12 }}>
                    <View style={styles.rowBetween}>
                      <Text variant="small" tone="ink" numberOfLines={1} style={{ flex: 1 }}>
                        {genre.name}
                      </Text>
                      <Text variant="caption" tone="inkFaint">
                        {genre.count}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.genreTrack,
                        { backgroundColor: withAlpha(theme.colors.rule, 1), marginTop: 5 },
                      ]}
                    >
                      <View
                        style={{
                          width: `${share * 100}%`,
                          height: '100%',
                          borderRadius: 3,
                          backgroundColor: theme.colors.accent,
                          opacity: 0.4 + share * 0.6,
                        }}
                      />
                    </View>
                  </View>
                );
              })}
            </Card>
          </View>
        ) : null}

        {/* Authors */}
        {stats.topAuthors.length ? (
          <View style={{ marginTop: theme.space.xl }}>
            <SectionLabel>Authors you keep returning to</SectionLabel>
            <Card padded={false}>
              {stats.topAuthors.map((author, index) => (
                <View key={author.name}>
                  {index > 0 ? <Divider inset={theme.space.lg} /> : null}
                  <Pressable
                    onPress={() => navigation.navigate('Search', { initialQuery: author.name, mode: 'author' })}
                    style={[styles.authorRow, { padding: theme.space.lg }]}
                  >
                    <View
                      style={[
                        styles.rank,
                        { backgroundColor: withAlpha(theme.colors.accent, 0.12), borderRadius: 15 },
                      ]}
                    >
                      <Text variant="small" tone="accent" style={{ fontFamily: 'Karla_700Bold' }}>
                        {index + 1}
                      </Text>
                    </View>
                    <Text variant="body" tone="ink" style={{ flex: 1, marginLeft: theme.space.md }} numberOfLines={1}>
                      {author.name}
                    </Text>
                    <Text variant="small" tone="inkFaint">
                      {author.count} {author.count === 1 ? 'book' : 'books'}
                    </Text>
                  </Pressable>
                </View>
              ))}
            </Card>
          </View>
        ) : null}

        {/* Curiosities */}
        <View style={{ marginTop: theme.space.xl }}>
          <Ornament />
          <SectionLabel>Odds and ends</SectionLabel>

          {stats.averageRating !== null ? (
            <Card style={{ marginBottom: theme.space.md }}>
              <View style={styles.rowBetween}>
                <View style={{ flex: 1 }}>
                  <Text variant="bodyStrong" tone="ink">
                    Average rating
                  </Text>
                  <Text variant="caption" tone="inkFaint">
                    across {stats.ratedCount} rated {stats.ratedCount === 1 ? 'book' : 'books'}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Rating value={stats.averageRating} readOnly size={15} />
                  <Text variant="caption" tone="inkFaint" style={{ marginTop: 3 }}>
                    {stats.averageRating.toFixed(1)}
                  </Text>
                </View>
              </View>
            </Card>
          ) : null}

          {stats.longestBook ? (
            <Card style={{ marginBottom: theme.space.md }} onPress={() => navigation.navigate('BookDetail', { bookId: stats.longestBook!.book.id })}>
              <View style={styles.curiosity}>
                <BookCover book={stats.longestBook.book} size="xs" />
                <View style={{ flex: 1, marginLeft: theme.space.md }}>
                  <Text variant="label" caps tone="inkFaint">
                    The longest one
                  </Text>
                  <Text variant="bodyStrong" tone="ink" numberOfLines={1}>
                    {stats.longestBook.book.title}
                  </Text>
                  <Text variant="caption" tone="inkFaint">
                    {stats.longestBook.pages} pages
                  </Text>
                </View>
              </View>
            </Card>
          ) : null}

          {stats.fastestRead ? (
            <Card onPress={() => navigation.navigate('BookDetail', { bookId: stats.fastestRead!.book.id })}>
              <View style={styles.curiosity}>
                <BookCover book={stats.fastestRead.book} size="xs" />
                <View style={{ flex: 1, marginLeft: theme.space.md }}>
                  <Text variant="label" caps tone="inkFaint">
                    Could not put it down
                  </Text>
                  <Text variant="bodyStrong" tone="ink" numberOfLines={1}>
                    {stats.fastestRead.book.title}
                  </Text>
                  <Text variant="caption" tone="inkFaint">
                    {stats.fastestRead.days} {stats.fastestRead.days === 1 ? 'day' : 'days'} start to finish
                  </Text>
                </View>
              </View>
            </Card>
          ) : null}
        </View>

        <Text variant="caption" tone="inkFaint" align="center" style={{ marginTop: theme.space.xxl }}>
          {stats.pagesFromFinished > 0
            ? `Includes ${stats.pagesFromFinished.toLocaleString()} pages estimated from finished books with no session log.`
            : 'Every number here comes from what you logged yourself.'}
        </Text>
      </ScrollView>

      <Sheet visible={Boolean(selectedDay)} onClose={() => setSelectedDay(null)} title={selectedDay ? prettyDate(selectedDay.date) : ''}>
        {selectedDay ? (
          <View style={{ paddingBottom: theme.space.xl, alignItems: 'center' }}>
            {selectedDay.pages || selectedDay.minutes ? (
              <>
                <Text variant="hero" tone="accent" style={{ fontFamily: 'Lora_600SemiBold' }}>
                  {selectedDay.pages}
                </Text>
                <Text variant="small" tone="inkFaint">
                  pages{selectedDay.minutes ? ` · ${duration(selectedDay.minutes)}` : ''}
                </Text>
              </>
            ) : (
              <Text variant="body" tone="inkFaint" align="center">
                A quiet day. Those are allowed.
              </Text>
            )}
          </View>
        ) : null}
      </Sheet>
    </Screen>
  );
}

function Tile({
  icon,
  label,
  value,
  index,
  accent,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  index: number;
  accent?: boolean;
}) {
  const theme = useTheme();
  return (
    <Animated.View
      entering={theme.calm ? undefined : FadeInDown.delay(index * 70).duration(420)}
      style={styles.tile}
    >
      <Card style={{ paddingVertical: theme.space.lg, alignItems: 'center' }}>
        <Ionicons name={icon} size={18} color={accent ? theme.colors.accent : theme.colors.inkFaint} />
        <Text variant="heading" tone="ink" style={{ marginTop: 6, fontFamily: 'Lora_600SemiBold' }}>
          {value}
        </Text>
        <Text variant="caption" tone="inkFaint">
          {label}
        </Text>
      </Card>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  tiles: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -5 },
  tile: { width: '50%', paddingHorizontal: 5, paddingBottom: 10 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  yearRow: { flexDirection: 'row', alignItems: 'center' },
  chart: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 140 },
  barColumn: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  bar: { width: 12 },
  genreTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  authorRow: { flexDirection: 'row', alignItems: 'center' },
  rank: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  curiosity: { flexDirection: 'row', alignItems: 'center' },
});
