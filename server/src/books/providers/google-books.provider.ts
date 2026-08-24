import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NormalisedBook } from './open-library.provider';

/**
 * The understudy.
 *
 * Only ever used to fill gaps Open Library left — usually a missing summary,
 * page count or cover. Anonymous calls are rate-limited hard, so every method
 * here returns null on any trouble and the caller carries on regardless.
 */
// Same as the Open Library provider: upstream payloads are loosely typed and
// narrowed by hand as they are read.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = Record<string, any>;

@Injectable()
export class GoogleBooksProvider {
  private readonly logger = new Logger(GoogleBooksProvider.name);
  private readonly base = 'https://www.googleapis.com/books/v1/volumes';

  constructor(private readonly config: ConfigService) {}

  private get key() {
    return this.config.get<string>('books.googleApiKey');
  }

  private async firstVolume(query: string) {
    const url = `${this.base}?q=${encodeURIComponent(query)}&maxResults=3${this.key ? `&key=${this.key}` : ''}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 7000);
    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) {
        // 429 is routine without a key — not worth an error-level log.
        if (response.status !== 429) this.logger.warn(`Google Books responded ${response.status}`);
        return null;
      }
      const data = (await response.json()) as { items?: Json[] };
      return data.items?.[0] ?? null;
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  /** Google's thumbnails are http and postage-stamp sized by default. */
  private upgradeImage(url?: string) {
    return url?.replace(/^http:/, 'https:').replace(/&zoom=\d/, '&zoom=1').replace(/&edge=curl/, '');
  }

  private normalise(volume: Json): Partial<NormalisedBook> {
    const info = volume.volumeInfo ?? {};
    const ids: { type: string; identifier: string }[] = info.industryIdentifiers ?? [];
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
      coverUrl: this.upgradeImage(info.imageLinks?.thumbnail ?? info.imageLinks?.smallThumbnail),
      isbn13: ids.find((i) => i.type === 'ISBN_13')?.identifier,
      isbn10: ids.find((i) => i.type === 'ISBN_10')?.identifier,
    };
  }

  async byIsbn(isbn: string) {
    const volume = await this.firstVolume(`isbn:${isbn.replace(/[^0-9Xx]/g, '')}`);
    return volume ? this.normalise(volume) : null;
  }

  async byTitleAuthor(title: string, author?: string) {
    const query = author
      ? `intitle:${JSON.stringify(title)}+inauthor:${JSON.stringify(author)}`
      : `intitle:${JSON.stringify(title)}`;
    const volume = await this.firstVolume(query);
    if (!volume) return null;

    // Guard against Google confidently returning a different book.
    const returned = (volume.volumeInfo?.title ?? '').toLowerCase();
    const wanted = title.toLowerCase();
    const looksRight =
      returned.includes(wanted.slice(0, Math.min(wanted.length, 18))) ||
      wanted.includes(returned.slice(0, Math.min(returned.length, 18)));

    return looksRight ? this.normalise(volume) : null;
  }
}
