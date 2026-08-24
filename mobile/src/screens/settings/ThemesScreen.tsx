import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Screen } from '@/components/Screen';
import { Text, SectionLabel } from '@/components/Text';
import { Card } from '@/components/Card';
import { Header } from '@/components/Header';
import { Pressable } from '@/components/Pressable';
import { PaperTexture } from '@/components/PaperTexture';
import { Switch } from '@/components/Switch';

import { useTheme } from '@/theme/ThemeProvider';
import { THEMES, THEME_ORDER, ThemeId, ThemeDefinition } from '@/theme/palettes';
import { useSettingsStore } from '@/store/useSettingsStore';
import { haptics } from '@/lib/haptics';
import { withAlpha } from '@/lib/color';

const AMBIENCE_LABEL: Record<ThemeDefinition['ambience'], string> = {
  dust: 'motes of dust in the lamplight',
  leaves: 'leaves coming down outside',
  steam: 'steam off something hot',
  rain: 'rain on the window',
  fireflies: 'fireflies in the undergrowth',
  snow: 'snow, quietly',
  blossom: 'blossom on the breeze',
  stars: 'stars, and no one else awake',
};

/**
 * Choosing a theme should feel like choosing a room to sit in, so each one is
 * shown as a little scene rather than a row of colour chips.
 */
export function ThemesScreen() {
  const theme = useTheme();
  const current = useSettingsStore((s) => s.theme);
  const followSystem = useSettingsStore((s) => s.followSystem);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const patch = useSettingsStore((s) => s.patch);

  return (
    <Screen edges={['top']}>
      <Header title="Themes" subtitle="Pick a room to read in" back />

      <ScrollView contentContainerStyle={{ padding: theme.space.lg, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        <Card style={styles.systemRow}>
          <View style={{ flex: 1, marginRight: theme.space.md }}>
            <Text variant="body" tone="ink">
              Follow the phone
            </Text>
            <Text variant="caption" tone="inkFaint">
              Classic Library by day, Rainy Evening after dark
            </Text>
          </View>
          <Switch
            value={followSystem}
            onValueChange={(value) => patch({ followSystem: value })}
            accessibilityLabel="Follow the phone's light and dark setting"
          />
        </Card>

        <SectionLabel style={{ marginTop: theme.space.xl }}>Rooms</SectionLabel>

        {THEME_ORDER.map((id, index) => (
          <ThemePreview
            key={id}
            id={id}
            index={index}
            selected={!followSystem && current === id}
            dimmed={followSystem}
            onSelect={() => {
              setTheme(id);
              haptics.settle();
            }}
          />
        ))}

        <Text variant="caption" tone="inkFaint" align="center" style={{ marginTop: theme.space.xl }}>
          Each theme changes the colours, the paper grain, the illustrations and the weather drifting behind the page.
        </Text>
      </ScrollView>
    </Screen>
  );
}

function ThemePreview({
  id,
  index,
  selected,
  dimmed,
  onSelect,
}: {
  id: ThemeId;
  index: number;
  selected: boolean;
  dimmed: boolean;
  onSelect: () => void;
}) {
  const theme = useTheme();
  const definition = THEMES[id];
  const c = definition.colors;

  return (
    <Animated.View
      entering={theme.calm ? undefined : FadeInDown.delay(index * 55).duration(400)}
      style={{ marginBottom: theme.space.md, opacity: dimmed ? 0.55 : 1 }}
    >
      <Pressable onPress={onSelect} scaleTo={0.98} accessibilityRole="radio" accessibilityState={{ selected }}>
        <View
          style={[
            styles.card,
            {
              borderRadius: theme.radius.lg,
              borderColor: selected ? c.accent : withAlpha(theme.colors.rule, 1),
              borderWidth: selected ? 2 : StyleSheet.hairlineWidth,
            },
            theme.elevation(selected ? 2 : 1),
          ]}
        >
          {/* the scene */}
          <LinearGradient colors={[definition.wash[0], definition.wash[1], c.canvas]} style={styles.scene}>
            <PaperTexture opacity={definition.grain} />

            {/* a tiny shelf of books, in this theme's colours */}
            <View style={styles.miniShelf}>
              {[c.accent, c.gild, c.wood, c.inkSoft, c.accent].map((color, i) => (
                <View
                  key={i}
                  style={{
                    width: 9 + (i % 3) * 3,
                    height: 30 + (i % 2) * 8,
                    marginRight: 3,
                    borderRadius: 1.5,
                    backgroundColor: color,
                  }}
                />
              ))}
              <View style={[styles.miniCard, { backgroundColor: c.paper, borderColor: c.rule }]} />
            </View>
            <View style={[styles.miniPlank, { backgroundColor: c.wood }]} />
          </LinearGradient>

          {/* the label */}
          <View style={[styles.label, { backgroundColor: c.paper, padding: theme.space.lg }]}>
            <View style={{ flex: 1 }}>
              <Text variant="subheading" color={c.ink} style={{ fontFamily: 'Lora_600SemiBold' }}>
                {definition.name}
              </Text>
              <Text variant="caption" color={c.inkFaint} style={{ marginTop: 1 }}>
                {definition.blurb}
              </Text>
              <Text variant="caption" color={withAlpha(c.accent, 0.9)} style={{ marginTop: 4 }}>
                {AMBIENCE_LABEL[definition.ambience]}
              </Text>
            </View>

            {selected ? (
              <Ionicons name="checkmark-circle" size={22} color={c.accent} />
            ) : (
              <View style={[styles.dot, { borderColor: c.rule }]} />
            )}
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  systemRow: { flexDirection: 'row', alignItems: 'center' },
  card: { overflow: 'hidden' },
  scene: { height: 92, justifyContent: 'flex-end', paddingHorizontal: 18 },
  miniShelf: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 3 },
  miniCard: { width: 28, height: 20, marginLeft: 6, borderRadius: 3, borderWidth: StyleSheet.hairlineWidth },
  miniPlank: { height: 6, borderRadius: 2, marginBottom: 12 },
  label: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5 },
});
