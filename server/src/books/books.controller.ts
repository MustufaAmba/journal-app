import { BadRequestException, Controller, Get, Param, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { BooksService } from './books.service';
import { Public } from '../common/decorators/public.decorator';

/**
 * Book metadata is not personal, so these routes are public — the app can
 * search before anyone signs in, and guest mode works without an account.
 */
@Public()
@Throttle({ default: { limit: 60, ttl: 60_000 } })
@Controller('books')
export class BooksController {
  constructor(private readonly books: BooksService) {}

  @Get('search')
  search(@Query('q') q?: string, @Query('mode') mode?: string) {
    if (!q?.trim()) throw new BadRequestException('Give me something to search for.');
    const allowed = ['all', 'title', 'author', 'isbn'] as const;
    const resolved = allowed.includes(mode as never) ? (mode as (typeof allowed)[number]) : 'all';
    return this.books.search(q, resolved);
  }

  @Get('isbn/:isbn')
  byIsbn(@Param('isbn') isbn: string) {
    return this.books.byIsbn(isbn);
  }

  @Get('subject/:subject')
  subject(@Param('subject') subject: string, @Query('limit') limit?: string) {
    return this.books.subject(subject, Math.min(40, Number.parseInt(limit ?? '12', 10) || 12));
  }

  @Get('author/:key')
  author(@Param('key') key: string) {
    return this.books.author(key);
  }

  @Get(':id/related')
  related(@Param('id') id: string) {
    return this.books.related(id);
  }

  @Get(':id')
  detail(@Param('id') id: string) {
    return this.books.detail(id);
  }
}
