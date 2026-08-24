import { getJSON, tryJSON } from './http';
import type { AuthorDetail, Book } from '@/types';

const BASE = 'https://openlibrary.org';
const COVERS = 'https://covers.openlibrary.org';

/** Fields we ask search for, so the response stays small over a phone connection. */
const SEARCH_FIELDS = [
  'key',
  'title',
  'subtitle',
  'author_name',
  'author_key',
  'cover_i',
  'first_publish_year',
  'number_of_pages_median',
  'publisher',
  'subject',
  'language',
  'isbn',
  'edition_key',
].join(',');

export type SearchMode = 'all' | 'title' | 'author' | 'isbn';

type SearchDoc = {
  key: string;
  title: string;
  subtitle?: string;
  author_name?: string[];
  author_key?: string[];
  cover_i?: number;
  first_publish_year?: number;
  number_of_pages_median?: number;
  publisher?: string[];
  subject?: string[];
  language?: string[];
  isbn?: string[];
  edition_key?: string[];
};

export const coverUrl = (coverId?: number | null, size: 'S' | 'M' | 'L' = 'M') =>
  coverId ? `${COVERS}/b/id/${coverId}-${size}.jpg` : undefined;

export const coverUrlFromIsbn = (isbn?: string | null, size: 'S' | 'M' | 'L' = 'M') =>
  isbn ? `${COVERS}/b/isbn/${isbn}-${size}.jpg` : undefined;

export const authorPhotoUrl = (authorKey?: string | null, size: 'S' | 'M' | 'L' = 'M') =>
  authorKey ? `${COVERS}/a/olid/${authorKey.replace('/authors/', '')}-${size}.jpg` : undefined;

const cleanKey = (key: string) => key.replace('/works/', '').replace('/authors/', '');

/** Open Library describes things as either a plain string or {type, value}. */
function readText(value: unknown): string | undefined {
  if (typeof value === 'string') return value.trim() || undefined;
  if (value && typeof value === 'object' && 'value' in value) {
    const inner = (value as { value?: unknown }).value;
    if (typeof inner === 'string') return inner.trim() || undefined;
  }
  return undefined;
}

/** Subjects come back noisy — long, duplicated, sometimes sentence-length. */
function tidySubjects(subjects?: string[]): string[] {
  if (!subjects?.length) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of subjects) {
    const value = raw.replace(/\s+/g, ' ').trim();
    if (!value || value.length > 32 || value.includes('--')) continue;
    // Library-system bookkeeping and bestseller-list tracking tags are not
    // genres, and they are what makes an unfiltered subject list look like a
    // database dump.
    if (/[=<>|]|^nyt:|^\d{4}-\d{2}/i.test(value)) continue;
    if (/^(accessible book|protected daisy|in library|overdrive|internet archive|large type books|reading level)/i.test(value)) continue;
    const title = value.replace(/\b\w/g, (c) => c.toUpperCase());
    const dedupe = title.toLowerCase();
    if (seen.has(dedupe)) continue;
    seen.add(dedupe);
    out.push(title);
    if (out.length >= 8) break;
  }
  return out;
}

function docToBook(doc: SearchDoc): Book {
  const isbns = doc.isbn ?? [];
  const isbn13 = isbns.find((i) => i.length === 13);
  const isbn10 = isbns.find((i) => i.length === 10);
  return {
    id: cleanKey(doc.key),
    workKey: doc.key,
    editionKey: doc.edition_key?.[0],
    title: doc.title,
    subtitle: doc.subtitle,
    authors: doc.author_name ?? [],
    authorKeys: doc.author_key?.map((k) => `/authors/${k}`),
    coverUrl: coverUrl(doc.cover_i, 'L') ?? coverUrlFromIsbn(isbn13 ?? isbn10, 'L'),
    genres: tidySubjects(doc.subject),
    publisher: doc.publisher?.[0],
    firstPublishYear: doc.first_publish_year,
    publishedDate: doc.first_publish_year ? String(doc.first_publish_year) : undefined,
    pageCount: doc.number_of_pages_median,
    language: doc.language?.[0],
    isbn10,
    isbn13,
    source: 'openlibrary',
    fetchedAt: Date.now(),
  };
}

