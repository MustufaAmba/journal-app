import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { Screen } from '@/components/Screen';
import { Text, SectionLabel } from '@/components/Text';
import { Card } from '@/components/Card';
import { Header } from '@/components/Header';
import { Button } from '@/components/Button';
import { Pressable } from '@/components/Pressable';
import { Divider } from '@/components/Divider';
import { SegmentedControl } from '@/components/SegmentedControl';
import { Sheet } from '@/components/Sheet';
import { Switch } from '@/components/Switch';
import { THEMES } from '@/theme/palettes';

import { useTheme } from '@/theme/ThemeProvider';
import { useSettingsStore, FontScale } from '@/store/useSettingsStore';
import { useAuthStore } from '@/store/useAuthStore';
import { isNativeStorage } from '@/lib/storage';
import {
  scheduleReadingReminder,
  cancelReadingReminder,
  scheduleGoalReminder,
  cancelGoalReminder,
  scheduleStreakReminder,
  cancelStreakReminder,
} from '@/lib/notifications';
import { useSessionsStore, currentStreak } from '@/store/useSessionsStore';
import { haptics } from '@/lib/haptics';
import { seasonLabel } from '@/lib/season';
import { withAlpha } from '@/lib/color';
import type { RootStackParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const HOURS = [7, 8, 9, 12, 17, 19, 20, 21, 22, 23];

export function SettingsScreen() {
  const theme = useTheme();
  const navigation = useNavigation<Nav>();

  const settings = useSettingsStore();
  const patch = useSettingsStore((s) => s.patch);
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const sessions = useSessionsStore((s) => s.sessions);

  const [timeSheet, setTimeSheet] = useState(false);

  const toggleReminder = async (enabled: boolean) => {
    patch({ reminder: { ...settings.reminder, enabled } });
    if (enabled) {
      const ok = await scheduleReadingReminder(settings.reminder.hour, settings.reminder.minute);
      if (!ok) {
        patch({ reminder: { ...settings.reminder, enabled: false } });
        Alert.alert(
          'Notifications are off',
          'Marginalia needs notification permission for reminders. You can turn it on in your phone’s settings.',
        );
      }
    } else {
      await cancelReadingReminder();
    }
  };

  const setReminderHour = async (hour: number) => {
    patch({ reminder: { ...settings.reminder, hour, enabled: true } });
    await scheduleReadingReminder(hour, settings.reminder.minute);
    haptics.success();
    setTimeSheet(false);
  };

  const confirmSignOut = () => {
    Alert.alert(
      user?.guest ? 'Leave guest mode?' : 'Sign out?',
      user?.guest
        ? 'Your books and journal stay on this phone. You can come back to them by choosing guest mode again.'
        : 'Anything not yet backed up will stay on this phone until you sign back in.',
      [
        { text: 'Stay', style: 'cancel' },
        { text: user?.guest ? 'Leave' : 'Sign out', style: 'destructive', onPress: signOut },
      ],
    );
  };

  const formatTime = (hour: number, minute: number) => {
    const suffix = hour >= 12 ? 'pm' : 'am';
    const display = hour % 12 === 0 ? 12 : hour % 12;
    return `${display}:${String(minute).padStart(2, '0')} ${suffix}`;
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <Header title="Settings" back />

      <ScrollView contentContainerStyle={{ padding: theme.space.lg, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        {/* Appearance */}
        <SectionLabel>How it looks</SectionLabel>
        <Card padded={false}>
          <Pressable onPress={() => navigation.navigate('Themes')} style={[styles.row, { padding: theme.space.lg }]}>
            <View
              style={[
                styles.swatchStack,
                { backgroundColor: THEMES[settings.theme].colors.paper, borderColor: THEMES[settings.theme].colors.rule },
              ]}
            >
              <View style={[styles.swatchDot, { backgroundColor: THEMES[settings.theme].colors.accent }]} />
            </View>
            <View style={{ flex: 1, marginLeft: theme.space.md }}>
              <Text variant="body" tone="ink">
                Theme
              </Text>
              <Text variant="caption" tone="inkFaint">
                {settings.followSystem ? 'Follows your phone' : THEMES[settings.theme].name}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={theme.colors.inkFaint} />
          </Pressable>

          <Divider inset={theme.space.lg} />

          <View style={{ padding: theme.space.lg }}>
            <Text variant="body" tone="ink" style={{ marginBottom: theme.space.sm }}>
              Text size
            </Text>
            <SegmentedControl<FontScale>
              compact
              value={settings.fontScale}
              onChange={(fontScale) => patch({ fontScale })}
              segments={[
                { value: 'small', label: 'A' },
                { value: 'comfortable', label: 'A' },
                { value: 'large', label: 'A' },
                { value: 'largest', label: 'A' },
              ]}
            />
            <Text variant="caption" tone="inkFaint" style={{ marginTop: theme.space.sm }}>
              The whole app scales together — headings, handwriting and all.
            </Text>
          </View>

          <Divider inset={theme.space.lg} />
          <Toggle
            label="Ambient weather"
            detail="Dust, rain, leaves and fireflies drifting behind the page"
            value={settings.ambience}
            onChange={(ambience) => patch({ ambience })}
          />
          <Divider inset={theme.space.lg} />
          <Toggle
            label="Seasonal decorations"
            detail={`The weather follows the calendar — right now, ${seasonLabel()}`}
            value={settings.seasonalDecorations}
            onChange={(seasonalDecorations) => patch({ seasonalDecorations })}
          />
          <Divider inset={theme.space.lg} />
          <Toggle
            label="Calmer animations"
            detail="Turns off parallax, drifting particles and springy transitions"
            value={settings.reduceMotion}
            onChange={(reduceMotion) => patch({ reduceMotion })}
          />
          <Divider inset={theme.space.lg} />
          <Toggle
            label="Haptics"
            detail="The little taps when you press things"
            value={settings.haptics}
            onChange={(value) => patch({ haptics: value })}
          />
        </Card>

        {/* Reminders */}
        <SectionLabel style={{ marginTop: theme.space.xl }}>Gentle reminders</SectionLabel>
        <Card padded={false}>
          <Toggle
            label="Daily reading reminder"
            detail={settings.reminder.enabled ? `Every day at ${formatTime(settings.reminder.hour, settings.reminder.minute)}` : 'Off'}
            value={settings.reminder.enabled}
            onChange={toggleReminder}
          />
          {settings.reminder.enabled ? (
            <>
              <Divider inset={theme.space.lg} />
              <Pressable onPress={() => setTimeSheet(true)} style={[styles.row, { padding: theme.space.lg }]}>
                <Text variant="body" tone="ink" style={{ flex: 1 }}>
                  Time
                </Text>
                <Text variant="body" tone="accent">
                  {formatTime(settings.reminder.hour, settings.reminder.minute)}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={theme.colors.inkFaint} style={{ marginLeft: 6 }} />
              </Pressable>
            </>
          ) : null}

          <Divider inset={theme.space.lg} />
          <Toggle
            label="Streak reminder"
            detail="One quiet nudge in the evening if a streak is going"
            value={settings.streakReminder}
            onChange={async (streakReminder) => {
              patch({ streakReminder });
              if (streakReminder) await scheduleStreakReminder(currentStreak(sessions));
              else await cancelStreakReminder();
            }}
          />
          <Divider inset={theme.space.lg} />
          <Toggle
            label="Goal reminder"
            detail="A weekly look at how the year is going"
            value={settings.goalReminder}
            onChange={async (goalReminder) => {
              patch({ goalReminder });
              if (goalReminder) await scheduleGoalReminder();
              else await cancelGoalReminder();
            }}
          />
        </Card>

        {/* The journal */}
        <SectionLabel style={{ marginTop: theme.space.xl }}>The journal</SectionLabel>
        <Card padded={false}>
          <Pressable onPress={() => navigation.navigate('DedicationWrite', {})} style={[styles.row, { padding: theme.space.lg }]}>
            <View style={{ flex: 1 }}>
              <Text variant="body" tone="ink">
                Dedication
              </Text>
              <Text variant="caption" tone="inkFaint" numberOfLines={1}>
                {settings.dedication?.message ? 'Written in' : 'The page at the front is still blank'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={theme.colors.inkFaint} />
          </Pressable>
          <Divider inset={theme.space.lg} />
          <Pressable onPress={() => navigation.navigate('DataAndBackup')} style={[styles.row, { padding: theme.space.lg }]}>
            <View style={{ flex: 1 }}>
              <Text variant="body" tone="ink">
                Export, backup and import
              </Text>
              <Text variant="caption" tone="inkFaint">
                Take a copy of everything you have written
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={theme.colors.inkFaint} />
          </Pressable>
        </Card>

        {/* Privacy */}
        <SectionLabel style={{ marginTop: theme.space.xl }}>Privacy</SectionLabel>
        <Card>
          <Text variant="body" tone="inkSoft">
            Everything you write lives on this phone. Book covers and details come from Open Library, and
            occasionally Google Books when something is missing — those requests contain a title or an ISBN and
            nothing about you.
          </Text>
          <Text variant="body" tone="inkSoft" style={{ marginTop: theme.space.md }}>
            {user?.guest
              ? 'In guest mode nothing is sent to any server at all.'
              : 'Your journal is only uploaded to your own account, so it can follow you to a new phone.'}
          </Text>
          <Text variant="caption" tone="inkFaint" style={{ marginTop: theme.space.md }}>
            Storage engine: {isNativeStorage ? 'MMKV (native)' : 'AsyncStorage (Expo Go fallback)'}
          </Text>
        </Card>

        <Button
          label={user?.guest ? 'Leave guest mode' : 'Sign out'}
          variant="danger"
          full
          style={{ marginTop: theme.space.xxl }}
          onPress={confirmSignOut}
        />

        <Text variant="caption" tone="inkFaint" align="center" style={{ marginTop: theme.space.xl }}>
          Marginalia · made by hand, for one reader
        </Text>
      </ScrollView>

      <Sheet visible={timeSheet} onClose={() => setTimeSheet(false)} title="When should we nudge you?">
        <View style={[styles.hours, { paddingBottom: theme.space.xl }]}>
          {HOURS.map((hour) => (
            <Pressable
              key={hour}
              onPress={() => setReminderHour(hour)}
              haptic="select"
              style={[
                styles.hourChip,
                {
                  backgroundColor:
                    settings.reminder.hour === hour ? theme.colors.accent : withAlpha(theme.colors.accent, 0.1),
                  borderRadius: theme.radius.md,
                },
              ]}
            >
              <Text
                variant="bodyStrong"
                color={settings.reminder.hour === hour ? theme.colors.accentInk : theme.colors.inkSoft}
              >
                {formatTime(hour, 0)}
              </Text>
            </Pressable>
          ))}
        </View>
      </Sheet>
    </Screen>
  );
}

function Toggle({
  label,
  detail,
  value,
  onChange,
}: {
  label: string;
  detail?: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.row, { padding: theme.space.lg }]}>
      <View style={{ flex: 1, marginRight: theme.space.md }}>
        <Text variant="body" tone="ink">
          {label}
        </Text>
        {detail ? (
          <Text variant="caption" tone="inkFaint">
            {detail}
          </Text>
        ) : null}
      </View>
      <Switch value={value} onValueChange={onChange} accessibilityLabel={label} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  swatchStack: {
    width: 34,
    height: 34,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchDot: { width: 14, height: 14, borderRadius: 7 },
  hours: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  hourChip: { paddingVertical: 12, paddingHorizontal: 16, minWidth: 92, alignItems: 'center' },
});
