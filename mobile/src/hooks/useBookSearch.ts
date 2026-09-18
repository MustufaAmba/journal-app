import { useQuery, useQueryClient } from '@tanstack/react-query';
import { searchBooks, getBookDetail, getRelatedBooks, getAuthor, getSubjectShelf } from '@/api/books';
import type { SearchMode } from '@/api/openLibrary';
import { useBooksStore } from '@/store/useBooksStore';
import type { Book } from '@/types';

/**
 * None of these set a staleTime.
 *
 * They all used to — up to a day for an author — which meant the app would
 * happily show a day-old answer without ever asking. The rule now is the one
 * in App.tsx: if there is a network, ask; whatever was fetched before is shown
 * immediately underneath so nothing waits, and if the request fails that copy
 * is simply what you keep.
 */

export function useBookSearch(query: string, mode: SearchMode = 'all') {
  return useQuery({
    queryKey: ['search', mode, query],
    queryFn: ({ signal }) => searchBooks(query, mode, signal),
    enabled: query.trim().length >= 2,
    // A failed search should show the empty state, not spin forever.
    retry: 1,
  });
}

export function useBookDetail(id?: string) {
  const cached = useBooksStore((s) => (id ? s.byId[id] : undefined));

  return useQuery({
    queryKey: ['book', id],
    queryFn: ({ signal }) => getBookDetail(id!, signal),
    enabled: Boolean(id),
    // Show the cached copy instantly while the fresh one loads behind it.
    placeholderData: cached,
  });
}

export function useRelatedBooks(book?: Book) {
  return useQuery({
    queryKey: ['related', book?.id],
    queryFn: ({ signal }) => getRelatedBooks(book!, signal),
    enabled: Boolean(book?.id),
    retry: 0,
  });
}

export function useAuthorDetail(authorKey?: string) {
  return useQuery({
    queryKey: ['author', authorKey],
    queryFn: ({ signal }) => getAuthor(authorKey!, signal),
    enabled: Boolean(authorKey),
    retry: 1,
  });
}

/** "Books you might enjoy" — a curated subject shelf, refreshed daily. */
export function useSubjectShelf(subject: string, enabled = true) {
  return useQuery({
    queryKey: ['subject', subject],
    queryFn: ({ signal }) => getSubjectShelf(subject, 12, signal),
    enabled: enabled && Boolean(subject),
    retry: 0,
  });
}

/** Warm the cache for a book the reader is about to open. */
export function usePrefetchBook() {
  const client = useQueryClient();
  return (id: string) =>
    client.prefetchQuery({
      queryKey: ['book', id],
      queryFn: ({ signal }) => getBookDetail(id, signal),
      // Unlike the rest, this one keeps a short window: it fires while the
      // reader scrolls past a cover, and re-fetching a book nobody has opened
      // is waste rather than freshness. Opening it still refetches.
      staleTime: 1000 * 60 * 5,
    });
}
