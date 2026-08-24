import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { OwnedService } from '../common/sync/owned.service';
import { Quote, QuoteDocument } from './quotes.schema';

@Injectable()
export class QuoteService extends OwnedService<QuoteDocument> {
  constructor(@InjectModel(Quote.name) model: Model<QuoteDocument>) {
    super(model);
  }
}
