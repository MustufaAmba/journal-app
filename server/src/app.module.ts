import { Logger, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

import {
  configuration,
  describeBadMongoUri,
  describeMongoUriWarning,
} from './config/configuration';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';

import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { BooksModule } from './books/books.module';
import { LibraryEntryModule } from './library/library.module';
import { UserBookModule } from './user-books/user-books.module';
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

        // Imperfect but workable: say it on every boot and carry on. Refusing
        // to start over this once took down a server that had been fine for
        // weeks, which helped nobody.
        const warning = describeMongoUriWarning(uri);
        if (warning) new Logger('Marginalia').warn(`MONGODB_URI\n  ${warning}`);

        return {
          uri,
          // Fail fast rather than hanging the app while Mongo is starting.
          serverSelectionTimeoutMS: 8000,
          // Enough to ride out a brief blip while Atlas wakes, without
          // printing ten identical stack traces before giving up. The
          // explanation in main.ts is far more use than the tenth retry.
          retryAttempts: 3,
          retryDelay: 2000,
        };
      },
    }),

    // A personal app does not need aggressive limits, only a backstop.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 240 }]),

    UsersModule,
    AuthModule,
    BooksModule,
    LibraryEntryModule,
    UserBookModule,
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
