import { useMemo } from 'react';
import { useLibraryStore } from '@/store/useLibraryStore';
import { useJournalStore, entriesOnThisDay } from '@/store/useJournalStore';
import { useBooksStore } from '@/store/useBooksStore';
import { isAnniversaryOf, toDate } from '@/lib/date';
import type { Book, JournalEntry, LibraryEntry } from '@/types';

export type Anniversary = {
  entry: LibraryEntry;
  book: Book;
  yearsAgo: number;
};

/**
 * "One year ago today you finished…" — the quiet, lovely feature that only
 * starts paying out after the app has been lived in for a while.
 */
export function useAnniversaries(on: Date = new Date()): Anniversary[] {
  const entries = useLibraryStore((s) => s.entries);
  const books = useBooksStore((s) => s.byId);

  return useMemo(() => {
    const out: Anniversary[] = [];
    Object.values(entries).forEach((entry) => {
      if (!entry.finishedAt || !isAnniversaryOf(entry.finishedAt, on)) return;
      const book = books[entry.bookId];
      if (!book) return;
      out.push({
        entry,
        book,
        yearsAgo: on.getFullYear() - toDate(entry.finishedAt).getFullYear(),
      });
    });
    return out.sort((a, b) => a.yearsAgo - b.yearsAgo);
  }, [entries, books, on]);
}

export type ThisDayMemory = { entry: JournalEntry; book?: Book; yearsAgo: number };

/** Journal entries written on this calendar day in previous years. */
export function useThisDayInReading(on: Date = new Date()): ThisDayMemory[] {
  const journal = useJournalStore((s) => s.entries);
  const books = useBooksStore((s) => s.byId);

  return useMemo(
    () =>
      entriesOnThisDay(journal, on).map((entry) => ({
        entry,
        book: books[entry.bookId],
        yearsAgo: on.getFullYear() - toDate(entry.date).getFullYear(),
      })),
    [journal, books, on],
  );
}
