import { Controller } from '@nestjs/common';
import { OwnedController } from '../common/sync/owned.controller';
import { JournalEntryService } from './journal.service';
import { JournalEntryDocument } from './journal.schema';

@Controller('journal')
export class JournalEntryController extends OwnedController<JournalEntryDocument> {
  constructor(service: JournalEntryService) {
    super(service);
  }
}
