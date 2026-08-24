import React, { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { Card } from '@/components/Card';
import { Header } from '@/components/Header';
import { Button } from '@/components/Button';
import { Pressable } from '@/components/Pressable';
import { Divider } from '@/components/Divider';
import { EmptyState } from '@/components/EmptyState';
import { Heatmap } from '@/components/Heatmap';
import { LogProgressSheet } from '@/components/LogProgressSheet';
import { BookCover } from '@/components/BookCover';

import { useTheme } from '@/theme/ThemeProvider';
import { useBooksStore } from '@/store/useBooksStore';
import { useLibraryStore } from '@/store/useLibraryStore';
import { useSessionsStore, sessionsForBook, pagesIn, heatmapData } from '@/store/useSessionsStore';
import { prettyDate, duration } from '@/lib/date';
import { haptics } from '@/lib/haptics';
import type { RootStackParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'ReadingLog'>;

/** Every sitting with one book, newest first, with a heatmap of the whole run. */
export function ReadingLogScreen() {
  const theme = useTheme();
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();

  const book = useBooksStore((s) => s.byId[route.params.bookId]);
  const entries = useLibraryStore((s) => s.entries);
  const sessions = useSessionsStore((s) => s.sessions);
  const removeSession = useSessionsStore((s) => s.remove);

  const [logging, setLogging] = useState(false);

  const entry = useMemo(
    () => Object.values(entries).find((e) => e.bookId === route.params.bookId),
    [entries, route.params.bookId],
  );

  const bookSessions = useMemo(
    () => sessionsForBook(sessions, route.params.bookId),
    [sessions, route.params.bookId],
  );

  const bookOnly = useMemo(() => {
    const filtered: typeof sessions = {};
    Object.entries(sessions).forEach(([id, session]) => {
      if (session.bookId === route.params.bookId) filtered[id] = session;
    });
    return filtered;
  }, [sessions, route.params.bookId]);

  const totals = useMemo(
    () =>
      bookSessions.reduce(
        (acc, session) => ({
          pages: acc.pages + pagesIn(session),
          minutes: acc.minutes + session.minutes,
        }),
        { pages: 0, minutes: 0 },
      ),
    [bookSessions],
  );

  const confirmDelete = (id: string) => {
    Alert.alert('Remove this session?', 'The pages will come off your totals.', [
      { text: 'Keep it', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          removeSession(id);
          haptics.warn();
        },
      },
    ]);
  };

  if (!book) {
    return (
      <Screen edges={['top', 'bottom']}>
        <Header title="Reading log" back />
        <EmptyState illustration="shelf" title="That book is not here" />
      </Screen>
    );
  }

  return (
    <Screen edges={['top', 'bottom']}>
      <Header title="Reading log" subtitle={book.title} back />

      <ScrollView contentContainerStyle={{ padding: theme.space.lg, paddingBottom: 120 }}>
        <Card>
          <View style={styles.summary}>
            <BookCover book={book} size="sm" />
            <View style={{ flex: 1, marginLeft: theme.space.lg }}>
              <Text variant="subheading" tone="ink" numberOfLines={2} style={{ fontFamily: 'Lora_600SemiBold' }}>
                {book.title}
              </Text>
              <View style={[styles.statsRow, { marginTop: theme.space.sm }]}>
                <Stat label="sittings" value={String(bookSessions.length)} />
                <Stat label="pages" value={String(totals.pages)} />
                <Stat label="read" value={totals.minutes ? duration(totals.minutes) : '—'} />
              </View>
            </View>
          </View>
        </Card>

        {bookSessions.length ? (
          <>
            <Text variant="label" caps tone="inkFaint" style={{ marginTop: theme.space.xl, marginBottom: theme.space.sm }}>
              When you read it
            </Text>
            <Card>
              <Heatmap data={heatmapData(bookOnly, 126)} />
            </Card>

            <Text variant="label" caps tone="inkFaint" style={{ marginTop: theme.space.xl, marginBottom: theme.space.sm }}>
              Every sitting
            </Text>
            <Card padded={false}>
              {bookSessions.map((session, index) => (
                <View key={session.id}>
                  {index > 0 ? <Divider inset={theme.space.lg} /> : null}
                  <View style={[styles.sessionRow, { padding: theme.space.lg }]}>
                    <View style={{ flex: 1 }}>
                      <Text variant="bodyStrong" tone="ink">
                        {prettyDate(session.date)}
                      </Text>
                      <Text variant="caption" tone="inkFaint">
                        {`pages ${session.startPage}–${session.endPage}`}
                        {session.minutes ? ` · ${duration(session.minutes)}` : ''}
                      </Text>
                    </View>
                    <Text variant="bodyStrong" tone="accent" style={{ marginRight: theme.space.md }}>
                      +{pagesIn(session)}
                    </Text>
                    <Pressable
                      onPress={() => confirmDelete(session.id)}
                      scaleTo={0.85}
                      accessibilityLabel="Remove session"
                    >
                      <Ionicons name="close-circle-outline" size={19} color={theme.colors.inkFaint} />
                    </Pressable>
                  </View>
                </View>
              ))}
            </Card>
          </>
        ) : (
          <EmptyState
            illustration="candle"
            title="Nothing logged yet"
            message="Each time you read, jot down where you got to. The heatmap and the estimates grow out of it."
          />
        )}

        <Button
          label="Log some reading"
          size="lg"
          full
          onPress={() => setLogging(true)}
          style={{ marginTop: theme.space.xl }}
        />
      </ScrollView>

      <LogProgressSheet visible={logging} onClose={() => setLogging(false)} book={book} entry={entry} />
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ marginRight: 18 }}>
      <Text variant="bodyStrong" tone="ink">
        {value}
      </Text>
      <Text variant="caption" tone="inkFaint">
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  summary: { flexDirection: 'row', alignItems: 'center' },
  statsRow: { flexDirection: 'row' },
  sessionRow: { flexDirection: 'row', alignItems: 'center' },
});
