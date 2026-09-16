import { Controller } from '@nestjs/common';
import { OwnedController } from '../common/sync/owned.controller';
import { UserBookService } from './user-books.service';
import { UserBookDocument } from './user-books.schema';

/**
 * Deliberately not mounted under `books`. That controller is @Public() and
 * ends in a catch-all `@Get(':id')`, so a nested `books/mine` route would sit
 * one registration-order change away from being swallowed by it — and the
 * thing it would leak is the reader's private shelf.
 */
@Controller('my-books')
export class UserBookController extends OwnedController<UserBookDocument> {
  constructor(service: UserBookService) {
    super(service);
  }
}
