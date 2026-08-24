import React from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Screen } from '@/components/Screen';
import { Text, SectionLabel } from '@/components/Text';
import { Card } from '@/components/Card';
import { Header } from '@/components/Header';
import { Button } from '@/components/Button';
import { BookTile } from '@/components/BookItem';
import { EmptyState } from '@/components/EmptyState';
import { Ornament } from '@/components/Divider';

import { useTheme } from '@/theme/ThemeProvider';
import { useAuthorDetail } from '@/hooks/useBookSearch';
import { withAlpha } from '@/lib/color';
import type { RootStackParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'Author'>;

export function AuthorScreen() {
  const theme = useTheme();
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();

  const { data: author, isLoading, isError } = useAuthorDetail(route.params.authorKey);
  const name = author?.name ?? route.params.name ?? 'The author';

  const lifespan = [author?.birthDate, author?.deathDate].filter(Boolean).join(' – ');

  return (
    <Screen edges={['top']}>
      <Header title={name} back />

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={theme.colors.accent} />
        </View>
      ) : isError || !author ? (
        <EmptyState
          illustration="window"
          title="Could not fetch the author"
          message="Open Library did not answer. Their books are still findable by name."
          actionLabel="Search their books"
          onAction={() => navigation.replace('Search', { initialQuery: name, mode: 'author' })}
        />
      ) : (
        <ScrollView contentContainerStyle={{ padding: theme.space.lg, paddingBottom: 120 }}>
          <View style={styles.header}>
            {author.photoUrl ? (
              <Image
                source={{ uri: author.photoUrl }}
                style={[styles.portrait, { borderColor: withAlpha(theme.colors.gild, 0.5) }]}
                contentFit="cover"
                transition={240}
                cachePolicy="disk"
              />
            ) : (
              <View
                style={[
                  styles.portrait,
                  styles.portraitFallback,
                  { backgroundColor: withAlpha(theme.colors.accent, 0.15), borderColor: withAlpha(theme.colors.gild, 0.4) },
                ]}
              >
                <Text variant="hero" tone="accent">
                  {name.charAt(0)}
                </Text>
              </View>
            )}

            <Text variant="title" tone="ink" align="center" style={{ marginTop: theme.space.lg }}>
              {name}
            </Text>
            {lifespan ? (
              <Text variant="small" tone="inkFaint" align="center" italic>
                {lifespan}
              </Text>
            ) : null}
          </View>

          {author.bio ? (
            <View style={{ marginTop: theme.space.xl }}>
              <SectionLabel>About</SectionLabel>
              <Card>
                <Text variant="body" tone="inkSoft">
                  {author.bio.replace(/\(\[source\]\[\d+\]\).*/s, '').trim()}
                </Text>
              </Card>
            </View>
          ) : null}

          {author.topWorks?.length ? (
            <View style={{ marginTop: theme.space.xl }}>
              <Ornament />
              <SectionLabel>Their books</SectionLabel>
              <View style={styles.grid}>
                {author.topWorks.map((work, index) => (
                  <View key={work.id} style={{ width: '31%', marginBottom: theme.space.lg }}>
                    <BookTile
                      book={{ id: work.id, title: work.title, authors: [name], genres: [], coverUrl: work.coverUrl }}
                      index={index}
                      width={undefined}
                      style={{ width: '100%' }}
                      onPress={() => navigation.push('BookDetail', { bookId: work.id })}
                    />
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          <Button
            label="Search everything by this author"
            variant="secondary"
            full
            style={{ marginTop: theme.space.lg }}
            onPress={() => navigation.navigate('Search', { initialQuery: name, mode: 'author' })}
          />
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { alignItems: 'center', paddingTop: 8 },
  portrait: { width: 118, height: 118, borderRadius: 59, borderWidth: 2 },
  portraitFallback: { alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
});
