import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from '@/lib/storage';
import { createId } from '@/lib/id';
import { enqueue } from './useSyncStore';
import type { Achievement, Goals } from '@/types';

type GoalsState = {
  goals: Goals;
  achievements: Record<string, Achievement>;
  setGoals: (patch: Partial<Goals>) => void;
  award: (input: Omit<Achievement, 'id' | 'earnedAt' | 'seen'>, dedupeKey?: string) => Achievement | null;
  markSeen: (id: string) => void;
  markAllSeen: () => void;
  remove: (id: string) => void;
};

const currentYear = new Date().getFullYear();

export const DEFAULT_GOALS: Goals = {
  booksPerYear: 24,
  booksPerMonth: 2,
  pagesPerDay: 30,
  minutesPerDay: 30,
  year: currentYear,
};

export const useGoalsStore = create<GoalsState>()(
  persist(
    (set, get) => ({
      goals: DEFAULT_GOALS,
      achievements: {},

      setGoals: (patch) =>
        set((s) => {
          const goals = { ...s.goals, ...patch };
          enqueue('goals', 'upsert', goals);
          return { goals };
        }),

      award: (input, dedupeKey) => {
        // A postcard should only ever arrive once.
        const key = dedupeKey ?? `${input.kind}:${input.title}:${input.bookId ?? ''}`;
        const already = Object.values(get().achievements).some(
          (a) => `${a.kind}:${a.title}:${a.bookId ?? ''}` === key,
        );
        if (already) return null;

        const achievement: Achievement = {
          ...input,
          id: createId('ach'),
          earnedAt: Date.now(),
          seen: false,
        };
        set((s) => ({ achievements: { ...s.achievements, [achievement.id]: achievement } }));
        return achievement;
      },

      markSeen: (id) =>
        set((s) => {
          const achievement = s.achievements[id];
          if (!achievement) return s;
          return { achievements: { ...s.achievements, [id]: { ...achievement, seen: true } } };
        }),

      markAllSeen: () =>
        set((s) => {
          const achievements = { ...s.achievements };
          Object.keys(achievements).forEach((id) => {
            achievements[id] = { ...achievements[id], seen: true };
          });
          return { achievements };
        }),

      remove: (id) =>
        set((s) => {
          const achievements = { ...s.achievements };
          delete achievements[id];
          return { achievements };
        }),
    }),
    { name: 'goals.v1', storage: createJSONStorage(() => zustandStorage) },
  ),
);

export const allAchievements = (map: Record<string, Achievement>): Achievement[] =>
  Object.values(map).sort((a, b) => b.earnedAt - a.earnedAt);

export const unseenAchievements = (map: Record<string, Achievement>): Achievement[] =>
  allAchievements(map).filter((a) => !a.seen);
