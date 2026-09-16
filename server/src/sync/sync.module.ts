import { Module } from '@nestjs/common';
import { SyncController } from './sync.controller';
import { LibraryEntryModule } from '../library/library.module';
import { UserBookModule } from '../user-books/user-books.module';
import { JournalEntryModule } from '../journal/journal.module';
import { QuoteModule } from '../quotes/quotes.module';
import { NoteModule } from '../notes/notes.module';
import { ReadingSessionModule } from '../sessions/sessions.module';
import { GoalsModule } from '../goals/goals.module';

@Module({
  imports: [
    LibraryEntryModule,
    UserBookModule,
    JournalEntryModule,
    QuoteModule,
    NoteModule,
    ReadingSessionModule,
    GoalsModule,
  ],
  controllers: [SyncController],
})
export class SyncModule {}
