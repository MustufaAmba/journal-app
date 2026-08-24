import React, { useEffect, useMemo } from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { Header } from '@/components/Header';
import { EmptyState } from '@/components/EmptyState';
import { PaperTexture } from '@/components/PaperTexture';
import { Ornament } from '@/components/Divider';
import { ILLUSTRATIONS } from '@/components/illustrations';

import { useTheme } from '@/theme/ThemeProvider';
import { useGoalsStore, allAchievements } from '@/store/useGoalsStore';
import { prettyDate } from '@/lib/date';
import { withAlpha } from '@/lib/color';
import type { Achievement } from '@/types';

/** Which illustration goes on the front of each kind of postcard. */
const SCENE_ART: Record<Achievement['scene'], keyof typeof ILLUSTRATIONS> = {
  window: 'window',
  shelf: 'bookcase',
  lamp: 'nook',
  forest: 'moon',
  cafe: 'tea',
  stars: 'moon',
};

/**
 * Postcards, not badges.
 *
 * There are no points and no levels. Occasionally something nice happens and
 * a card turns up in the post, which you can keep and look at again.
 */
export function AchievementsScreen() {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const achievements = useGoalsStore((s) => s.achievements);
  const markAllSeen = useGoalsStore((s) => s.markAllSeen);

  const cards = useMemo(() => allAchievements(achievements), [achievements]);

  useEffect(() => {
    // Opening the drawer counts as having seen them.
    const timer = setTimeout(markAllSeen, 700);
    return () => clearTimeout(timer);
  }, [markAllSeen]);

  return (
    <Screen edges={['top']}>
      <Header title="Postcards" subtitle={cards.length ? `${cards.length} kept` : undefined} back />

      {!cards.length ? (
        <EmptyState
          illustration="moon"
          title="None yet"
          message="Postcards arrive on their own — the first book you finish, a week of reading in a row, a hundred pages. Nothing to chase."
        />
      ) : (
        <ScrollView contentContainerStyle={{ padding: theme.space.lg, paddingBottom: 130 }} showsVerticalScrollIndicator={false}>
          {cards.map((card, index) => (
            <Postcard key={card.id} achievement={card} index={index} width={width - theme.space.lg * 2} />
          ))}

          <Ornament />

          <Text variant="caption" tone="inkFaint" align="center">
            Kept in a drawer, in no particular order, like real ones.
          </Text>
        </ScrollView>
      )}
    </Screen>
  );
}

function Postcard({
  achievement,
  index,
  width,
}: {
  achievement: Achievement;
  index: number;
  width: number;
}) {
  const theme = useTheme();
  const Art = ILLUSTRATIONS[SCENE_ART[achievement.scene] ?? 'nook'];
  const tilt = ((index % 5) - 2) * 0.5;

  return (
    <Animated.View
      entering={theme.calm ? undefined : FadeInDown.delay(index * 80).duration(460)}
      style={{ marginBottom: theme.space.xl, transform: [{ rotate: `${tilt}deg` }] }}
    >
      <View
        style={[
          styles.card,
          {
            width,
            backgroundColor: theme.colors.paperRaised,
            borderRadius: theme.radius.md,
            borderColor: withAlpha(theme.colors.gild, 0.4),
          },
          theme.elevation(2),
        ]}
      >
        <PaperTexture opacity={theme.grain * 1.2} />

        {/* the picture side */}
        <LinearGradient
          colors={[withAlpha(theme.colors.glow, 0.3), withAlpha(theme.colors.accentSoft, 0.35)]}
          style={styles.art}
        >
          <Art size={Math.min(190, width * 0.55)} />
        </LinearGradient>

        {/* the written side */}
        <View style={{ padding: theme.space.lg }}>
          <View style={styles.stampRow}>
            <View style={{ flex: 1 }}>
              <Text variant="label" caps tone="accent">
                {achievement.kind === 'streak'
                  ? 'A streak'
                  : achievement.kind === 'firstBook'
                    ? 'The first one'
                    : achievement.kind === 'yearGoal'
                      ? 'Goal met'
                      : 'A milestone'}
              </Text>
              <Text variant="heading" tone="ink" style={{ marginTop: 2 }}>
                {achievement.title}
              </Text>
            </View>

            {/* a little postage stamp */}
            <View style={[styles.stamp, { borderColor: withAlpha(theme.colors.gild, 0.6), backgroundColor: withAlpha(theme.colors.accent, 0.12) }]}>
              <Ionicons name="book" size={14} color={theme.colors.accent} />
            </View>
          </View>

          <Text variant="hand" tone="inkSoft" style={{ marginTop: theme.space.md }}>
            {achievement.message}
          </Text>

          <View style={[styles.footer, { borderTopColor: withAlpha(theme.colors.rule, 1), marginTop: theme.space.lg }]}>
            <Text variant="caption" tone="inkFaint">
              {prettyDate(achievement.earnedAt)}
            </Text>
            {!achievement.seen ? (
              <View style={[styles.newDot, { backgroundColor: theme.colors.accent }]} />
            ) : null}
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth },
  art: { alignItems: 'center', justifyContent: 'center', paddingVertical: 20 },
  stampRow: { flexDirection: 'row', alignItems: 'flex-start' },
  stamp: {
    width: 34,
    height: 40,
    borderRadius: 3,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 10,
  },
  newDot: { width: 7, height: 7, borderRadius: 4 },
});
