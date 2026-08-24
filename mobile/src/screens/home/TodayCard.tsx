import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Text';
import { Card } from '@/components/Card';
import { ProgressRing } from '@/components/ProgressRing';
import { goalEncouragement } from '@/data/greetings';
import { duration } from '@/lib/date';
import { withAlpha } from '@/lib/color';

/**
 * Today at a glance: the pages ring, the minutes, and the streak — with copy
 * that never scolds. The ring is a nice thing to fill, not a debt to repay.
 */
export function TodayCard({
  pages,
  minutes,
  pageGoal,
  minuteGoal,
  streak,
  readToday,
  onPress,
}: {
  pages: number;
  minutes: number;
  pageGoal: number;
  minuteGoal: number;
  streak: number;
  readToday: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const pageProgress = pageGoal > 0 ? pages / pageGoal : 0;

  return (
    <Animated.View entering={theme.calm ? undefined : FadeInDown.delay(80).duration(420)}>
      <Card
        onPress={onPress}
        accessibilityLabel="Today's reading, opens goals"
        style={{ marginHorizontal: theme.space.lg }}
      >
        <View style={styles.row}>
          <ProgressRing progress={pageProgress} size={86} thickness={8}>
            <View style={{ alignItems: 'center' }}>
              <Text variant="heading" tone="ink" style={{ fontFamily: 'Lora_600SemiBold' }}>
                {pages}
              </Text>
              <Text variant="caption" tone="inkFaint" style={{ marginTop: -3 }}>
                pages
              </Text>
            </View>
          </ProgressRing>

          <View style={[styles.body, { marginLeft: theme.space.lg }]}>
            <Text variant="label" caps tone="inkFaint">
              Today
            </Text>
            <Text variant="subheading" tone="ink" style={{ marginTop: 2 }}>
              {goalEncouragement(pages, pageGoal)}
            </Text>

            <View style={[styles.stats, { marginTop: theme.space.md }]}>
              <Stat
                icon="time-outline"
                label={minutes > 0 ? duration(minutes) : '—'}
                sub={`of ${minuteGoal}m`}
              />
              <View style={[styles.divider, { backgroundColor: withAlpha(theme.colors.rule, 1) }]} />
              <Stat
                icon={readToday ? 'flame' : 'flame-outline'}
                label={`${streak}`}
                sub={streak === 1 ? 'day' : 'days'}
                tint={streak > 0 ? theme.colors.accent : undefined}
              />
            </View>
          </View>
        </View>
      </Card>
    </Animated.View>
  );
}

function Stat({
  icon,
  label,
  sub,
  tint,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  sub: string;
  tint?: string;
}) {
  const theme = useTheme();
  return (
    <View style={styles.stat}>
      <Ionicons name={icon} size={15} color={tint ?? theme.colors.inkFaint} />
      <Text variant="bodyStrong" tone="ink" style={{ marginLeft: 6 }}>
        {label}
      </Text>
      <Text variant="caption" tone="inkFaint" style={{ marginLeft: 4 }}>
        {sub}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  body: { flex: 1 },
  stats: { flexDirection: 'row', alignItems: 'center' },
  stat: { flexDirection: 'row', alignItems: 'center' },
  divider: { width: StyleSheet.hairlineWidth, height: 16, marginHorizontal: 12 },
});
