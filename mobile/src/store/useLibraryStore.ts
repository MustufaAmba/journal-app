import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from '@/lib/storage';
import { createId } from '@/lib/id';
import { todayKey } from '@/lib/date';
import { useBooksStore } from './useBooksStore';
import { enqueue } from './useSyncStore';
import type { Book, LibraryEntry, ShelfId } from '@/types';

type LibraryState = {
  entries: Record<string, LibraryEntry>;

  add: (book: Book, shelf?: ShelfId) => LibraryEntry;
  /** the entry for a book, if it is on any shelf */
  entryForBook: (bookId: string) => LibraryEntry | undefined;
  update: (id: string, patch: Partial<LibraryEntry>) => void;
  moveToShelf: (id: string, shelf: ShelfId) => void;
  toggleFavorite: (id: string) => void;
  setRating: (id: string, rating: number) => void;
  setProgress: (id: string, page: number) => void;
  startReading: (id: string) => void;
  finishReading: (id: string) => void;
  /** put a finished book back on Currently Reading as a re-read */
  reread: (id: string) => void;
  reorder: (shelf: ShelfId, orderedEntryIds: string[]) => void;
  /** Reorders across shelves, for the library's combined "All" view. */
  reorderAcross: (orderedEntryIds: string[]) => void;
  remove: (id: string) => void;
  markCelebrated: (id: string, isoDate: string) => void;
};

const now = () => Date.now();

export const useLibraryStore = create<LibraryState>()(
  persist(
    (set, get) => ({
      entries: {},

      add: (book, shelf = 'wantToRead') => {
        const existing = get().entryForBook(book.id);
        if (existing) {
          if (existing.shelf !== shelf) get().moveToShelf(existing.id, shelf);
          return get().entries[existing.id];
        }

        useBooksStore.getState().put(book);
        // New books go to the front of the shelf, where the reader is looking.
        const lowest = Math.min(
          0,
          ...Object.values(get().entries)
            .filter((e) => e.shelf === shelf)
            .map((e) => e.order),
        );

        const entry: LibraryEntry = {
          id: createId('lib'),
          bookId: book.id,
          shelf,
          order: lowest - 1,
          favorite: false,
          addedAt: now(),
          currentPage: 0,
          celebratedOn: [],
          updatedAt: now(),
          ...(shelf === 'currentlyReading' ? { startedAt: now() } : null),
          ...(shelf === 'finished' ? { startedAt: now(), finishedAt: now() } : null),
        };

        set((s) => ({ entries: { ...s.entries, [entry.id]: entry } }));
        enqueue('library', 'upsert', entry);
        return entry;
      },

      entryForBook: (bookId) => Object.values(get().entries).find((e) => e.bookId === bookId),

      update: (id, patch) =>
        set((s) => {
          const entry = s.entries[id];
          if (!entry) return s;
          const next = { ...entry, ...patch, updatedAt: now() };
          enqueue('library', 'upsert', next);
          return { entries: { ...s.entries, [id]: next } };
        }),

      moveToShelf: (id, shelf) => {
        const entry = get().entries[id];
        if (!entry) return;
        const patch: Partial<LibraryEntry> = { shelf };

        // Moving a book is the most natural way to record when it was read.
        if (shelf === 'currentlyReading' && !entry.startedAt) patch.startedAt = now();
        if (shelf === 'finished') {
          patch.finishedAt = entry.finishedAt ?? now();
          patch.startedAt = entry.startedAt ?? now();
        }
        if (shelf !== 'finished' && entry.finishedAt && shelf !== 'archive') {
          patch.finishedAt = undefined;
        }
        get().update(id, patch);
      },

      toggleFavorite: (id) => {
        const entry = get().entries[id];
        if (!entry) return;
        get().update(id, { favorite: !entry.favorite });
      },

      setRating: (id, rating) => get().update(id, { rating: Math.max(0, Math.min(5, rating)) }),

      setProgress: (id, page) => {
        const entry = get().entries[id];
        if (!entry) return;
        const total = entry.pageCountOverride ?? useBooksStore.getState().get(entry.bookId)?.pageCount;
        const clamped = Math.max(0, total ? Math.min(page, total) : page);
        const patch: Partial<LibraryEntry> = { currentPage: clamped };

        // Reading past page one is a promise that the book is open.
        if (clamped > 0 && entry.shelf === 'wantToRead') {
          patch.shelf = 'currentlyReading';
          patch.startedAt = entry.startedAt ?? now();
        }
        if (total && clamped >= total && entry.shelf !== 'finished') {
          patch.shelf = 'finished';
          patch.finishedAt = now();
        }
        get().update(id, patch);
      },

      startReading: (id) => get().update(id, { shelf: 'currentlyReading', startedAt: now() }),

      finishReading: (id) => {
        const entry = get().entries[id];
        if (!entry) return;
        const total = entry.pageCountOverride ?? useBooksStore.getState().get(entry.bookId)?.pageCount;
        get().update(id, {
          shelf: 'finished',
          finishedAt: now(),
          startedAt: entry.startedAt ?? now(),
          currentPage: total ?? entry.currentPage,
        });
      },

      reread: (id) => {
        const entry = get().entries[id];
        if (!entry?.finishedAt) return;
        const rereads = [
          ...(entry.rereads ?? []),
          { startedAt: entry.startedAt ?? entry.finishedAt, finishedAt: entry.finishedAt },
        ];
        get().update(id, {
          rereads,
          shelf: 'currentlyReading',
          startedAt: now(),
          finishedAt: undefined,
          currentPage: 0,
        });
      },

      reorder: (shelf, orderedEntryIds) =>
        set((s) => {
          const entries = { ...s.entries };
          orderedEntryIds.forEach((id, index) => {
            const entry = entries[id];
            if (!entry || entry.shelf !== shelf) return;
            entries[id] = { ...entry, order: index, updatedAt: now() };
            enqueue('library', 'upsert', entries[id]);
          });
          return { entries };
        }),

      /**
       * `order` is only ever read as an ascending number within a shelf, so
       * numbering every book in one pass keeps each shelf's own sequence
       * intact while giving the combined view a arrangement of its own.
       */
      reorderAcross: (orderedEntryIds) =>
        set((s) => {
          const entries = { ...s.entries };
          orderedEntryIds.forEach((id, index) => {
            const entry = entries[id];
            if (!entry) return;
            entries[id] = { ...entry, order: index, updatedAt: now() };
            enqueue('library', 'upsert', entries[id]);
          });
          return { entries };
        }),

      remove: (id) =>
        set((s) => {
          const entries = { ...s.entries };
          delete entries[id];
          enqueue('library', 'delete', { id });
          return { entries };
        }),

      markCelebrated: (id, isoDate) => {
        const entry = get().entries[id];
        if (!entry || entry.celebratedOn?.includes(isoDate)) return;
        get().update(id, { celebratedOn: [...(entry.celebratedOn ?? []), isoDate] });
      },
    }),
    { name: 'library.v1', storage: createJSONStorage(() => zustandStorage) },
  ),
);

