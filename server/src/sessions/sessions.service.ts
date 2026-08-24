import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { OwnedService } from '../common/sync/owned.service';
import { ReadingSession, ReadingSessionDocument } from './sessions.schema';

@Injectable()
export class ReadingSessionService extends OwnedService<ReadingSessionDocument> {
  constructor(@InjectModel(ReadingSession.name) model: Model<ReadingSessionDocument>) {
    super(model);
  }
}
