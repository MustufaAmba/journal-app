import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

import { configuration, describeBadMongoUri } from './config/configuration';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';

import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { BooksModule } from './books/books.module';
import { LibraryEntryModule } from './library/library.module';
import { JournalEntryModule } from './journal/journal.module';
import { QuoteModule } from './quotes/quotes.module';
import { NoteModule } from './notes/notes.module';
import { ReadingSessionModule } from './sessions/sessions.module';
import { GoalsModule } from './goals/goals.module';
import { SyncModule } from './sync/sync.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),

    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const uri = config.get<string>('mongo.uri') ?? '';

        // Refuse an unusable connection string with an explanation, rather
        // than letting the driver retry ten times and then print a hundred
        // lines of topology internals.
        const problem = describeBadMongoUri(uri);
        if (problem) {
          throw new Error(`Cannot start — MONGODB_URI is wrong.\n  ${problem}`);
        }

        return {
          uri,
          // Fail fast rather than hanging the app while Mongo is starting.
          serverSelectionTimeoutMS: 8000,
        };
      },
    }),

    // A personal app does not need aggressive limits, only a backstop.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 240 }]),

    UsersModule,
    AuthModule,
    BooksModule,
    LibraryEntryModule,
    JournalEntryModule,
    QuoteModule,
    NoteModule,
    ReadingSessionModule,
    GoalsModule,
    SyncModule,
    HealthModule,
  ],
  providers: [
    // Everything is behind auth unless a route opts out with @Public().
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
