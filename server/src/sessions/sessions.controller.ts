import { Controller } from '@nestjs/common';
import { OwnedController } from '../common/sync/owned.controller';
import { ReadingSessionService } from './sessions.service';
import { ReadingSessionDocument } from './sessions.schema';

@Controller('sessions')
export class ReadingSessionController extends OwnedController<ReadingSessionDocument> {
  constructor(service: ReadingSessionService) {
    super(service);
  }
}
