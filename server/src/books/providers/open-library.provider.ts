import { HttpException, Injectable, Logger } from '@nestjs/common';

/**
 * Open Library is the primary source for everything.
 *
 * It is free, has no key, and is occasionally slow or briefly unavailable, so
 * every call has a timeout and one retry. Anything it cannot answer is left
 * for the Google Books fallback rather than failing the request.
 */

/**
 * Upstream JSON is genuinely unstructured — Open Library returns different
 * shapes for the same field depending on the record's age. Everything is
 * narrowed by hand as it is read, so the raw payloads stay loosely typed.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = Record<string, any>;

export type NormalisedBook = {
  bookId: string;
  workKey?: string;
  editionKey?: string;
  title: string;
  subtitle?: string;
  authors: string[];
  authorKeys?: string[];
  coverUrl?: string;
  summary?: string;
  genres: string[];
  publisher?: string;
  publishedDate?: string;
  firstPublishYear?: number;
  isbn13?: string;
  isbn10?: string;
  pageCount?: number;
  language?: string;
  series?: string;
  seriesPosition?: number;
  source: 'openlibrary' | 'google' | 'manual';
};

const BASE = 'https://openlibrary.org';
const COVERS = 'https://covers.openlibrary.org';

const SEARCH_FIELDS = [
  'key', 'title', 'subtitle', 'author_name', 'author_key', 'cover_i',
  'first_publish_year', 'number_of_pages_median', 'publisher', 'subject',
  'language', 'isbn', 'edition_key',
].join(',');

const LANGUAGES: Record<string, string> = {
  eng: 'English', fre: 'French', ger: 'German', spa: 'Spanish', ita: 'Italian',
  por: 'Portuguese', rus: 'Russian', jpn: 'Japanese', chi: 'Chinese',
  hin: 'Hindi', ara: 'Arabic', dut: 'Dutch', swe: 'Swedish', kor: 'Korean',
};

@Injectable()
export class OpenLibraryProvider {
  private readonly logger = new Logger(OpenLibraryProvider.name);

  private async get<T>(path: string, timeoutMs = 10_000, retries = 1): Promise<T | null> {
    for (let attempt = 0; attempt <= retries; attempt += 1) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await fetch(`${BASE}${path}`, {
          signal: controller.signal,
          headers: {
            Accept: 'application/json',
            // Open Library asks that clients identify themselves.
            'User-Agent': 'Marginalia/1.0 (personal book journal)',
          },
        });
        if (response.status === 404) return null;
        if (!response.ok) throw new Error(`Open Library responded ${response.status}`);
        return (await response.json()) as T;
      } catch (error) {
        if (attempt === retries) {
          this.logger.warn(`${path} failed: ${error instanceof Error ? error.message : error}`);
          return null;
        }
        await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
      } finally {
        clearTimeout(timer);
      }
    }
    return null;
  }

  private text(value: unknown): string | undefined {
    if (typeof value === 'string') return value.trim() || undefined;
    if (value && typeof value === 'object' && 'value' in value) {
      const inner = (value as { value?: unknown }).value;
      if (typeof inner === 'string') return inner.trim() || undefined;
    }
    return undefined;
  }

  /** Subjects come back long, duplicated and often sentence-shaped. */
  private tidySubjects(subjects?: string[]): string[] {
    if (!subjects?.length) return [];
    const seen = new Set<string>();
    const out: string[] = [];
    for (const raw of subjects) {
      const value = raw.replace(/\s+/g, ' ').trim();
      if (!value || value.length > 32 || value.includes('--')) continue;
      // Library-system bookkeeping and bestseller-list tracking tags are not
      // genres, and they are what makes an unfiltered subject list look like
      // a database dump.
      if (/[=<>|]|^nyt:|^\d{4}-\d{2}/i.test(value)) continue;
      if (/^(accessible book|protected daisy|in library|overdrive|internet archive|large type books|reading level)/i.test(value)) continue;
      const title = value.replace(/\b\w/g, (c) => c.toUpperCase());
      if (seen.has(title.toLowerCase())) continue;
      seen.add(title.toLowerCase());
      out.push(title);
      if (out.length >= 8) break;
    }
    return out;
  }

  private parseSeries(raw?: string) {
    if (!raw) return {};
    const hashed = raw.match(/^(.*?)[,;]?\s*#\s*(\d+)/);
    if (hashed) return { series: hashed[1].trim(), seriesPosition: Number(hashed[2]) };
    const worded = raw.match(/^(?:book|vol(?:ume)?\.?)\s*(\d+)\s*(?:of|in)\s*(.+)$/i);
    if (worded) return { series: worded[2].trim(), seriesPosition: Number(worded[1]) };
    return { series: raw.trim() };
  }

  private isEnglish(edition: Json): boolean {
    const languages: { key?: string }[] = edition?.languages ?? [];
    // An edition with no language recorded is usually the English original.
    if (!languages.length) return true;
    return languages.some((l) => l.key === '/languages/eng');
  }

  private year(value?: string) {
    const match = value?.match(/\d{4}/);
    return match ? Number(match[0]) : undefined;
  }

  cover(coverId?: number | null, size: 'S' | 'M' | 'L' = 'L') {
    return coverId ? `${COVERS}/b/id/${coverId}-${size}.jpg` : undefined;
  }

  async search(query: string, mode: 'all' | 'title' | 'author' | 'isbn', limit = 20) {
    const param =
      mode === 'title' ? `title=${encodeURIComponent(query)}`
      : mode === 'author' ? `author=${encodeURIComponent(query)}`
      : mode === 'isbn' ? `isbn=${encodeURIComponent(query.replace(/[^0-9Xx]/g, ''))}`
      : `q=${encodeURIComponent(query)}`;

    const data = await this.get<{ docs: Json[] }>(
      `/search.json?${param}&fields=${SEARCH_FIELDS}&limit=${limit}`,
    );
    if (!data?.docs) return [];

    return data.docs
      .filter((doc: Json) => doc.key && doc.title)
      .map((doc: Json) => {
        const isbns: string[] = doc.isbn ?? [];
        const isbn13 = isbns.find((i) => i.length === 13);
        const isbn10 = isbns.find((i) => i.length === 10);
        const book: NormalisedBook = {
          bookId: String(doc.key).replace('/works/', ''),
          workKey: doc.key,
          editionKey: doc.edition_key?.[0],
          title: doc.title,
          subtitle: doc.subtitle,
          authors: doc.author_name ?? [],
          authorKeys: (doc.author_key ?? []).map((k: string) => `/authors/${k}`),
          coverUrl:
            this.cover(doc.cover_i) ??
            (isbn13 || isbn10 ? `${COVERS}/b/isbn/${isbn13 ?? isbn10}-L.jpg` : undefined),
          genres: this.tidySubjects(doc.subject),
          publisher: doc.publisher?.[0],
          firstPublishYear: doc.first_publish_year,
          publishedDate: doc.first_publish_year ? String(doc.first_publish_year) : undefined,
          pageCount: doc.number_of_pages_median,
          language: LANGUAGES[doc.language?.[0]] ?? doc.language?.[0],
          isbn13,
          isbn10,
          source: 'openlibrary',
        };
        return book;
      });
  }

  async getWork(workKey: string): Promise<NormalisedBook | null> {
    const key = workKey.startsWith('/works/') ? workKey : `/works/${workKey}`;
    const work = await this.get<Json>(`${key}.json`);
    if (!work) return null;

    const [editions, authors] = await Promise.all([
      this.get<{ entries: Json[] }>(`${key}/editions.json?limit=12`),
      this.resolveAuthors(
        (work.authors ?? []).map((a: { author?: { key: string } }) => a.author?.key).filter(Boolean),
      ),
    ]);

    // Prefer an edition in the language the reader is most likely holding.
    // Without this the "most complete" edition is often a translation, and the
    // book page ends up quoting a foreign publisher and page count.
    const entries = editions?.entries ?? [];
    const preferred = entries.filter((e) => this.isEnglish(e));
    const pool = preferred.length ? preferred : entries;

    const best =
      pool.find((e) => e.number_of_pages && (e.isbn_13?.length || e.isbn_10?.length)) ??
      pool.find((e) => e.number_of_pages) ??
      pool.find((e) => e.isbn_13?.length || e.isbn_10?.length) ??
      pool[0];

    const { series, seriesPosition } = this.parseSeries(best?.series?.[0]);

    return {
      bookId: String(work.key).replace('/works/', ''),
      workKey: work.key,
      editionKey: best?.key?.replace('/books/', ''),
      title: work.title,
      subtitle: work.subtitle ?? best?.subtitle,
      authors,
      authorKeys: (work.authors ?? [])
        .map((a: { author?: { key: string } }) => a.author?.key)
        .filter(Boolean),
      coverUrl: this.cover(work.covers?.[0] ?? best?.covers?.[0]),
      summary: this.text(work.description) ?? this.text(best?.description),
      genres: this.tidySubjects(work.subjects),
      publisher: best?.publishers?.[0],
      publishedDate: best?.publish_date ?? work.first_publish_date,
      firstPublishYear: this.year(work.first_publish_date ?? best?.publish_date),
      isbn13: best?.isbn_13?.[0],
      isbn10: best?.isbn_10?.[0],
      pageCount: best?.number_of_pages,
      language: LANGUAGES[best?.languages?.[0]?.key?.replace('/languages/', '')],
      series,
      seriesPosition,
      source: 'openlibrary',
    };
  }

  async getByIsbn(isbnRaw: string): Promise<NormalisedBook | null> {
    const isbn = isbnRaw.replace(/[^0-9Xx]/g, '');
    if (isbn.length !== 10 && isbn.length !== 13) {
      throw new HttpException('That is not a valid ISBN.', 400);
    }

    const edition = await this.get<Json>(`/isbn/${isbn}.json`);
    if (!edition) {
      const [first] = await this.search(isbn, 'isbn', 1);
      return first ?? null;
    }

    const workKey = edition.works?.[0]?.key;
    const base = workKey ? await this.getWork(workKey) : null;

    const fallback: NormalisedBook = {
      bookId: edition.key?.replace('/books/', '') ?? isbn,
      title: edition.title ?? 'Untitled',
      authors: [],
      genres: [],
      source: 'openlibrary',
    };

    const merged = base ?? fallback;
    const { series, seriesPosition } = this.parseSeries(edition.series?.[0]);

    // The scanned edition is the reader's actual copy, so its details win.
    return {
      ...merged,
      editionKey: edition.key?.replace('/books/', '') ?? merged.editionKey,
      isbn13: edition.isbn_13?.[0] ?? (isbn.length === 13 ? isbn : merged.isbn13),
      isbn10: edition.isbn_10?.[0] ?? (isbn.length === 10 ? isbn : merged.isbn10),
      pageCount: edition.number_of_pages ?? merged.pageCount,
      publisher: edition.publishers?.[0] ?? merged.publisher,
      publishedDate: edition.publish_date ?? merged.publishedDate,
      coverUrl: merged.coverUrl ?? this.cover(edition.covers?.[0]) ?? `${COVERS}/b/isbn/${isbn}-L.jpg`,
      series: series ?? merged.series,
      seriesPosition: seriesPosition ?? merged.seriesPosition,
      language:
        LANGUAGES[edition.languages?.[0]?.key?.replace('/languages/', '')] ?? merged.language,
    };
  }

  async getAuthor(authorKey: string) {
    const key = authorKey.startsWith('/authors/') ? authorKey : `/authors/${authorKey}`;
    const [author, works] = await Promise.all([
      this.get<Json>(`${key}.json`),
      this.get<{ entries: Json[] }>(`${key}/works.json?limit=12`),
    ]);
    if (!author) return null;

    return {
      key,
      name: author.name,
      bio: this.text(author.bio),
      birthDate: author.birth_date,
      deathDate: author.death_date,
      photoUrl: `${COVERS}/a/olid/${key.replace('/authors/', '')}-M.jpg`,
      topWorks: (works?.entries ?? [])
        .filter((w) => w.title)
        .slice(0, 10)
        .map((w) => ({
          id: String(w.key).replace('/works/', ''),
          title: w.title,
          coverUrl: this.cover(w.covers?.[0], 'M'),
        })),
    };
  }

  async getSubject(subject: string, limit = 12): Promise<NormalisedBook[]> {
    const slug = subject.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
    const data = await this.get<{ works: Json[] }>(
      `/subjects/${slug}.json?limit=${limit}`,
    );
    return (data?.works ?? []).map((work) => ({
      bookId: String(work.key).replace('/works/', ''),
      workKey: work.key,
      title: work.title,
      authors: (work.authors ?? []).map((a: { name: string }) => a.name),
      coverUrl: this.cover(work.cover_id ?? work.cover_i),
      genres: this.tidySubjects(work.subject),
      firstPublishYear: work.first_publish_year,
      source: 'openlibrary' as const,
    }));
  }

  private authorNames = new Map<string, string>();

  private async resolveAuthors(keys: string[]): Promise<string[]> {
    if (!keys.length) return [];
    const names = await Promise.all(
      keys.slice(0, 4).map(async (key) => {
        const cached = this.authorNames.get(key);
        if (cached) return cached;
        const author = await this.get<{ name?: string }>(`${key}.json`);
        if (author?.name) this.authorNames.set(key, author.name);
        return author?.name;
      }),
    );
    return names.filter(Boolean) as string[];
  }
}
