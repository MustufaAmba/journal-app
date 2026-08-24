import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Book, BookDocument } from './book.schema';
import { OpenLibraryProvider, type NormalisedBook } from './providers/open-library.provider';
import { GoogleBooksProvider } from './providers/google-books.provider';

@Injectable()
export class BooksService {
  constructor(
    @InjectModel(Book.name) private readonly model: Model<BookDocument>,
    private readonly openLibrary: OpenLibraryProvider,
    private readonly google: GoogleBooksProvider,
    private readonly config: ConfigService,
  ) {}

  private get ttl() {
    return this.config.get<number>('books.cacheTtlMs') ?? 1000 * 60 * 60 * 24 * 30;
  }

  private isThin(book: Pick<Book, 'summary' | 'pageCount' | 'publisher' | 'coverUrl'>) {
    return !book.summary || !book.pageCount || !book.publisher || !book.coverUrl;
  }

  /** Fills whatever Open Library left blank, using Google Books. */
  private async enrich(book: NormalisedBook): Promise<NormalisedBook> {
    if (!this.isThin(book)) return book;

    const patch = book.isbn13 || book.isbn10
      ? await this.google.byIsbn((book.isbn13 ?? book.isbn10)!)
      : await this.google.byTitleAuthor(book.title, book.authors[0]);

    if (!patch) return book;

    // Open Library stays canonical — only genuinely missing fields are taken.
    return {
      ...book,
      summary: book.summary ?? patch.summary,
      pageCount: book.pageCount ?? patch.pageCount,
      publisher: book.publisher ?? patch.publisher,
      publishedDate: book.publishedDate ?? patch.publishedDate,
      coverUrl: book.coverUrl ?? patch.coverUrl,
      language: book.language ?? patch.language,
      isbn13: book.isbn13 ?? patch.isbn13,
      isbn10: book.isbn10 ?? patch.isbn10,
      genres: book.genres.length ? book.genres : (patch.genres ?? []).slice(0, 6),
    };
  }

  private async cache(book: NormalisedBook) {
    return this.model
      .findOneAndUpdate(
        { bookId: book.bookId },
        { ...book, fetchedAt: Date.now() },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      )
      .exec();
  }

  async search(query: string, mode: 'all' | 'title' | 'author' | 'isbn' = 'all') {
    const trimmed = query.trim();
    if (trimmed.length < 2) return [];

    const results = await this.openLibrary.search(trimmed, mode);

    if (results.length) {
      // Cache in the background — the caller should not wait for Mongo.
      void Promise.all(results.map((book) => this.cache(book))).catch(() => undefined);
      return results;
    }

    // Open Library is down or knows nothing — fall back to what we already have.
    return this.model
      .find({ $text: { $search: trimmed } })
      .limit(20)
      .lean()
      .exec();
  }

  /** The details endpoint: cache first, refresh when stale or thin. */
  async detail(bookId: string) {
    const cached = await this.model.findOne({ bookId }).exec();

    const fresh =
      cached && !this.isThin(cached) && Date.now() - (cached.fetchedAt ?? 0) < this.ttl;
    if (fresh || cached?.source === 'manual') return cached;

    const fetched = bookId.startsWith('OL')
      ? await this.openLibrary.getWork(bookId)
      : cached?.isbn13 || cached?.isbn10
        ? await this.openLibrary.getByIsbn((cached.isbn13 ?? cached.isbn10)!)
        : null;

    if (!fetched) {
      // Offline or missing upstream — a stale cached copy still beats a 404.
      if (cached) return cached;
      throw new NotFoundException('That book could not be found.');
    }

    return this.cache(await this.enrich(fetched));
  }

  async byIsbn(isbn: string) {
    const normalised = isbn.replace(/[^0-9Xx]/g, '');
    const cached = await this.model
      .findOne({ $or: [{ isbn13: normalised }, { isbn10: normalised }] })
      .exec();
    if (cached && !this.isThin(cached)) return cached;

    const fetched = await this.openLibrary.getByIsbn(normalised);
    if (!fetched) {
      if (cached) return cached;
      // Open Library has never heard of it — let Google try alone.
      const patch = await this.google.byIsbn(normalised);
      if (!patch?.title) throw new NotFoundException('No book found with that ISBN.');
      return this.cache({
        bookId: `isbn_${normalised}`,
        title: patch.title,
        authors: patch.authors ?? [],
        genres: patch.genres ?? [],
        ...patch,
        source: 'google',
      } as NormalisedBook);
    }

    return this.cache(await this.enrich(fetched));
  }

  author(authorKey: string) {
    return this.openLibrary.getAuthor(authorKey);
  }

  subject(subject: string, limit = 12) {
    return this.openLibrary.getSubject(subject, limit);
  }

  /**
   * Related books, with no recommendation engine: other work by the same
   * author, then other books sharing this book's strongest subject.
   */
  async related(bookId: string) {
    const book = await this.detail(bookId);
    if (!book) return [];

    const out: NormalisedBook[] = [];
    const seen = new Set([bookId]);

    if (book.authors?.[0]) {
      const byAuthor = await this.openLibrary.search(book.authors[0], 'author', 10);
      byAuthor.forEach((candidate) => {
        if (seen.has(candidate.bookId)) return;
        seen.add(candidate.bookId);
        out.push(candidate);
      });
    }

    if (book.genres?.[0] && out.length < 12) {
      const bySubject = await this.openLibrary.getSubject(book.genres[0], 12);
      bySubject.forEach((candidate) => {
        if (seen.has(candidate.bookId)) return;
        seen.add(candidate.bookId);
        out.push(candidate);
      });
    }

    return out.slice(0, 12);
  }
}
