import React, { useEffect } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Animated, {
  Easing,
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { Button } from '@/components/Button';
import { PaperTexture } from '@/components/PaperTexture';
import { ReadingNook } from '@/components/illustrations';
import { useTheme } from '@/theme/ThemeProvider';
import { useSettingsStore } from '@/store/useSettingsStore';
import { withAlpha } from '@/lib/color';
import type { RootStackParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

/**
 * The cover of the book. Deliberately the plainest screen in the app: a title,
 * an illustration, and one warm invitation to open it.
 */
export function WelcomeScreen() {
  const theme = useTheme();
  const navigation = useNavigation<Nav>();
  const { width } = useWindowDimensions();
  const patch = useSettingsStore((s) => s.patch);
  const dedication = useSettingsStore((s) => s.dedication);
  const forWhom = dedication?.to?.trim();

  const breathe = useSharedValue(0);
  const glow = useSharedValue(0);

  useEffect(() => {
    if (theme.calm) return;
    breathe.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 3600, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 3600, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
    glow.value = withDelay(400, withTiming(1, { duration: 1400, easing: Easing.out(Easing.cubic) }));
  }, [breathe, glow, theme.calm]);

  const illustrationStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -breathe.value * 6 }, { scale: 1 + breathe.value * 0.012 }],
  }));

  const glowStyle = useAnimatedStyle(() => ({ opacity: 0.2 + glow.value * 0.55 }));

  return (
    <Screen edges={['top', 'bottom']}>
      <Animated.View style={[styles.lamp, { width: width * 1.4, left: -width * 0.2 }, glowStyle]} pointerEvents="none">
        <LinearGradient
          colors={[withAlpha(theme.colors.glow, 0.6), 'transparent']}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      <View style={styles.body}>
        <Animated.View entering={theme.calm ? undefined : FadeIn.duration(900)} style={styles.header}>
          <Text variant="label" caps tone="accent" align="center">
            {forWhom ? `A journal for ${forWhom}` : 'A journal for one reader'}
          </Text>
          <Text variant="hero" tone="ink" align="center" style={{ marginTop: theme.space.sm }}>
            Bookie
          </Text>
          <Text variant="body" tone="inkFaint" align="center" style={{ marginTop: theme.space.sm, maxWidth: 300 }}>
            {forWhom
              ? `Everything ${forWhom} reads, and everything reading makes them think — kept somewhere warm.`
              : 'Everything you read, and everything reading made you think — kept somewhere warm.'}
          </Text>
        </Animated.View>

        <Animated.View style={[styles.illustration, illustrationStyle]}>
          <ReadingNook size={Math.min(320, width * 0.82)} />
        </Animated.View>

        <Animated.View entering={theme.calm ? undefined : FadeIn.delay(500).duration(900)} style={styles.footer}>
          <View
            style={[
              styles.plate,
              {
                backgroundColor: withAlpha(theme.colors.paper, 0.7),
                borderColor: withAlpha(theme.colors.gild, 0.45),
                borderRadius: theme.radius.lg,
                padding: theme.space.lg,
              },
            ]}
          >
            <PaperTexture opacity={theme.grain} />
            <Text variant="hand" tone="inkSoft" align="center">
              Before you begin, there is a page at the front to fill in.
            </Text>
          </View>

          <Button
            label="Open the journal"
            size="lg"
            full
            style={{ marginTop: theme.space.xl }}
            onPress={() => navigation.navigate('DedicationWrite', { firstRun: true })}
          />

          <Button
            label="Skip for now"
            variant="ghost"
            full
            style={{ marginTop: theme.space.xs }}
            onPress={() => patch({ onboarded: true, dedicationSeen: true })}
          />
        </Animated.View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, paddingHorizontal: 24, justifyContent: 'space-between', paddingBottom: 12 },
  header: { paddingTop: 28, alignItems: 'center' },
  illustration: { alignItems: 'center', justifyContent: 'center', flex: 1 },
  footer: { paddingBottom: 8 },
  plate: { borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  lamp: { position: 'absolute', top: -160, height: 420 },
});