export async function search(
  query: string,
  mode: SearchMode = 'all',
  limit = 24,
  signal?: AbortSignal,
): Promise<Book[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const param =
    mode === 'title'
      ? `title=${encodeURIComponent(trimmed)}`
      : mode === 'author'
        ? `author=${encodeURIComponent(trimmed)}`
        : mode === 'isbn'
          ? `isbn=${encodeURIComponent(trimmed.replace(/[^0-9Xx]/g, ''))}`
          : `q=${encodeURIComponent(trimmed)}`;

  const url = `${BASE}/search.json?${param}&fields=${SEARCH_FIELDS}&limit=${limit}`;
  const data = await getJSON<{ docs: SearchDoc[] }>(url, { signal });
  return (data.docs ?? []).filter((d) => d.key && d.title).map(docToBook);
}

type WorkResponse = {
  key: string;
  title: string;
  subtitle?: string;
  description?: unknown;
  subjects?: string[];
  covers?: number[];
  first_publish_date?: string;
  authors?: { author?: { key: string } }[];
};

type EditionResponse = {
  key: string;
  title?: string;
  subtitle?: string;
  publishers?: string[];
  publish_date?: string;
  number_of_pages?: number;
  isbn_10?: string[];
  isbn_13?: string[];
  languages?: { key: string }[];
  covers?: number[];
  series?: string[];
  description?: unknown;
  works?: { key: string }[];
  authors?: { key: string }[];
};

const LANGUAGE_NAMES: Record<string, string> = {
  eng: 'English',
  fre: 'French',
  ger: 'German',
  spa: 'Spanish',
  ita: 'Italian',
  por: 'Portuguese',
  rus: 'Russian',
  jpn: 'Japanese',
  chi: 'Chinese',
  hin: 'Hindi',
  ara: 'Arabic',
  dut: 'Dutch',
  swe: 'Swedish',
  kor: 'Korean',
};

export const languageName = (code?: string) =>
  code ? (LANGUAGE_NAMES[code.toLowerCase()] ?? code.toUpperCase()) : undefined;

/** Parses "Book 2 of The Wayfarers" / "The Wayfarers, #2" into name + position. */
function isEnglishEdition(edition: EditionResponse): boolean {
  const languages = edition.languages ?? [];
  // An edition with no language recorded is usually the English original.
  if (!languages.length) return true;
  return languages.some((l) => l.key === '/languages/eng');
}

