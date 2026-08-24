import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JournalEntry, JournalEntrySchema } from './journal.schema';
import { JournalEntryService } from './journal.service';
import { JournalEntryController } from './journal.controller';

@Module({
  imports: [MongooseModule.forFeature([{ name: JournalEntry.name, schema: JournalEntrySchema }])],
  controllers: [JournalEntryController],
  providers: [JournalEntryService],
  exports: [JournalEntryService],
})
export class JournalEntryModule {}
