import { tryJSON } from './http';
import type { Book } from '@/types';

/**
 * Google Books is the *understudy*: Open Library is the primary source and
 * this only fills in blanks (usually summary, page count, publisher, cover).
 *
 * Anonymous calls are aggressively rate-limited, so every function here is
 * best-effort and returns null rather than throwing. Drop a key into
 * EXPO_PUBLIC_GOOGLE_BOOKS_KEY to raise the ceiling; it works fine without one.
 */

const BASE = 'https://www.googleapis.com/books/v1/volumes';
const KEY = process.env.EXPO_PUBLIC_GOOGLE_BOOKS_KEY;

type Volume = {
  id: string;
  volumeInfo?: {
    title?: string;
    subtitle?: string;
    authors?: string[];
    publisher?: string;
    publishedDate?: string;
    description?: string;
    pageCount?: number;
    categories?: string[];
    language?: string;
    imageLinks?: { thumbnail?: string; smallThumbnail?: string };
    industryIdentifiers?: { type: string; identifier: string }[];
  };
};

const withKey = (url: string) => (KEY ? `${url}&key=${KEY}` : url);

/** Google's thumbnails are http and postage-stamp sized by default. */
function upgradeImage(url?: string): string | undefined {
  if (!url) return undefined;
  return url.replace(/^http:/, 'https:').replace(/&zoom=\d/, '&zoom=1').replace(/&edge=curl/, '');
}

function toPartialBook(volume: Volume): Partial<Book> {
  const info = volume.volumeInfo ?? {};
  const ids = info.industryIdentifiers ?? [];
  return {
    title: info.title,
    subtitle: info.subtitle,
    authors: info.authors,
    summary: info.description,
    publisher: info.publisher,
    publishedDate: info.publishedDate,
    pageCount: info.pageCount,
    genres: info.categories,
    language: info.language,
    coverUrl: upgradeImage(info.imageLinks?.thumbnail ?? info.imageLinks?.smallThumbnail),
    isbn13: ids.find((i) => i.type === 'ISBN_13')?.identifier,
    isbn10: ids.find((i) => i.type === 'ISBN_10')?.identifier,
  };
}

async function firstVolume(query: string, signal?: AbortSignal): Promise<Volume | null> {
  const data = await tryJSON<{ items?: Volume[] }>(
    withKey(`${BASE}?q=${encodeURIComponent(query)}&maxResults=3`),
    { signal, timeoutMs: 7000, retries: 0 },
  );
  return data?.items?.[0] ?? null;
}

export async function lookupByIsbn(isbn: string, signal?: AbortSignal): Promise<Partial<Book> | null> {
  const volume = await firstVolume(`isbn:${isbn.replace(/[^0-9Xx]/g, '')}`, signal);
  return volume ? toPartialBook(volume) : null;
}

export async function lookupByTitleAuthor(
  title: string,
  author?: string,
  signal?: AbortSignal,
): Promise<Partial<Book> | null> {
  const query = author
    ? `intitle:${JSON.stringify(title)}+inauthor:${JSON.stringify(author)}`
    : `intitle:${JSON.stringify(title)}`;
  const volume = await firstVolume(query, signal);
  if (!volume) return null;

  // Guard against Google confidently returning a different book.
  const returnedTitle = volume.volumeInfo?.title?.toLowerCase() ?? '';
  const wanted = title.toLowerCase();
  const looksRight =
    returnedTitle.includes(wanted.slice(0, Math.min(wanted.length, 18))) ||
    wanted.includes(returnedTitle.slice(0, Math.min(returnedTitle.length, 18)));
  return looksRight ? toPartialBook(volume) : null;
}
