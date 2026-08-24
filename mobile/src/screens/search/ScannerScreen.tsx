import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Animated, {
  Easing,
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { IconButton } from '@/components/Header';
import { BookCover } from '@/components/BookCover';
import { Chip } from '@/components/Chip';
import { EmptyState } from '@/components/EmptyState';

import { useTheme } from '@/theme/ThemeProvider';
import { lookupIsbn } from '@/api/books';
import { useLibraryStore } from '@/store/useLibraryStore';
import { SHELVES, SHELF_ORDER } from '@/data/shelves';
import { haptics } from '@/lib/haptics';
import { withAlpha } from '@/lib/color';
import type { RootStackParamList } from '@/navigation/types';
import type { Book, ShelfId } from '@/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

/**
 * Point the phone at the back of a paperback and it lands on the shelf.
 * The fastest way there is of getting a physical bookcase into the app.
 */
export function ScannerScreen() {
  const theme = useTheme();
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();

  const [looking, setLooking] = useState(false);
  const [found, setFound] = useState<Book | null>(null);
  const [missed, setMissed] = useState<string | null>(null);
  const lastCode = useRef<string | null>(null);

  const addToLibrary = useLibraryStore((s) => s.add);

  const sweep = useSharedValue(0);
  useEffect(() => {
    if (theme.calm) return;
    sweep.value = withRepeat(withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, [sweep, theme.calm]);

  const sweepStyle = useAnimatedStyle(() => ({ transform: [{ translateY: sweep.value * 150 }] }));

  const onScanned = useCallback(
    async ({ data }: { data: string }) => {
      const code = data.replace(/[^0-9Xx]/g, '');
      // The camera fires continuously — ignore everything until this one resolves.
      if (looking || found || code === lastCode.current) return;
      if (code.length !== 10 && code.length !== 13) return;

      lastCode.current = code;
      setLooking(true);
      setMissed(null);
      haptics.settle();

      try {
        const book = await lookupIsbn(code);
        if (book) {
          setFound(book);
          haptics.success();
        } else {
          setMissed(code);
          haptics.warn();
        }
      } catch {
        setMissed(code);
        haptics.error();
      } finally {
        setLooking(false);
      }
    },
    [looking, found],
  );

  const reset = () => {
    setFound(null);
    setMissed(null);
    lastCode.current = null;
  };

  const shelve = (shelf: ShelfId) => {
    if (!found) return;
    addToLibrary(found, shelf);
    haptics.success();
    navigation.replace('BookDetail', { bookId: found.id });
  };

  if (!permission) {
    return (
      <Screen edges={['top', 'bottom']}>
        <View style={styles.centered}>
          <ActivityIndicator color={theme.colors.accent} />
        </View>
      </Screen>
    );
  }

  if (!permission.granted) {
    return (
      <Screen edges={['top', 'bottom']}>
        <View style={[styles.topBar, { paddingHorizontal: theme.space.lg }]}>
          <IconButton name="chevron-back" label="Go back" onPress={() => navigation.goBack()} />
        </View>
        <EmptyState
          illustration="window"
          title="The camera is asleep"
          message="Marginalia needs permission to use the camera so it can read the barcode on the back of a book. Nothing is recorded or sent anywhere."
          actionLabel="Allow the camera"
          onAction={requestPermission}
          secondaryLabel="Search by title instead"
          onSecondary={() => navigation.replace('Search')}
        />
      </Screen>
    );
  }

  return (
    <View style={styles.root}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }}
        onBarcodeScanned={found ? undefined : onScanned}
      />

      {/* darkened surround with a clear window in the middle */}
      <View style={styles.overlay} pointerEvents="box-none">
        <View style={[styles.dim, { backgroundColor: 'rgba(0,0,0,0.55)' }]} />
        <View style={styles.windowRow}>
          <View style={[styles.dim, { backgroundColor: 'rgba(0,0,0,0.55)' }]} />
          <View style={styles.window}>
            <Corner style={{ top: 0, left: 0 }} />
            <Corner style={{ top: 0, right: 0 }} rotate="90deg" />
            <Corner style={{ bottom: 0, right: 0 }} rotate="180deg" />
            <Corner style={{ bottom: 0, left: 0 }} rotate="270deg" />
            {!found ? (
              <Animated.View
                style={[styles.sweep, { backgroundColor: withAlpha(theme.colors.glow, 0.8) }, sweepStyle]}
              />
            ) : null}
          </View>
          <View style={[styles.dim, { backgroundColor: 'rgba(0,0,0,0.55)' }]} />
        </View>
        <View style={[styles.dim, { backgroundColor: 'rgba(0,0,0,0.55)' }]} />
      </View>

      <View style={[styles.chrome, { top: insets.top + 8, paddingHorizontal: theme.space.lg }]} pointerEvents="box-none">
        <IconButton name="close" label="Close scanner" onPress={() => navigation.goBack()} />
        <View style={{ flex: 1 }} />
        <IconButton name="search-outline" label="Search instead" onPress={() => navigation.replace('Search')} />
      </View>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + 24, paddingHorizontal: theme.space.lg }]}>
        {found ? (
          <Animated.View entering={FadeIn.duration(280)}>
            <Card raise={3}>
              <View style={styles.foundRow}>
                <BookCover book={found} size="sm" />
                <View style={{ flex: 1, marginLeft: theme.space.lg }}>
                  <Text variant="subheading" tone="ink" numberOfLines={2} style={{ fontFamily: 'Lora_600SemiBold' }}>
                    {found.title}
                  </Text>
                  {found.authors[0] ? (
                    <Text variant="small" tone="inkFaint" numberOfLines={1}>
                      {found.authors[0]}
                    </Text>
                  ) : null}
                  {found.pageCount ? (
                    <Text variant="caption" tone="inkFaint">
                      {found.pageCount} pages
                    </Text>
                  ) : null}
                </View>
              </View>

              <View style={[styles.chips, { marginTop: theme.space.lg }]}>
                {(['currentlyReading', 'wantToRead', 'finished'] as ShelfId[]).map((id) => (
                  <Chip key={id} label={SHELVES[id].name} onPress={() => shelve(id)} />
                ))}
              </View>

              <Button label="Scan another" variant="ghost" full onPress={reset} style={{ marginTop: theme.space.sm }} />
            </Card>
          </Animated.View>
        ) : (
          <Card raise={2} style={{ alignItems: 'center' }}>
            {looking ? (
              <>
                <ActivityIndicator color={theme.colors.accent} />
                <Text variant="small" tone="inkSoft" style={{ marginTop: theme.space.sm }}>
                  Looking it up…
                </Text>
              </>
            ) : missed ? (
              <>
                <Text variant="bodyStrong" tone="ink" align="center">
                  No record of {missed}
                </Text>
                <Text variant="small" tone="inkFaint" align="center" style={{ marginTop: 4 }}>
                  Some editions are not catalogued. You can still add it by hand.
                </Text>
                <View style={[styles.chips, { marginTop: theme.space.md, justifyContent: 'center' }]}>
                  <Button label="Add by hand" onPress={() => navigation.replace('AddBookManually', {})} />
                  <Button label="Try again" variant="ghost" onPress={reset} />
                </View>
              </>
            ) : (
              <>
                <Text variant="bodyStrong" tone="ink" align="center">
                  Line up the barcode
                </Text>
                <Text variant="small" tone="inkFaint" align="center" style={{ marginTop: 2 }}>
                  It is usually on the back cover, near the price.
                </Text>
              </>
            )}
          </Card>
        )}
      </View>
    </View>
  );
}

function Corner({ style, rotate = '0deg' }: { style: object; rotate?: string }) {
  return (
    <View
      style={[
        styles.corner,
        style,
        { transform: [{ rotate }] },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingBottom: 4 },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  dim: { flex: 1 },
  windowRow: { flexDirection: 'row', height: 210 },
  window: { width: 290, overflow: 'hidden' },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderColor: 'rgba(255,255,255,0.85)',
    borderTopLeftRadius: 6,
  },
  sweep: { position: 'absolute', left: 12, right: 12, top: 28, height: 2, borderRadius: 2 },
  chrome: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', alignItems: 'center' },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  foundRow: { flexDirection: 'row', alignItems: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