function parseSeries(raw?: string): { series?: string; seriesPosition?: number } {
  if (!raw) return {};
  const hashed = raw.match(/^(.*?)[,;]?\s*#\s*(\d+)/);
  if (hashed) return { series: hashed[1].trim(), seriesPosition: Number(hashed[2]) };
  const worded = raw.match(/^(?:book|vol(?:ume)?\.?)\s*(\d+)\s*(?:of|in)\s*(.+)$/i);
  if (worded) return { series: worded[2].trim(), seriesPosition: Number(worded[1]) };
  return { series: raw.trim() };
}

/** Full work record, enriched with its most complete edition. */
export async function getWork(workKey: string, signal?: AbortSignal): Promise<Book> {
  const key = workKey.startsWith('/works/') ? workKey : `/works/${workKey}`;
  const work = await getJSON<WorkResponse>(`${BASE}${key}.json`, { signal });

  const [editions, authorNames] = await Promise.all([
    tryJSON<{ entries: EditionResponse[] }>(`${BASE}${key}/editions.json?limit=12`, { signal }),
    resolveAuthorNames(work.authors?.map((a) => a.author?.key).filter(Boolean) as string[], signal),
  ]);

  // Prefer the edition that actually tells us something: page count first,
  // then ISBN — but only after narrowing to editions the reader is likely to
  // be holding. Skipping the language filter tends to surface a translation,
  // so the book page ends up quoting a foreign publisher and page count.
  const entries = editions?.entries ?? [];
  const english = entries.filter(isEnglishEdition);
  const pool = english.length ? english : entries;

  const best =
    pool.find((e) => e.number_of_pages && (e.isbn_13?.length || e.isbn_10?.length)) ??
    pool.find((e) => e.number_of_pages) ??
    pool.find((e) => e.isbn_13?.length || e.isbn_10?.length) ??
    pool[0];

  const { series, seriesPosition } = parseSeries(best?.series?.[0]);

  return {
    id: cleanKey(work.key),
    workKey: work.key,
    editionKey: best?.key?.replace('/books/', ''),
    title: work.title,
    subtitle: work.subtitle ?? best?.subtitle,
    authors: authorNames,
    authorKeys: work.authors?.map((a) => a.author?.key).filter(Boolean) as string[] | undefined,
    coverUrl: coverUrl(work.covers?.[0] ?? best?.covers?.[0], 'L'),
    summary: readText(work.description) ?? readText(best?.description),
    genres: tidySubjects(work.subjects),
    publisher: best?.publishers?.[0],
    publishedDate: best?.publish_date ?? work.first_publish_date,
    firstPublishYear: parseYear(work.first_publish_date ?? best?.publish_date),
    isbn13: best?.isbn_13?.[0],
    isbn10: best?.isbn_10?.[0],
    pageCount: best?.number_of_pages,
    language: languageName(best?.languages?.[0]?.key?.replace('/languages/', '')),
    series,
    seriesPosition,
    source: 'openlibrary',
    fetchedAt: Date.now(),
  };
}

/** Barcode / ISBN lookup. Resolves the edition, then folds in its work. */
export async function getByIsbn(isbnRaw: string, signal?: AbortSignal): Promise<Book | null> {
  const isbn = isbnRaw.replace(/[^0-9Xx]/g, '');
  if (isbn.length !== 10 && isbn.length !== 13) return null;

  const edition = await tryJSON<EditionResponse>(`${BASE}/isbn/${isbn}.json`, { signal });
  if (!edition) {
    // Fall back to search — it indexes many ISBNs the direct route misses.
    const results = await search(isbn, 'isbn', 1, signal);
    return results[0] ?? null;
  }

  const workKey = edition.works?.[0]?.key;
  const base: Book = workKey
    ? await getWork(workKey, signal).catch(() => emptyBookFromEdition(edition, isbn))
    : emptyBookFromEdition(edition, isbn);

  const { series, seriesPosition } = parseSeries(edition.series?.[0]);
  return {
    ...base,
    // The scanned edition is the reader's actual copy — its details win.
    editionKey: edition.key?.replace('/books/', '') ?? base.editionKey,
    isbn13: edition.isbn_13?.[0] ?? (isbn.length === 13 ? isbn : base.isbn13),
    isbn10: edition.isbn_10?.[0] ?? (isbn.length === 10 ? isbn : base.isbn10),
    pageCount: edition.number_of_pages ?? base.pageCount,
    publisher: edition.publishers?.[0] ?? base.publisher,
    publishedDate: edition.publish_date ?? base.publishedDate,
    coverUrl: base.coverUrl ?? coverUrl(edition.covers?.[0], 'L') ?? coverUrlFromIsbn(isbn, 'L'),
    series: series ?? base.series,
    seriesPosition: seriesPosition ?? base.seriesPosition,
    language: languageName(edition.languages?.[0]?.key?.replace('/languages/', '')) ?? base.language,
  };
}

function emptyBookFromEdition(edition: EditionResponse, isbn: string): Book {
  return {
    id: edition.key?.replace('/books/', '') ?? isbn,
    title: edition.title ?? 'Untitled',
    authors: [],
    genres: [],
    coverUrl: coverUrl(edition.covers?.[0], 'L') ?? coverUrlFromIsbn(isbn, 'L'),
    source: 'openlibrary',
    fetchedAt: Date.now(),
  };
}

type AuthorResponse = {
  key: string;
  name: string;
  bio?: unknown;
  birth_date?: string;
  death_date?: string;
  photos?: number[];
};

const authorNameCache = new Map<string, string>();

async function resolveAuthorNames(keys: string[] | undefined, signal?: AbortSignal): Promise<string[]> {
  if (!keys?.length) return [];
  const results = await Promise.all(
    keys.slice(0, 4).map(async (key) => {
      const cached = authorNameCache.get(key);
      if (cached) return cached;
      const author = await tryJSON<AuthorResponse>(`${BASE}${key}.json`, { signal });
      if (author?.name) authorNameCache.set(key, author.name);
      return author?.name;
    }),
  );
  return results.filter(Boolean) as string[];
}

export async function getAuthor(authorKey: string, signal?: AbortSignal): Promise<AuthorDetail> {
  const key = authorKey.startsWith('/authors/') ? authorKey : `/authors/${authorKey}`;
  const [author, works] = await Promise.all([
    getJSON<AuthorResponse>(`${BASE}${key}.json`, { signal }),
    tryJSON<{ entries: { key: string; title: string; covers?: number[] }[] }>(
      `${BASE}${key}/works.json?limit=12`,
      { signal },
    ),
  ]);

  return {
    key,
    name: author.name,
    bio: readText(author.bio),
    birthDate: author.birth_date,
    deathDate: author.death_date,
    photoUrl: authorPhotoUrl(key, 'M'),
    topWorks: (works?.entries ?? [])
      .filter((w) => w.title)
      .slice(0, 10)
      .map((w) => ({
        id: cleanKey(w.key),
        title: w.title,
        coverUrl: coverUrl(w.covers?.[0], 'M'),
      })),
  };
}

/**
 * "Related books" with no recommendation engine: other work by the same
 * author, then other books sharing this book's strongest subject.
 */
export async function getRelated(book: Book, signal?: AbortSignal): Promise<Book[]> {
  const out: Book[] = [];
  const seen = new Set([book.id]);

  const push = (candidates: Book[]) => {
    for (const candidate of candidates) {
      if (seen.has(candidate.id)) continue;
      seen.add(candidate.id);
      out.push(candidate);
    }
  };

  if (book.authors[0]) {
    const byAuthor = await search(book.authors[0], 'author', 10, signal).catch(() => []);
    push(byAuthor);
  }

  const subject = book.genres[0];
  if (subject && out.length < 12) {
    const slug = subject.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
    const data = await tryJSON<{ works: SearchDoc[] }>(
      `${BASE}/subjects/${slug}.json?limit=12`,
      { signal },
    );
    push(
      (data?.works ?? []).map((w) =>
        docToBook({
          ...w,
          author_name: (w as unknown as { authors?: { name: string }[] }).authors?.map((a) => a.name),
        }),
      ),
    );
  }

  return out.slice(0, 12);
}

/** Curated shelf used for "Books you might enjoy" when the library is still small. */
export async function getSubjectShelf(subject: string, limit = 12, signal?: AbortSignal): Promise<Book[]> {
  const slug = subject.toLowerCase().replace(/[^a-z0-9]+/g, '_');
  const data = await tryJSON<{ works: (SearchDoc & { authors?: { name: string }[] })[] }>(
    `${BASE}/subjects/${slug}.json?limit=${limit}`,
    { signal },
  );
  return (data?.works ?? []).map((w) =>
    docToBook({ ...w, author_name: w.authors?.map((a) => a.name) }),
  );
}

function parseYear(value?: string): number | undefined {
  if (!value) return undefined;
  const match = value.match(/\d{4}/);
  return match ? Number(match[0]) : undefined;
}
