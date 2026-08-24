import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from '@/lib/storage';
import type { Book } from '@/types';

/**
 * Every book the reader has ever opened lives here, forever.
 * This is what makes the app work on a plane: the shelves, the journal and
 * the details screen all read from this cache first and only then go online.
 */

type BooksState = {
  byId: Record<string, Book>;
  put: (book: Book) => void;
  putMany: (books: Book[]) => void;
  get: (id: string) => Book | undefined;
  /** merge freshly fetched fields over a cached book without losing what we had */
  merge: (id: string, patch: Partial<Book>) => void;
  remove: (id: string) => void;
};

/** Never let a blank field from one source erase a good value from another. */
export function mergeBook(base: Book | undefined, patch: Partial<Book>): Book {
  const merged: Book = {
    id: patch.id ?? base?.id ?? '',
    title: patch.title || base?.title || 'Untitled',
    authors: patch.authors?.length ? patch.authors : (base?.authors ?? []),
    genres: patch.genres?.length ? patch.genres : (base?.genres ?? []),
    ...base,
  };

  (Object.keys(patch) as (keyof Book)[]).forEach((key) => {
    const value = patch[key];
    if (value === undefined || value === null) return;
    if (typeof value === 'string' && !value.trim()) return;
    if (Array.isArray(value) && !value.length) return;
    // A longer summary is almost always the more useful one.
    if (key === 'summary' && base?.summary && base.summary.length > String(value).length) return;
    (merged as Record<string, unknown>)[key] = value;
  });

  return merged;
}

export const useBooksStore = create<BooksState>()(
  persist(
    (set, get) => ({
      byId: {},
      put: (book) => set((s) => ({ byId: { ...s.byId, [book.id]: mergeBook(s.byId[book.id], book) } })),
      putMany: (books) =>
        set((s) => {
          const next = { ...s.byId };
          books.forEach((book) => {
            next[book.id] = mergeBook(next[book.id], book);
          });
          return { byId: next };
        }),
      get: (id) => get().byId[id],
      merge: (id, patch) =>
        set((s) => {
          const existing = s.byId[id];
          if (!existing) return s;
          return { byId: { ...s.byId, [id]: mergeBook(existing, patch) } };
        }),
      remove: (id) =>
        set((s) => {
          const next = { ...s.byId };
          delete next[id];
          return { byId: next };
        }),
    }),
    { name: 'books.v1', storage: createJSONStorage(() => zustandStorage) },
  ),
);

export const selectBook = (id?: string) => (state: BooksState) => (id ? state.byId[id] : undefined);
