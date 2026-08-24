import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * Every touch in this app should feel like paper, not plastic.
 * One module so haptics can be muted globally from Settings.
 */
let enabled = true;

export const setHapticsEnabled = (value: boolean) => {
  enabled = value;
};

const safe = (fn: () => Promise<unknown>) => {
  if (!enabled || Platform.OS === 'web') return;
  void fn().catch(() => undefined);
};

export const haptics = {
  /** a page turning under a thumb */
  tap: () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  /** a book landing on the shelf */
  settle: () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  /** something important */
  thud: () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)),
  /** picking a book up to drag it */
  lift: () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid)),
  select: () => safe(() => Haptics.selectionAsync()),
  success: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  warn: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
  error: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
};
