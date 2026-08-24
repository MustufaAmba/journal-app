import type { Mood } from '@/types';

export type MoodMeta = { id: Mood; label: string; emoji: string; hue: string };

export const MOODS: MoodMeta[] = [
  { id: 'cosy', label: 'Cosy', emoji: '🕯️', hue: '#D9A05B' },
  { id: 'moved', label: 'Moved', emoji: '🥹', hue: '#C2705E' },
  { id: 'thrilled', label: 'Thrilled', emoji: '⚡', hue: '#C25A28' },
  { id: 'thoughtful', label: 'Thoughtful', emoji: '🌙', hue: '#7C7FA8' },
  { id: 'heartbroken', label: 'Heartbroken', emoji: '💔', hue: '#A2453A' },
  { id: 'delighted', label: 'Delighted', emoji: '✨', hue: '#C9962F' },
  { id: 'restless', label: 'Restless', emoji: '🌊', hue: '#4F7E8C' },
  { id: 'peaceful', label: 'Peaceful', emoji: '🍃', hue: '#5B7B52' },
];

export const moodMeta = (mood?: Mood): MoodMeta | undefined => MOODS.find((m) => m.id === mood);

/** Emoji offered in the journal editor's quick picker. */
export const JOURNAL_EMOJI = [
  '📖', '☕️', '🕯️', '🍂', '🌧️', '🌙', '✨', '🔖', '💌', '🧣',
  '🌿', '🕰️', '🦉', '🪶', '🫖', '🍁', '⭐️', '💫', '🧸', '🎐',
];
