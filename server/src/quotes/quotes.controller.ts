import { Controller } from '@nestjs/common';
import { OwnedController } from '../common/sync/owned.controller';
import { QuoteService } from './quotes.service';
import { QuoteDocument } from './quotes.schema';

@Controller('quotes')
export class QuoteController extends OwnedController<QuoteDocument> {
  constructor(service: QuoteService) {
    super(service);
  }
}
