import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { OwnedService } from '../common/sync/owned.service';
import { Note, NoteDocument } from './notes.schema';

@Injectable()
export class NoteService extends OwnedService<NoteDocument> {
  constructor(@InjectModel(Note.name) model: Model<NoteDocument>) {
    super(model);
  }
}
