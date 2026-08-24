import React, { useEffect } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { Button } from '@/components/Button';
import { PaperTexture } from '@/components/PaperTexture';
import { Ornament } from '@/components/Divider';
import { IconButton } from '@/components/Header';
import { useTheme } from '@/theme/ThemeProvider';
import { useSettingsStore } from '@/store/useSettingsStore';
import { prettyDate } from '@/lib/date';
import { withAlpha } from '@/lib/color';
import { haptics } from '@/lib/haptics';

/**
 * The dedication as the recipient sees it: centred on a page of its own,
 * in handwriting, with nothing else competing for attention.
 */
export function DedicationScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const dedication = useSettingsStore((s) => s.dedication);
  const patch = useSettingsStore((s) => s.patch);

  useEffect(() => {
    haptics.tap();
    patch({ dedicationSeen: true });
  }, [patch]);

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={[styles.topBar, { padding: theme.space.lg }]}>
        <IconButton name="close" label="Close" onPress={() => navigation.goBack()} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Animated.View
          entering={theme.calm ? undefined : FadeIn.duration(700)}
          style={[
            styles.page,
            {
              backgroundColor: theme.colors.paper,
              borderColor: withAlpha(theme.colors.gild, 0.35),
              borderRadius: theme.radius.lg,
              padding: theme.space.xxl,
            },
            theme.elevation(2),
          ]}
        >
          <PaperTexture opacity={theme.grain * 1.2} />

          {dedication?.to ? (
            <Animated.View entering={theme.calm ? undefined : FadeInDown.delay(200).duration(600)}>
              <Text variant="label" caps tone="inkFaint" align="center">
                For
              </Text>
              <Text variant="title" tone="ink" align="center" style={{ marginTop: 4 }}>
                {dedication.to}
              </Text>
            </Animated.View>
          ) : null}

          <Ornament />

          <Animated.View entering={theme.calm ? undefined : FadeInDown.delay(420).duration(700)}>
            <Text variant="handLarge" tone="ink" align="center" style={{ lineHeight: 42 }}>
              {dedication?.message || 'For someone who reads.'}
            </Text>
          </Animated.View>

          {dedication?.from ? (
            <Animated.View
              entering={theme.calm ? undefined : FadeInDown.delay(700).duration(700)}
              style={{ marginTop: theme.space.xxl }}
            >
              <Text variant="hand" tone="inkSoft" align="right">
                — {dedication.from}
              </Text>
            </Animated.View>
          ) : null}

          <Text variant="caption" tone="inkFaint" align="center" style={{ marginTop: theme.space.xl }}>
            {prettyDate(dedication?.date ?? new Date())}
          </Text>
        </Animated.View>

        <Animated.View entering={theme.calm ? undefined : FadeIn.delay(1000).duration(600)}>
          <Button
            label="Begin"
            size="lg"
            style={{ marginTop: theme.space.xxl, alignSelf: 'center' }}
            onPress={() => navigation.goBack()}
          />
        </Animated.View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', justifyContent: 'flex-end' },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24, paddingBottom: 48 },
  page: { borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
});
