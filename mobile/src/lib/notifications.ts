import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

/**
 * Gentle reminders only.
 *
 * Three notifications exist in this whole app and every one of them is opt-in,
 * scheduled locally, and worded like a friend rather than a productivity tool.
 * Nothing is ever sent from a server.
 */

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

const CHANNEL_ID = 'gentle';

const READING_LINES = [
  'The book is still where you left it.',
  'A chapter before bed?',
  'Ten quiet minutes are yours if you want them.',
  'Your bookmark has not moved all day.',
  'The kettle is metaphorical, but the book is real.',
];

export async function ensurePermissions(): Promise<boolean> {
  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;

  if (status !== 'granted') {
    const asked = await Notifications.requestPermissionsAsync();
    status = asked.status;
  }

  if (status !== 'granted') return false;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Gentle reminders',
      importance: Notifications.AndroidImportance.LOW,
      sound: null,
      vibrationPattern: [0, 40],
      enableVibrate: false,
    });
  }

  return true;
}

async function cancelTagged(tag: string) {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((n) => (n.content.data as { tag?: string } | undefined)?.tag === tag)
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
}

export async function scheduleReadingReminder(hour: number, minute: number): Promise<boolean> {
  if (!(await ensurePermissions())) return false;
  await cancelTagged('reading');

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'A little reading?',
      body: READING_LINES[Math.floor(Math.random() * READING_LINES.length)],
      data: { tag: 'reading' },
      ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : null),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
  return true;
}

/** A single nudge, only if the streak is actually at risk. Never nags twice. */
export async function scheduleStreakReminder(streak: number): Promise<void> {
  if (streak < 3) return;
  if (!(await ensurePermissions())) return;
  await cancelTagged('streak');

  await Notifications.scheduleNotificationAsync({
    content: {
      title: `${streak} days so far`,
      body: 'A page or two would keep it going. Only if you feel like it.',
      data: { tag: 'streak' },
      ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : null),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 20,
      minute: 30,
    },
  });
}

export async function scheduleGoalReminder(): Promise<void> {
  if (!(await ensurePermissions())) return;
  await cancelTagged('goal');

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Month in review',
      body: 'Your reading goals are waiting whenever you want to look.',
      data: { tag: 'goal' },
      ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : null),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
      weekday: 1, // Sunday = 1
      hour: 10,
      minute: 0,
    },
  });
}

export const cancelAllReminders = () => Notifications.cancelAllScheduledNotificationsAsync();
export const cancelReadingReminder = () => cancelTagged('reading');
export const cancelStreakReminder = () => cancelTagged('streak');
export const cancelGoalReminder = () => cancelTagged('goal');
