import { useMemo } from 'react';
import { useLibraryStore } from '@/store/useLibraryStore';
import { useBooksStore } from '@/store/useBooksStore';
import {
  useSessionsStore,
  lifetimeTotals,
  currentStreak,
  longestStreak,
  monthlyPages,
  heatmapData,
} from '@/store/useSessionsStore';
import type { Book, LibraryEntry } from '@/types';

export type ReadingStats = {
  booksFinished: number;
  booksThisYear: number;
  booksThisMonth: number;
  pagesRead: number;
  /** pages inferred from finished books that were never tracked page-by-page */
  pagesFromFinished: number;
  hoursRead: number;
  daysRead: number;
  streak: number;
  bestStreak: number;
  averageRating: number | null;
  ratedCount: number;
  topGenres: { name: string; count: number }[];
  topAuthors: { name: string; count: number; coverUrl?: string }[];
  monthly: number[];
  heatmap: { date: string; pages: number; minutes: number }[];
  longestBook?: { book: Book; pages: number };
  fastestRead?: { book: Book; days: number };
};

/** Everything the statistics screen needs, computed in one pass. */
export function useStats(year = new Date().getFullYear()): ReadingStats {
  const entries = useLibraryStore((s) => s.entries);
  const books = useBooksStore((s) => s.byId);
  const sessions = useSessionsStore((s) => s.sessions);

  return useMemo(() => {
    const finished = Object.values(entries).filter((e) => e.finishedAt) as (LibraryEntry & {
      finishedAt: number;
    })[];

    const now = new Date();
    const booksThisYear = finished.filter((e) => new Date(e.finishedAt).getFullYear() === year).length;
    const booksThisMonth = finished.filter((e) => {
      const d = new Date(e.finishedAt);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    }).length;

    const { pages, minutes, days } = lifetimeTotals(sessions);

    // Books finished without any logged sessions still represent pages read.
    const trackedBookIds = new Set(Object.values(sessions).map((s) => s.bookId));
    const pagesFromFinished = finished
      .filter((e) => !trackedBookIds.has(e.bookId))
      .reduce((sum, e) => sum + (e.pageCountOverride ?? books[e.bookId]?.pageCount ?? 0), 0);

    const genreCounts = new Map<string, number>();
    const authorCounts = new Map<string, { count: number; coverUrl?: string }>();

    finished.forEach((entry) => {
      const book = books[entry.bookId];
      if (!book) return;
      book.genres.slice(0, 3).forEach((genre) => genreCounts.set(genre, (genreCounts.get(genre) ?? 0) + 1));
      book.authors.slice(0, 2).forEach((author) => {
        const existing = authorCounts.get(author);
        authorCounts.set(author, {
          count: (existing?.count ?? 0) + 1,
          coverUrl: existing?.coverUrl ?? book.coverUrl,
        });
      });
    });

    const rated = finished.filter((e) => e.rating && e.rating > 0);
    const averageRating = rated.length
      ? rated.reduce((sum, e) => sum + (e.rating ?? 0), 0) / rated.length
      : null;

    let longestBook: ReadingStats['longestBook'];
    let fastestRead: ReadingStats['fastestRead'];

    finished.forEach((entry) => {
      const book = books[entry.bookId];
      if (!book) return;

      const pageCount = entry.pageCountOverride ?? book.pageCount ?? 0;
      if (pageCount && (!longestBook || pageCount > longestBook.pages)) {
        longestBook = { book, pages: pageCount };
      }

      if (entry.startedAt && pageCount >= 150) {
        const elapsed = Math.max(1, Math.round((entry.finishedAt - entry.startedAt) / 86_400_000));
        if (!fastestRead || elapsed < fastestRead.days) fastestRead = { book, days: elapsed };
      }
    });

    return {
      booksFinished: finished.length,
      booksThisYear,
      booksThisMonth,
      pagesRead: pages + pagesFromFinished,
      pagesFromFinished,
      hoursRead: minutes / 60,
      daysRead: days,
      streak: currentStreak(sessions),
      bestStreak: longestStreak(sessions),
      averageRating,
      ratedCount: rated.length,
      topGenres: Array.from(genreCounts.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8),
      topAuthors: Array.from(authorCounts.entries())
        .map(([name, meta]) => ({ name, count: meta.count, coverUrl: meta.coverUrl }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 6),
      monthly: monthlyPages(sessions, year),
      heatmap: heatmapData(sessions, 182),
      longestBook,
      fastestRead,
    };
  }, [entries, books, sessions, year]);
}
