import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from '@/lib/storage';
import { createId } from '@/lib/id';
import { enqueue } from './useSyncStore';
import type { Quote } from '@/types';

type QuotesState = {
  quotes: Record<string, Quote>;
  add: (input: Omit<Quote, 'id' | 'createdAt' | 'updatedAt' | 'favorite' | 'colorIndex'> &
    Partial<Pick<Quote, 'favorite' | 'colorIndex'>>) => Quote;
  update: (id: string, patch: Partial<Quote>) => void;
  toggleFavorite: (id: string) => void;
  remove: (id: string) => void;
};

export const useQuotesStore = create<QuotesState>()(
  persist(
    (set, get) => ({
      quotes: {},

      add: (input) => {
        const stamp = Date.now();
        const quote: Quote = {
          favorite: false,
          // Rotate card colours so a wall of quotes looks like a collage.
          colorIndex: Object.keys(get().quotes).length % 6,
          ...input,
          id: createId('qt'),
          createdAt: stamp,
          updatedAt: stamp,
        };
        set((s) => ({ quotes: { ...s.quotes, [quote.id]: quote } }));
        enqueue('quote', 'upsert', quote);
        return quote;
      },

      update: (id, patch) =>
        set((s) => {
          const quote = s.quotes[id];
          if (!quote) return s;
          const next = { ...quote, ...patch, updatedAt: Date.now() };
          enqueue('quote', 'upsert', next);
          return { quotes: { ...s.quotes, [id]: next } };
        }),

      toggleFavorite: (id) => {
        const quote = get().quotes[id];
        if (quote) get().update(id, { favorite: !quote.favorite });
      },

      remove: (id) =>
        set((s) => {
          const quotes = { ...s.quotes };
          delete quotes[id];
          enqueue('quote', 'delete', { id });
          return { quotes };
        }),
    }),
    { name: 'quotes.v1', storage: createJSONStorage(() => zustandStorage) },
  ),
);

export const allQuotes = (quotes: Record<string, Quote>): Quote[] =>
  Object.values(quotes).sort((a, b) => b.createdAt - a.createdAt);

export const quotesForBook = (quotes: Record<string, Quote>, bookId: string): Quote[] =>
  allQuotes(quotes).filter((q) => q.bookId === bookId);

export const quoteCategories = (quotes: Record<string, Quote>): string[] =>
  Array.from(new Set(Object.values(quotes).map((q) => q.category).filter(Boolean) as string[])).sort();

export const searchQuotes = (quotes: Record<string, Quote>, query: string): Quote[] => {
  const q = query.trim().toLowerCase();
  if (!q) return allQuotes(quotes);
  return allQuotes(quotes).filter((quote) =>
    [quote.text, quote.bookTitle, quote.bookAuthor, quote.speaker, quote.category, quote.chapter]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(q),
  );
};