/* ------------------------------------------------------------------ *
 * Selectors — kept out of the store so components subscribe narrowly.
 * ------------------------------------------------------------------ */

export const selectAllEntries = (s: LibraryState) => s.entries;

export const shelfEntries = (entries: Record<string, LibraryEntry>, shelf: ShelfId): LibraryEntry[] =>
  Object.values(entries)
    .filter((e) => (shelf === 'favorites' ? e.favorite && e.shelf !== 'archive' : e.shelf === shelf))
    .sort((a, b) => a.order - b.order || b.addedAt - a.addedAt);

export const shelfCount = (entries: Record<string, LibraryEntry>, shelf: ShelfId): number =>
  shelfEntries(entries, shelf).length;

/** Percentage 0–100 for a single entry. */
export function progressOf(entry: LibraryEntry, pageCount?: number): number {
  const total = entry.pageCountOverride ?? pageCount;
  if (entry.shelf === 'finished') return 100;
  if (!total || total <= 0) return entry.currentPage > 0 ? 5 : 0;
  return Math.max(0, Math.min(100, Math.round((entry.currentPage / total) * 100)));
}

/** The book the home screen offers to pick back up: most recently touched. */
export function continueReading(entries: Record<string, LibraryEntry>): LibraryEntry | undefined {
  return shelfEntries(entries, 'currentlyReading').sort((a, b) => b.updatedAt - a.updatedAt)[0];
}

export function finishedInYear(entries: Record<string, LibraryEntry>, year: number): LibraryEntry[] {
  return Object.values(entries).filter(
    (e) => e.finishedAt && new Date(e.finishedAt).getFullYear() === year,
  );
}

export function finishedOnDate(entries: Record<string, LibraryEntry>, date: Date): LibraryEntry[] {
  const key = todayKey(date);
  return Object.values(entries).filter((e) => e.finishedAt && todayKey(new Date(e.finishedAt)) === key);
}
