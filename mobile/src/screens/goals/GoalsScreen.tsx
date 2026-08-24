import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { Card } from '@/components/Card';
import { Header } from '@/components/Header';
import { Button } from '@/components/Button';
import { Pressable } from '@/components/Pressable';
import { ProgressRing, ProgressBar } from '@/components/ProgressRing';
import { Divider, Ornament } from '@/components/Divider';
import { Sheet } from '@/components/Sheet';
import { TextField } from '@/components/TextField';
import { BookTile } from '@/components/BookItem';
import { Rail } from '@/components/Section';

import { useTheme } from '@/theme/ThemeProvider';
import { useGoalsStore } from '@/store/useGoalsStore';
import { useLibraryStore, finishedInYear } from '@/store/useLibraryStore';
import { useBooksStore } from '@/store/useBooksStore';
import { useSessionsStore, totalsForDay, currentStreak, dailyTotals } from '@/store/useSessionsStore';
import { goalEncouragement } from '@/data/greetings';
import { duration, format } from '@/lib/date';
import { withAlpha } from '@/lib/color';
import { haptics } from '@/lib/haptics';
import type { RootStackParamList } from '@/navigation/types';
import type { Goals } from '@/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

type EditableGoal = { key: keyof Goals; label: string; hint: string; suffix: string };

const EDITABLE: EditableGoal[] = [
  { key: 'booksPerYear', label: 'Books this year', hint: 'Twelve is one a month. Twenty-four is ambitious but kind.', suffix: 'books' },
  { key: 'booksPerMonth', label: 'Books this month', hint: 'Keep it low enough that finishing feels good.', suffix: 'books' },
  { key: 'pagesPerDay', label: 'Pages a day', hint: 'Twenty pages a day is roughly a book a month.', suffix: 'pages' },
  { key: 'minutesPerDay', label: 'Minutes a day', hint: 'Even fifteen minutes counts. It always counts.', suffix: 'minutes' },
];

