import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { OwnedService } from '../common/sync/owned.service';
import { UserBook, UserBookDocument } from './user-books.schema';

@Injectable()
export class UserBookService extends OwnedService<UserBookDocument> {
  constructor(@InjectModel(UserBook.name) model: Model<UserBookDocument>) {
    super(model);
  }
}
