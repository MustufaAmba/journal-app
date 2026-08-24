import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from '@/lib/storage';
import { createId } from '@/lib/id';
import { todayKey } from '@/lib/date';
import { enqueue } from './useSyncStore';
import type { ReadingSession } from '@/types';

type SessionsState = {
  sessions: Record<string, ReadingSession>;
  log: (input: Omit<ReadingSession, 'id' | 'createdAt' | 'date'> & { date?: string }) => ReadingSession;
  update: (id: string, patch: Partial<ReadingSession>) => void;
  remove: (id: string) => void;
};

export const useSessionsStore = create<SessionsState>()(
  persist(
    (set, get) => ({
      sessions: {},

      log: (input) => {
        const session: ReadingSession = {
          ...input,
          date: input.date ?? todayKey(),
          id: createId('ses'),
          createdAt: Date.now(),
        };
        set((s) => ({ sessions: { ...s.sessions, [session.id]: session } }));
        enqueue('session', 'upsert', session);
        return session;
      },

      update: (id, patch) =>
        set((s) => {
          const session = s.sessions[id];
          if (!session) return s;
          const next = { ...session, ...patch };
          enqueue('session', 'upsert', next);
          return { sessions: { ...s.sessions, [id]: next } };
        }),

      remove: (id) =>
        set((s) => {
          const sessions = { ...s.sessions };
          delete sessions[id];
          enqueue('session', 'delete', { id });
          return { sessions };
        }),
    }),
    { name: 'sessions.v1', storage: createJSONStorage(() => zustandStorage) },
  ),
);

/* ---------------------------- derived data ---------------------------- */

export type DayTotals = { pages: number; minutes: number; sessions: number };

export const pagesIn = (session: ReadingSession) => Math.max(0, session.endPage - session.startPage);

/** yyyy-MM-dd → totals. The backbone of the heatmap, streak and goal rings. */
export function dailyTotals(sessions: Record<string, ReadingSession>): Map<string, DayTotals> {
  const map = new Map<string, DayTotals>();
  Object.values(sessions).forEach((session) => {
    const current = map.get(session.date) ?? { pages: 0, minutes: 0, sessions: 0 };
    current.pages += pagesIn(session);
    current.minutes += session.minutes;
    current.sessions += 1;
    map.set(session.date, current);
  });
  return map;
}

export function totalsForDay(sessions: Record<string, ReadingSession>, date = new Date()): DayTotals {
  return dailyTotals(sessions).get(todayKey(date)) ?? { pages: 0, minutes: 0, sessions: 0 };
}

const dayBefore = (key: string): string => {
  const [y, m, d] = key.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() - 1);
  return todayKey(date);
};

/**
 * Current streak in days.
 *
 * Deliberately forgiving: a streak stays alive all of today even if nothing
 * has been read yet. Guilt is not the point of this app.
 */
export function currentStreak(sessions: Record<string, ReadingSession>, on = new Date()): number {
  const totals = dailyTotals(sessions);
  if (!totals.size) return 0;

  let cursor = todayKey(on);
  if (!totals.has(cursor)) cursor = dayBefore(cursor);

  let streak = 0;
  while (totals.has(cursor)) {
    streak += 1;
    cursor = dayBefore(cursor);
  }
  return streak;
}

export function longestStreak(sessions: Record<string, ReadingSession>): number {
  const days = Array.from(dailyTotals(sessions).keys()).sort();
  let best = 0;
  let run = 0;
  let previous: string | null = null;
  days.forEach((day) => {
    run = previous && dayBefore(day) === previous ? run + 1 : 1;
    best = Math.max(best, run);
    previous = day;
  });
  return best;
}

/** True when the reader has read today — used for the little lit lamp on Home. */
export const readToday = (sessions: Record<string, ReadingSession>) =>
  totalsForDay(sessions).sessions > 0;

export function sessionsForBook(
  sessions: Record<string, ReadingSession>,
  bookId: string,
): ReadingSession[] {
  return Object.values(sessions)
    .filter((s) => s.bookId === bookId)
    .sort((a, b) => b.createdAt - a.createdAt);
}

export function lifetimeTotals(sessions: Record<string, ReadingSession>) {
  let pages = 0;
  let minutes = 0;
  Object.values(sessions).forEach((session) => {
    pages += pagesIn(session);
    minutes += session.minutes;
  });
  return { pages, minutes, days: dailyTotals(sessions).size };
}

/**
 * Average pages/day over the last `window` days that had any reading —
 * a fairer basis for "estimated finish" than dividing by calendar days.
 */
export function readingPace(sessions: Record<string, ReadingSession>, window = 21): number {
  const totals = dailyTotals(sessions);
  const recent = Array.from(totals.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, window);
  if (!recent.length) return 0;
  const pages = recent.reduce((sum, [, day]) => sum + day.pages, 0);
  return pages / recent.length;
}

/** Rolling `days`-long heatmap grid, oldest first. */
export function heatmapData(
  sessions: Record<string, ReadingSession>,
  days = 182,
  on = new Date(),
): { date: string; pages: number; minutes: number }[] {
  const totals = dailyTotals(sessions);
  const out: { date: string; pages: number; minutes: number }[] = [];
  const cursor = new Date(on);
  cursor.setHours(12, 0, 0, 0);
  cursor.setDate(cursor.getDate() - (days - 1));
  for (let i = 0; i < days; i += 1) {
    const key = todayKey(cursor);
    const day = totals.get(key);
    out.push({ date: key, pages: day?.pages ?? 0, minutes: day?.minutes ?? 0 });
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}

/** Pages read per month for a given year, index 0 = January. */
export function monthlyPages(sessions: Record<string, ReadingSession>, year: number): number[] {
  const out = new Array(12).fill(0);
  Object.values(sessions).forEach((session) => {
    const [y, m] = session.date.split('-').map(Number);
    if (y === year) out[m - 1] += pagesIn(session);
  });
  return out;
}
