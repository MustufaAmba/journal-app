import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { Screen } from '@/components/Screen';
import { Text, SectionLabel } from '@/components/Text';
import { Card } from '@/components/Card';
import { Pressable } from '@/components/Pressable';
import { IconButton } from '@/components/Header';
import { Divider, Ornament } from '@/components/Divider';
import { ProgressRing } from '@/components/ProgressRing';
import { ILLUSTRATIONS, illustrationForDay } from '@/components/illustrations';

import { useTheme } from '@/theme/ThemeProvider';
import { useAuthStore } from '@/store/useAuthStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useGoalsStore, unseenAchievements, allAchievements } from '@/store/useGoalsStore';
import { useSyncStore } from '@/store/useSyncStore';
import { useStats } from '@/hooks/useStats';
import { useThisDayInReading, useAnniversaries } from '@/hooks/useAnniversaries';
import { drainSyncQueue } from '@/api/sync';
import { duration, friendlyDate } from '@/lib/date';
import { withAlpha } from '@/lib/color';
import type { RootStackParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

/** The reader's own corner: their year so far, their postcards, their settings. */
export function YouScreen() {
  const theme = useTheme();
  const navigation = useNavigation<Nav>();

  const user = useAuthStore((s) => s.user);
  const dedication = useSettingsStore((s) => s.dedication);
  const goals = useGoalsStore((s) => s.goals);
  const achievements = useGoalsStore((s) => s.achievements);
  const sync = useSyncStore();

  const stats = useStats();
  const memories = useThisDayInReading();
  const anniversaries = useAnniversaries();

  const unseen = useMemo(() => unseenAchievements(achievements), [achievements]);
  const totalPostcards = useMemo(() => allAchievements(achievements).length, [achievements]);

  const DailyIllustration = ILLUSTRATIONS[illustrationForDay()];
  const thisDayCount = memories.length + anniversaries.length;

  const yearProgress = goals.booksPerYear ? stats.booksThisYear / goals.booksPerYear : 0;

  return (
    <Screen edges={['top']}>
      <View style={[styles.topBar, { paddingHorizontal: theme.space.lg }]}>
        <View style={{ flex: 1 }}>
          <Text variant="title" tone="ink">
            {(user?.name?.trim() || dedication?.to?.trim() || 'You').split(' ')[0]}
          </Text>
          <Text variant="caption" tone="inkFaint">
            {user?.guest ? 'Reading as a guest — everything stays on this phone' : (user?.email ?? 'Signed in')}
          </Text>
        </View>
        <IconButton name="settings-outline" label="Settings" onPress={() => navigation.navigate('Settings')} />
      </View>

      <ScrollView contentContainerStyle={{ padding: theme.space.lg, paddingBottom: 130 }} showsVerticalScrollIndicator={false}>
        {/* The year so far */}
        <Card raise={2} onPress={() => navigation.navigate('Goals')}>
          <View style={styles.yearRow}>
            <ProgressRing progress={yearProgress} size={82} thickness={8}>
              <Text variant="heading" tone="ink" style={{ fontFamily: 'Lora_600SemiBold' }}>
                {stats.booksThisYear}
              </Text>
            </ProgressRing>
            <View style={{ flex: 1, marginLeft: theme.space.lg }}>
              <Text variant="label" caps tone="accent">
                {new Date().getFullYear()} so far
              </Text>
              <Text variant="subheading" tone="ink" style={{ marginTop: 2 }}>
                {stats.booksThisYear} {stats.booksThisYear === 1 ? 'book' : 'books'}
                {goals.booksPerYear ? ` of ${goals.booksPerYear}` : ''}
              </Text>
              <Text variant="caption" tone="inkFaint" style={{ marginTop: 2 }}>
                {stats.pagesRead.toLocaleString()} pages · {stats.hoursRead >= 1 ? `${Math.round(stats.hoursRead)} hours` : duration(stats.hoursRead * 60)} · {stats.streak} day streak
              </Text>
            </View>
          </View>
        </Card>

        {/* Places to go */}
        <View style={{ marginTop: theme.space.xl }}>
          <SectionLabel>Look back</SectionLabel>
          <Card padded={false}>
            <Row
              icon="stats-chart-outline"
              label="Reading statistics"
              detail="Heatmaps, genres, favourite authors"
              onPress={() => navigation.navigate('Stats')}
            />
            <Divider inset={theme.space.lg} />
            <Row
              icon="trophy-outline"
              label="Postcards"
              detail={totalPostcards ? `${totalPostcards} kept` : 'None yet — they arrive on their own'}
              badge={unseen.length}
              onPress={() => navigation.navigate('Achievements')}
            />
            <Divider inset={theme.space.lg} />
            <Row
              icon="calendar-outline"
              label="This day in reading"
              detail={thisDayCount ? `${thisDayCount} ${thisDayCount === 1 ? 'memory' : 'memories'} from today` : 'Nothing from this date yet'}
              onPress={() => navigation.navigate('ThisDay')}
            />
            <Divider inset={theme.space.lg} />
            <Row
              icon="flag-outline"
              label="Reading goals"
              detail={goals.booksPerYear ? `${goals.booksPerYear} books this year` : 'No target set'}
              onPress={() => navigation.navigate('Goals')}
            />
          </Card>
        </View>

        {/* The dedication */}
        {dedication ? (
          <View style={{ marginTop: theme.space.xl }}>
            <SectionLabel>The first page</SectionLabel>
            <Card ribbon ribbonColor={theme.colors.gild} onPress={() => navigation.navigate('Dedication')} style={{ paddingLeft: theme.space.xl }}>
              <Text variant="hand" tone="ink" numberOfLines={3}>
                {dedication.message || 'For someone who reads.'}
              </Text>
              {dedication.from ? (
                <Text variant="caption" tone="inkFaint" align="right" style={{ marginTop: 6 }}>
                  — {dedication.from}
                </Text>
              ) : null}
            </Card>
          </View>
        ) : null}

        {/* Sync */}
        <View style={{ marginTop: theme.space.xl }}>
          <SectionLabel>Backup</SectionLabel>
          <Card>
            <View style={styles.syncRow}>
              <View
                style={[
                  styles.syncDot,
                  {
                    backgroundColor:
                      sync.status === 'error'
                        ? theme.colors.danger
                        : sync.queue.length
                          ? theme.colors.warning
                          : theme.colors.success,
                  },
                ]}
              />
              <View style={{ flex: 1, marginLeft: theme.space.md }}>
                <Text variant="bodyStrong" tone="ink">
                  {user?.guest
                    ? 'Everything is on this phone'
                    : sync.queue.length
                      ? `${sync.queue.length} ${sync.queue.length === 1 ? 'change' : 'changes'} waiting`
                      : 'Everything is backed up'}
                </Text>
                <Text variant="caption" tone="inkFaint">
                  {user?.guest
                    ? 'Sign in from Settings if you would like a copy in the cloud.'
                    : sync.lastSyncedAt
                      ? `Last synced ${friendlyDate(sync.lastSyncedAt)}`
                      : 'Never synced yet'}
                </Text>
              </View>
              {!user?.guest ? (
                <Pressable onPress={() => void drainSyncQueue()} scaleTo={0.9} accessibilityLabel="Sync now">
                  <Ionicons name="sync-outline" size={20} color={theme.colors.accent} />
                </Pressable>
              ) : null}
            </View>
          </Card>
        </View>

        <Ornament />

        <View style={styles.art}>
          <DailyIllustration size={170} />
          <Text variant="caption" tone="inkFaint" align="center" style={{ marginTop: theme.space.sm }}>
            Made for one reader in particular.
          </Text>
        </View>
      </ScrollView>
    </Screen>
  );
}

function Row({
  icon,
  label,
  detail,
  onPress,
  badge,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  detail?: string;
  onPress: () => void;
  badge?: number;
}) {
  const theme = useTheme();
  return (
    <Pressable onPress={onPress} style={[styles.row, { padding: theme.space.lg }]} accessibilityRole="button" accessibilityLabel={label}>
      <View
        style={[styles.rowIcon, { backgroundColor: withAlpha(theme.colors.accent, 0.1), borderRadius: theme.radius.md }]}
      >
        <Ionicons name={icon} size={17} color={theme.colors.accent} />
      </View>
      <View style={{ flex: 1, marginLeft: theme.space.md }}>
        <Text variant="body" tone="ink">
          {label}
        </Text>
        {detail ? (
          <Text variant="caption" tone="inkFaint" numberOfLines={1}>
            {detail}
          </Text>
        ) : null}
      </View>
      {badge ? (
        <View style={[styles.badge, { backgroundColor: theme.colors.accent }]}>
          <Text variant="caption" color={theme.colors.accentInk} style={{ fontSize: 10, fontFamily: 'Karla_700Bold' }}>
            {badge}
          </Text>
        </View>
      ) : null}
      <Ionicons name="chevron-forward" size={16} color={theme.colors.inkFaint} style={{ marginLeft: 6 }} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', paddingBottom: 8 },
  yearRow: { flexDirection: 'row', alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'center' },
  rowIcon: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  badge: { minWidth: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  syncRow: { flexDirection: 'row', alignItems: 'center' },
  syncDot: { width: 9, height: 9, borderRadius: 5 },
  art: { alignItems: 'center', paddingVertical: 8 },
});
