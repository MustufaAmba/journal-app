import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { OwnedService } from '../common/sync/owned.service';
import { JournalEntry, JournalEntryDocument } from './journal.schema';

@Injectable()
export class JournalEntryService extends OwnedService<JournalEntryDocument> {
  constructor(@InjectModel(JournalEntry.name) model: Model<JournalEntryDocument>) {
    super(model);
  }
}