export function GoalsScreen() {
  const theme = useTheme();
  const navigation = useNavigation<Nav>();

  const goals = useGoalsStore((s) => s.goals);
  const setGoals = useGoalsStore((s) => s.setGoals);
  const entries = useLibraryStore((s) => s.entries);
  const books = useBooksStore((s) => s.byId);
  const sessions = useSessionsStore((s) => s.sessions);

  const [editing, setEditing] = useState<EditableGoal | null>(null);
  const [value, setValue] = useState('');

  const year = new Date().getFullYear();
  const today = totalsForDay(sessions);
  const streak = currentStreak(sessions);

  const finishedThisYear = useMemo(() => finishedInYear(entries, year), [entries, year]);
  const finishedThisMonth = useMemo(() => {
    const now = new Date();
    return finishedThisYear.filter((e) => new Date(e.finishedAt!).getMonth() === now.getMonth());
  }, [finishedThisYear]);

  // How the year is tracking against the calendar, not just the count.
  const dayOfYear = Math.floor((Date.now() - new Date(year, 0, 1).getTime()) / 86_400_000) + 1;
  const expectedByNow = (goals.booksPerYear * dayOfYear) / 365;
  const aheadBy = finishedThisYear.length - expectedByNow;

  const daysReadThisMonth = useMemo(() => {
    const prefix = format(new Date(), 'yyyy-MM');
    return Array.from(dailyTotals(sessions).keys()).filter((key) => key.startsWith(prefix)).length;
  }, [sessions]);

  const open = (goal: EditableGoal) => {
    setEditing(goal);
    setValue(String(goals[goal.key] ?? ''));
  };

  const commit = () => {
    if (!editing) return;
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed) && parsed >= 0) {
      setGoals({ [editing.key]: parsed, year } as Partial<Goals>);
      haptics.success();
    }
    setEditing(null);
  };

  return (
    <Screen edges={['top']}>
      <Header title="Reading goals" back />

      <ScrollView contentContainerStyle={{ padding: theme.space.lg, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        {/* The year */}
        <Card raise={2} style={{ alignItems: 'center', paddingVertical: theme.space.xxl }}>
          <ProgressRing
            progress={goals.booksPerYear ? finishedThisYear.length / goals.booksPerYear : 0}
            size={168}
            thickness={13}
          >
            <Text variant="hero" tone="ink" style={{ fontFamily: 'Lora_600SemiBold' }}>
              {finishedThisYear.length}
            </Text>
            <Text variant="caption" tone="inkFaint" style={{ marginTop: -6 }}>
              of {goals.booksPerYear} books
            </Text>
          </ProgressRing>

          <Text variant="subheading" tone="ink" align="center" style={{ marginTop: theme.space.lg }}>
            {year}
          </Text>
          <Text variant="small" tone="inkFaint" align="center" style={{ marginTop: 2, maxWidth: 280 }}>
            {goals.booksPerYear === 0
              ? 'No target set — reading for its own sake.'
              : finishedThisYear.length >= goals.booksPerYear
                ? 'Goal met. Everything else this year is pure pleasure.'
                : aheadBy >= 0.5
                  ? `About ${Math.round(aheadBy)} ${Math.round(aheadBy) === 1 ? 'book' : 'books'} ahead of pace.`
                  : aheadBy <= -1
                    ? 'A little behind, which is a perfectly normal way to be.'
                    : 'Right on pace.'}
          </Text>

          <Button
            label="Change the target"
            variant="ghost"
            onPress={() => open(EDITABLE[0])}
            style={{ marginTop: theme.space.md }}
          />
        </Card>

        {/* Today */}
        <Text variant="label" caps tone="inkFaint" style={{ marginTop: theme.space.xl, marginBottom: theme.space.sm }}>
          Today
        </Text>
        <Card>
          <GoalLine
            icon="document-text-outline"
            label="Pages"
            current={today.pages}
            target={goals.pagesPerDay}
            unit="pages"
            onEdit={() => open(EDITABLE[2])}
          />
          <Divider style={{ marginVertical: theme.space.lg }} />
          <GoalLine
            icon="time-outline"
            label="Time"
            current={today.minutes}
            target={goals.minutesPerDay}
            unit="minutes"
            format={(n) => (n ? duration(n) : '0m')}
            onEdit={() => open(EDITABLE[3])}
          />

          <Text variant="small" tone="inkFaint" align="center" style={{ marginTop: theme.space.lg }}>
            {goalEncouragement(today.pages, goals.pagesPerDay)}
          </Text>
        </Card>

        {/* This month */}
        <Text variant="label" caps tone="inkFaint" style={{ marginTop: theme.space.xl, marginBottom: theme.space.sm }}>
          This month
        </Text>
        <Card>
          <GoalLine
            icon="book-outline"
            label="Books finished"
            current={finishedThisMonth.length}
            target={goals.booksPerMonth}
            unit="books"
            onEdit={() => open(EDITABLE[1])}
          />

          <Divider style={{ marginVertical: theme.space.lg }} />

          <View style={styles.rowBetween}>
            <View style={styles.rowCentre}>
              <Ionicons name="flame-outline" size={17} color={theme.colors.accent} />
              <Text variant="bodyStrong" tone="ink" style={{ marginLeft: 8 }}>
                Streak
              </Text>
            </View>
            <Text variant="bodyStrong" tone="accent">
              {streak} {streak === 1 ? 'day' : 'days'}
            </Text>
          </View>
          <Text variant="caption" tone="inkFaint" style={{ marginTop: 4 }}>
            You have read on {daysReadThisMonth} {daysReadThisMonth === 1 ? 'day' : 'days'} this month.
          </Text>
        </Card>

        {/* What you finished */}
        {finishedThisYear.length ? (
          <View style={{ marginTop: theme.space.xl, marginHorizontal: -theme.space.lg }}>
            <Ornament />
            <Text
              variant="label"
              caps
              tone="inkFaint"
              style={{ paddingHorizontal: theme.space.lg, marginBottom: theme.space.sm }}
            >
              Finished in {year}
            </Text>
            <Rail>
              {finishedThisYear
                .sort((a, b) => (b.finishedAt ?? 0) - (a.finishedAt ?? 0))
                .map((entry, index) => {
                  const book = books[entry.bookId];
                  if (!book) return null;
                  return (
                    <BookTile
                      key={entry.id}
                      book={book}
                      entry={entry}
                      index={index}
                      size="sm"
                      onPress={() => navigation.navigate('BookDetail', { bookId: book.id, entryId: entry.id })}
                    />
                  );
                })}
            </Rail>
          </View>
        ) : null}

        <Button
          label="See the full statistics"
          variant="secondary"
          full
          style={{ marginTop: theme.space.xxl }}
          onPress={() => navigation.navigate('Stats')}
        />

        <Text variant="caption" tone="inkFaint" align="center" style={{ marginTop: theme.space.lg }}>
          Goals here are only ever an invitation. Missing one costs you nothing at all.
        </Text>
      </ScrollView>

      <Sheet visible={Boolean(editing)} onClose={() => setEditing(null)} title={editing?.label}>
        {editing ? (
          <View style={{ paddingBottom: theme.space.lg }}>
            <Text variant="small" tone="inkFaint" align="center" style={{ marginBottom: theme.space.lg }}>
              {editing.hint}
            </Text>
            <TextField
              value={value}
              onChangeText={setValue}
              keyboardType="number-pad"
              autoFocus
              selectTextOnFocus
              style={{ ...theme.type.title, textAlign: 'center' }}
              hint={editing.suffix}
            />
            <Button label="Set it" size="lg" full onPress={commit} style={{ marginTop: theme.space.lg }} />
            <Button
              label="No target at all"
              variant="ghost"
              full
              style={{ marginTop: theme.space.xs }}
              onPress={() => {
                setValue('0');
                setGoals({ [editing.key]: 0 } as Partial<Goals>);
                setEditing(null);
              }}
            />
          </View>
        ) : null}
      </Sheet>
    </Screen>
  );
}

function GoalLine({
  icon,
  label,
  current,
  target,
  unit,
  format: formatValue,
  onEdit,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  current: number;
  target: number;
  unit: string;
  format?: (value: number) => string;
  onEdit: () => void;
}) {
  const theme = useTheme();
  const display = formatValue ?? ((n: number) => String(n));
  const met = target > 0 && current >= target;

  return (
    <Pressable onPress={onEdit} accessibilityRole="button" accessibilityLabel={`Change ${label} goal`}>
      <View style={styles.rowBetween}>
        <View style={styles.rowCentre}>
          <Ionicons name={icon} size={17} color={met ? theme.colors.success : theme.colors.inkFaint} />
          <Text variant="bodyStrong" tone="ink" style={{ marginLeft: 8 }}>
            {label}
          </Text>
        </View>
        <View style={styles.rowCentre}>
          <Text variant="bodyStrong" color={met ? theme.colors.success : theme.colors.ink}>
            {display(current)}
          </Text>
          <Text variant="small" tone="inkFaint">
            {target > 0 ? ` / ${display(target)}` : ` ${unit}`}
          </Text>
          <Ionicons
            name="chevron-forward"
            size={14}
            color={withAlpha(theme.colors.inkFaint, 0.7)}
            style={{ marginLeft: 4 }}
          />
        </View>
      </View>
      {target > 0 ? <ProgressBar progress={current / target} height={5} style={{ marginTop: 8 }} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowCentre: { flexDirection: 'row', alignItems: 'center' },
});
