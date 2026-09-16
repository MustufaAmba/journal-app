import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { Card } from '@/components/Card';
import { Chip } from '@/components/Chip';
import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';
import { Header } from '@/components/Header';
import { CoverPicker } from '@/components/CoverPicker';

import { useTheme } from '@/theme/ThemeProvider';
import { createManualBook } from '@/api/books';
import { useLibraryStore } from '@/store/useLibraryStore';
import { SHELVES, SHELF_ORDER } from '@/data/shelves';
import { haptics } from '@/lib/haptics';
import type { RootStackParamList } from '@/navigation/types';
import type { ShelfId } from '@/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'AddBookManually'>;

const schema = z.object({
  title: z.string().trim().min(1, 'A book needs a title.'),
  author: z.string().trim().optional(),
  pageCount: z.string().trim().optional(),
  publisher: z.string().trim().optional(),
  publishedDate: z.string().trim().optional(),
  summary: z.string().trim().optional(),
});

type Values = z.infer<typeof schema>;

/**
 * For the secondhand paperback, the self-published novella, the notebook a
 * friend wrote by hand. Not everything is in a database.
 */
export function AddBookManuallyScreen() {
  const theme = useTheme();
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();

  const addToLibrary = useLibraryStore((s) => s.add);
  const [shelf, setShelf] = useState<ShelfId>('currentlyReading');
  const [coverUrl, setCoverUrl] = useState<string | undefined>(undefined);

  const { control, handleSubmit, watch } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: route.params?.title ?? '',
      author: '',
      pageCount: '',
      publisher: '',
      publishedDate: '',
      summary: '',
    },
  });

  const title = watch('title');
  const author = watch('author');

  const onSubmit = (values: Values) => {
    const parsedPages = values.pageCount ? Number.parseInt(values.pageCount, 10) : undefined;
    const book = createManualBook({
      title: values.title,
      author: values.author,
      pageCount: Number.isFinite(parsedPages) ? parsedPages : undefined,
      publisher: values.publisher || undefined,
      publishedDate: values.publishedDate || undefined,
      summary: values.summary || undefined,
      coverUrl,
    });
    addToLibrary(book, shelf);
    haptics.success();
    navigation.replace('BookDetail', { bookId: book.id });
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <Header title="Add a book by hand" back />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView
          contentContainerStyle={{ padding: theme.space.lg, paddingBottom: 120 }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.preview}>
            <CoverPicker title={title} author={author} coverUrl={coverUrl} onChange={setCoverUrl} />
          </View>

          <Card style={{ marginTop: theme.space.lg }}>
            <Controller
              control={control}
              name="title"
              render={({ field, fieldState }) => (
                <TextField
                  label="Title"
                  placeholder="What is it called?"
                  value={field.value}
                  onChangeText={field.onChange}
                  error={fieldState.error?.message}
                  autoFocus={!route.params?.title}
                />
              )}
            />

            <View style={{ height: theme.space.lg }} />

            <Controller
              control={control}
              name="author"
              render={({ field }) => (
                <TextField
                  label="Author"
                  placeholder="Who wrote it?"
                  value={field.value ?? ''}
                  onChangeText={field.onChange}
                  autoCapitalize="words"
                />
              )}
            />

            <View style={[styles.pair, { marginTop: theme.space.lg }]}>
              <Controller
                control={control}
                name="pageCount"
                render={({ field }) => (
                  <TextField
                    label="Pages"
                    placeholder="320"
                    value={field.value ?? ''}
                    onChangeText={field.onChange}
                    keyboardType="number-pad"
                    containerStyle={{ flex: 1 }}
                  />
                )}
              />
              <Controller
                control={control}
                name="publishedDate"
                render={({ field }) => (
                  <TextField
                    label="Published"
                    placeholder="2011"
                    value={field.value ?? ''}
                    onChangeText={field.onChange}
                    containerStyle={{ flex: 1 }}
                  />
                )}
              />
            </View>

            <View style={{ height: theme.space.lg }} />

            <Controller
              control={control}
              name="publisher"
              render={({ field }) => (
                <TextField
                  label="Publisher"
                  placeholder="Optional"
                  value={field.value ?? ''}
                  onChangeText={field.onChange}
                />
              )}
            />

            <View style={{ height: theme.space.lg }} />

            <Controller
              control={control}
              name="summary"
              render={({ field }) => (
                <TextField
                  label="What is it about?"
                  placeholder="A line or two, in your own words."
                  value={field.value ?? ''}
                  onChangeText={field.onChange}
                  multiline
                  auto
                />
              )}
            />
          </Card>

          <Text variant="label" caps tone="inkFaint" style={{ marginTop: theme.space.xl, marginBottom: theme.space.sm }}>
            Put it on
          </Text>
          <View style={styles.chips}>
            {SHELF_ORDER.filter((id) => id !== 'favorites' && id !== 'archive').map((id) => (
              <Chip key={id} label={SHELVES[id].name} selected={shelf === id} onPress={() => setShelf(id)} />
            ))}
          </View>

          <Button
            label="Add to the library"
            size="lg"
            full
            onPress={handleSubmit(onSubmit)}
            style={{ marginTop: theme.space.xxl }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  preview: { alignItems: 'center' },
  pair: { flexDirection: 'row', gap: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
