import * as ol from './openLibrary';
import * as google from './googleBooks';
import { useBooksStore, mergeBook } from '@/store/useBooksStore';
import type { Book } from '@/types';

/** Details older than this are refreshed in the background on next open. */
const STALE_AFTER = 1000 * 60 * 60 * 24 * 30;

const isThin = (book: Book) =>
  !book.summary || !book.pageCount || !book.publisher || !book.coverUrl;

/**
 * Fills the gaps Open Library left, using Google Books.
 * Silently does nothing if Google is unavailable or rate-limited.
 */
async function enrich(book: Book, signal?: AbortSignal): Promise<Book> {
  if (!isThin(book)) return book;

  const patch = book.isbn13 || book.isbn10
    ? await google.lookupByIsbn((book.isbn13 ?? book.isbn10)!, signal)
    : await google.lookupByTitleAuthor(book.title, book.authors[0], signal);

  if (!patch) return book;

  // Only accept fields we are actually missing — Open Library stays canonical.
  const gaps: Partial<Book> = {};
  if (!book.summary && patch.summary) gaps.summary = patch.summary;
  if (!book.pageCount && patch.pageCount) gaps.pageCount = patch.pageCount;
  if (!book.publisher && patch.publisher) gaps.publisher = patch.publisher;
  if (!book.publishedDate && patch.publishedDate) gaps.publishedDate = patch.publishedDate;
  if (!book.coverUrl && patch.coverUrl) gaps.coverUrl = patch.coverUrl;
  if (!book.genres.length && patch.genres?.length) gaps.genres = patch.genres.slice(0, 6);
  if (!book.language && patch.language) gaps.language = patch.language;
  if (!book.isbn13 && patch.isbn13) gaps.isbn13 = patch.isbn13;

  return Object.keys(gaps).length ? mergeBook(book, { ...gaps, source: book.source ?? 'openlibrary' }) : book;
}

/** Search, cache the results so tapping through is instant and offline-safe. */
export async function searchBooks(
  query: string,
  mode: ol.SearchMode = 'all',
  signal?: AbortSignal,
): Promise<Book[]> {
  const results = await ol.search(query, mode, 24, signal);
  useBooksStore.getState().putMany(results);
  return results;
}

/** Scanner path: ISBN in, fully-formed book out. */
export async function lookupIsbn(isbn: string, signal?: AbortSignal): Promise<Book | null> {
  const fromOpenLibrary = await ol.getByIsbn(isbn, signal).catch(() => null);

  if (!fromOpenLibrary) {
    // Open Library has never heard of it — let Google try alone.
    const patch = await google.lookupByIsbn(isbn, signal);
    if (!patch?.title) return null;
    const book: Book = {
      id: `isbn_${isbn}`,
      title: patch.title,
      authors: patch.authors ?? [],
      genres: patch.genres ?? [],
      ...patch,
      source: 'google',
      fetchedAt: Date.now(),
    } as Book;
    useBooksStore.getState().put(book);
    return book;
  }

  const enriched = await enrich(fromOpenLibrary, signal);
  useBooksStore.getState().put(enriched);
  return enriched;
}

/**
 * The details screen's data source. Returns the cached copy immediately via
 * the store, then refreshes it if it is thin or stale.
 */
export async function getBookDetail(id: string, signal?: AbortSignal): Promise<Book> {
  const store = useBooksStore.getState();
  const cached = store.get(id);

  const fresh = cached && !isThin(cached) && Date.now() - (cached.fetchedAt ?? 0) < STALE_AFTER;
  if (fresh) return cached;

  // A manually-added book has nothing to look up.
  if (cached?.source === 'manual') return cached;

  try {
    const workKey = cached?.workKey ?? (id.startsWith('OL') ? `/works/${id}` : undefined);
    const detail = workKey
      ? await ol.getWork(workKey, signal)
      : cached?.isbn13 || cached?.isbn10
        ? await ol.getByIsbn((cached.isbn13 ?? cached.isbn10)!, signal)
        : null;

    if (!detail) return cached ?? Promise.reject(new Error('Book not found'));

    const enriched = await enrich(mergeBook(cached, detail), signal);
    useBooksStore.getState().put(enriched);
    return enriched;
  } catch (error) {
    // Offline or the API is down — the cached copy is still perfectly good.
    if (cached) return cached;
    throw error;
  }
}

export const getAuthor = ol.getAuthor;
export const getSubjectShelf = ol.getSubjectShelf;

export async function getRelatedBooks(book: Book, signal?: AbortSignal): Promise<Book[]> {
  const related = await ol.getRelated(book, signal);
  useBooksStore.getState().putMany(related);
  return related;
}

/** Books added by hand, for the paperback that no database has ever heard of. */
export function createManualBook(input: {
  title: string;
  author?: string;
  pageCount?: number;
  publisher?: string;
  publishedDate?: string;
  summary?: string;
  genres?: string[];
}): Book {
  const book: Book = {
    id: `manual_${Date.now().toString(36)}`,
    title: input.title.trim(),
    authors: input.author?.trim() ? [input.author.trim()] : [],
    genres: input.genres ?? [],
    pageCount: input.pageCount,
    publisher: input.publisher,
    publishedDate: input.publishedDate,
    summary: input.summary,
    source: 'manual',
    fetchedAt: Date.now(),
  };
  useBooksStore.getState().put(book);
  return book;
}
