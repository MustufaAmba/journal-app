import * as ol from './openLibrary';
import * as google from './googleBooks';
import { api } from './client';
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

  // A hand-added book is not in any database. The reader's own copy — synced
  // from their account, or written here in the first place — is the truth.
  if (cached?.source === 'manual') return cached;

  // 1. Ask the server. It holds the canonical cache, it has already filled
  //    Open Library's gaps from Google, and one request beats two or three.
  //    Not patient: we have a copy on the device to fall back to, and waiting
  //    a minute to find out we are offline would be worse than using it.
  const fromServer = await fetchFromServer(id, signal);
  if (fromServer) {
    const merged = mergeBook(cached, fromServer);
    store.cache(merged);
    return merged;
  }

  // 2. The server is unreachable or has never heard of it. The copy already
  //    on the device is still perfectly good — this is the whole point of
  //    keeping one.
  if (cached && !isThin(cached) && Date.now() - (cached.fetchedAt ?? 0) < STALE_AFTER) {
    return cached;
  }

  // 3. Nothing usable anywhere: go and find it ourselves.
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
  /** a photo the reader took of the actual cover, stored on the device */
  coverUrl?: string;
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
    coverUrl: input.coverUrl,
    source: 'manual',
    fetchedAt: Date.now(),
  };
  useBooksStore.getState().put(book);
  return book;
}


/* ------------------------------ the server ------------------------------ */

/**
 * The account's own book cache. Returns null for anything the server cannot
 * answer — offline, cold, or a book it has genuinely never seen — which is
 * the caller's signal to fall back to the device.
 */
async function fetchFromServer(id: string, signal?: AbortSignal): Promise<Book | null> {
  try {
    return fromServerCache(
      await api.get<Record<string, unknown>>(`/books/${encodeURIComponent(id)}`, {
        signal,
        timeoutMs: 8000,
        patient: false,
      }),
    );
  } catch {
    return null;
  }
}

/* --------------------------- restoring a shelf --------------------------- */

/**
 * The server's book cache speaks Mongo, the app speaks Book.
 * Only the fields we actually model are copied across; anything else the
 * document carries (_id, __v, timestamps) is dropped on the floor.
 */
function fromServerCache(doc: Record<string, unknown> | null): Book | null {
  if (!doc) return null;
  const id = (doc.bookId ?? doc.id) as string | undefined;
  const title = doc.title as string | undefined;
  if (!id || !title) return null;

  const str = (key: string) => (typeof doc[key] === 'string' ? (doc[key] as string) : undefined);
  const num = (key: string) => (typeof doc[key] === 'number' ? (doc[key] as number) : undefined);
  const arr = (key: string) => (Array.isArray(doc[key]) ? (doc[key] as string[]) : undefined);

  return {
    id,
    title,
    authors: arr('authors') ?? [],
    genres: arr('genres') ?? [],
    authorKeys: arr('authorKeys'),
    workKey: str('workKey'),
    editionKey: str('editionKey'),
    subtitle: str('subtitle'),
    coverUrl: str('coverUrl'),
    summary: str('summary'),
    publisher: str('publisher'),
    publishedDate: str('publishedDate'),
    firstPublishYear: num('firstPublishYear'),
    isbn10: str('isbn10'),
    isbn13: str('isbn13'),
    pageCount: num('pageCount'),
    language: str('language'),
    series: str('series'),
    seriesPosition: num('seriesPosition'),
    fetchedAt: num('fetchedAt'),
    source: (str('source') as Book['source']) ?? 'openlibrary',
  };
}

/**
 * Puts the books back on a shelf that only has entries.
 *
 * Library entries sync; the book records they point at never did, because the
 * catalogue was only ever a local cache. So signing in on a new phone restored
 * a hundred entries pointing at books the device had never heard of, and the
 * library — which drops any entry whose book is missing — looked empty.
 *
 * The server has been caching every book it ever looked up, so the shelf can
 * simply be asked for again. Results are stored one at a time rather than in a
 * batch at the end, so the shelves fill in as they arrive instead of staying
 * blank until the last one lands.
 */
export async function restoreBooks(
  ids: string[],
  { concurrency = 5 }: { concurrency?: number } = {},
): Promise<{ restored: number; unavailable: string[] }> {
  // A hand-added book was never sent anywhere, so there is nothing to ask for.
  const askable = ids.filter((id) => !id.startsWith('manual_'));
  const unavailable = ids.filter((id) => id.startsWith('manual_'));
  let restored = 0;

  let cursor = 0;
  const worker = async () => {
    while (cursor < askable.length) {
      const id = askable[cursor++];
      try {
        const book = fromServerCache(await api.get<Record<string, unknown>>(`/books/${encodeURIComponent(id)}`));
        if (book) {
          useBooksStore.getState().cache(book);
          restored += 1;
        } else {
          unavailable.push(id);
        }
      } catch {
        // One book the server cannot produce must not stop the other hundred.
        unavailable.push(id);
      }
    }
  };

  await Promise.all(Array.from({ length: Math.min(concurrency, askable.length) }, worker));
  return { restored, unavailable };
}
