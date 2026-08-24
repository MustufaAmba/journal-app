import { Controller } from '@nestjs/common';
import { OwnedController } from '../common/sync/owned.controller';
import { NoteService } from './notes.service';
import { NoteDocument } from './notes.schema';

@Controller('notes')
export class NoteController extends OwnedController<NoteDocument> {
  constructor(service: NoteService) {
    super(service);
  }
}
