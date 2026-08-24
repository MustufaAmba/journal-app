import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { OwnedService } from '../common/sync/owned.service';
import { LibraryEntry, LibraryEntryDocument } from './library.schema';

@Injectable()
export class LibraryEntryService extends OwnedService<LibraryEntryDocument> {
  constructor(@InjectModel(LibraryEntry.name) model: Model<LibraryEntryDocument>) {
    super(model);
  }
}
