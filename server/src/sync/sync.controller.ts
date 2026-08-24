import { Controller, Delete, Get, Query } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { LibraryEntryService } from '../library/library.service';
import { JournalEntryService } from '../journal/journal.service';
import { QuoteService } from '../quotes/quotes.service';
import { NoteService } from '../notes/notes.service';
import { ReadingSessionService } from '../sessions/sessions.service';
import { GoalsService } from '../goals/goals.service';

/**
 * One request that returns everything.
 *
 * Used when signing in on a new phone: rather than five round trips, the app
 * asks for a snapshot and merges it into local storage in one go.
 */
@Controller('sync')
export class SyncController {
  constructor(
    private readonly library: LibraryEntryService,
    private readonly journal: JournalEntryService,
    private readonly quotes: QuoteService,
    private readonly notes: NoteService,
    private readonly sessions: ReadingSessionService,
    private readonly goals: GoalsService,
  ) {}

  @Get('snapshot')
  async snapshot(@CurrentUser('userId') userId: string, @Query('since') since?: string) {
    const from = Number.parseInt(since ?? '0', 10) || 0;

    const [library, journal, quotes, notes, sessions, goals] = await Promise.all([
      this.library.list(userId, from),
      this.journal.list(userId, from),
      this.quotes.list(userId, from),
      this.notes.list(userId, from),
      this.sessions.list(userId, from),
      this.goals.get(userId),
    ]);

    return { library, journal, quotes, notes, sessions, goals, syncedAt: Date.now() };
  }

  @Get('status')
  async status(@CurrentUser('userId') userId: string) {
    const [library, journal, quotes, notes, sessions] = await Promise.all([
      this.library.count(userId),
      this.journal.count(userId),
      this.quotes.count(userId),
      this.notes.count(userId),
      this.sessions.count(userId),
    ]);
    return { library, journal, quotes, notes, sessions };
  }

  /**
   * Wipes everything this account has on the server. The copy on the phone is
   * untouched — this is "stop keeping a backup", not "delete my journal".
   */
  @Delete('everything')
  async clear(@CurrentUser('userId') userId: string) {
    await Promise.all([
      this.library.clear(userId),
      this.journal.clear(userId),
      this.quotes.clear(userId),
      this.notes.clear(userId),
      this.sessions.clear(userId),
      this.goals.clear(userId),
    ]);
    return { ok: true as const };
  }
}
