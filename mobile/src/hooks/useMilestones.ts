import { useEffect, useRef } from 'react';
import { useLibraryStore } from '@/store/useLibraryStore';
import { useSessionsStore, currentStreak, lifetimeTotals } from '@/store/useSessionsStore';
import { useJournalStore } from '@/store/useJournalStore';
import { useBooksStore } from '@/store/useBooksStore';
import { useGoalsStore } from '@/store/useGoalsStore';
import { useCelebration } from '@/components/CelebrationProvider';
import type { Achievement } from '@/types';

/**
 * Watches the reader's own data and quietly posts a postcard when something
 * worth marking happens.
 *
 * Deliberately *not* gamified: no points, no levels, no nagging. A milestone
 * either produces one warm sentence or it produces nothing at all.
 */

const BOOK_MILESTONES = [1, 5, 10, 25, 50, 75, 100, 150, 200];
const PAGE_MILESTONES = [1_000, 5_000, 10_000, 25_000, 50_000, 100_000];
const STREAK_MILESTONES = [3, 7, 14, 30, 60, 100, 365];
const JOURNAL_MILESTONES = [1, 10, 25, 50, 100, 250];

type Awardable = Omit<Achievement, 'id' | 'earnedAt' | 'seen'>;

function bookPostcard(count: number): Awardable {
  if (count === 1) {
    return {
      kind: 'firstBook',
      title: 'Your first finished book',
      message: 'The first one in the journal. There is a whole shelf waiting behind it.',
      scene: 'shelf',
    };
  }
  return {
    kind: 'booksMilestone',
    title: `${count} books`,
    message:
      count >= 100
        ? 'One hundred books. That is a small library and a very large number of evenings.'
        : `${count} books finished and written down. Quietly impressive.`,
    scene: count >= 50 ? 'window' : 'shelf',
  };
}

export function useMilestones() {
  const { celebrate } = useCelebration();
  const entries = useLibraryStore((s) => s.entries);
  const sessions = useSessionsStore((s) => s.sessions);
  const journal = useJournalStore((s) => s.entries);
  const books = useBooksStore((s) => s.byId);
  const award = useGoalsStore((s) => s.award);
  const goals = useGoalsStore((s) => s.goals);

  // Skip the very first pass so opening the app on an existing library does
  // not fire a barrage of postcards for things that happened months ago.
  const primed = useRef(false);

  useEffect(() => {
    const post = (input: Awardable) => {
      const achievement = award(input);
      if (!achievement || !primed.current) return;
      celebrate({
        eyebrow: 'A postcard for you',
        title: achievement.title,
        message: achievement.message,
      });
    };

    const finished = Object.values(entries).filter((e) => e.finishedAt);
    const finishedCount = finished.length;
    BOOK_MILESTONES.filter((m) => finishedCount >= m).forEach((m) => post(bookPostcard(m)));

    const { pages } = lifetimeTotals(sessions);
    PAGE_MILESTONES.filter((m) => pages >= m).forEach((m) =>
      post({
        kind: 'pagesMilestone',
        title: `${m.toLocaleString()} pages`,
        message: 'Page by page, mostly in the evenings. It adds up to something lovely.',
        scene: 'lamp',
      }),
    );

    const streak = currentStreak(sessions);
    STREAK_MILESTONES.filter((m) => streak >= m).forEach((m) =>
      post({
        kind: 'streak',
        title: `${m} days in a row`,
        message:
          m >= 100
            ? 'A hundred days of reading. This is not a habit any more, it is who you are.'
            : `${m} days running. A little every day is the whole secret.`,
        scene: 'lamp',
      }),
    );

    const journalCount = Object.values(journal).filter((e) => !e.draft).length;
    JOURNAL_MILESTONES.filter((m) => journalCount >= m).forEach((m) =>
      post({
        kind: 'journalMilestone',
        title: m === 1 ? 'Your first journal entry' : `${m} journal entries`,
        message:
          m === 1
            ? 'The first page of the diary. In a year this will be your favourite thing to reread.'
            : 'A whole diary of reading, in your own words.',
        scene: 'cafe',
      }),
    );

    // Genres, counted only across books actually finished.
    const genres = new Set<string>();
    finished.forEach((entry) => books[entry.bookId]?.genres.slice(0, 3).forEach((g) => genres.add(g)));
    if (genres.size >= 8) {
      post({
        kind: 'genreExplorer',
        title: 'Well travelled',
        message: `Eight different corners of the bookshop, and counting.`,
        scene: 'forest',
      });
    }

    // Anything read between midnight and 4am.
    const nightOwl = Object.values(sessions).some((s) => {
      const hour = new Date(s.createdAt).getHours();
      return hour >= 0 && hour < 4;
    });
    if (nightOwl) {
      post({
        kind: 'nightOwl',
        title: 'One more chapter',
        message: 'Caught reading past midnight. No judgement here — only recognition.',
        scene: 'stars',
      });
    }

    const thisYear = new Date().getFullYear();
    const finishedThisYear = finished.filter(
      (e) => new Date(e.finishedAt!).getFullYear() === thisYear,
    ).length;
    if (goals.booksPerYear > 0 && finishedThisYear >= goals.booksPerYear) {
      post({
        kind: 'yearGoal',
        title: `${thisYear}’s goal, met`,
        message: `${goals.booksPerYear} books this year. Everything from here is a bonus.`,
        scene: 'window',
      });
    }

    primed.current = true;
  }, [entries, sessions, journal, books, goals, award, celebrate]);
}
