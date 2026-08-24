import { Controller } from '@nestjs/common';
import { OwnedController } from '../common/sync/owned.controller';
import { LibraryEntryService } from './library.service';
import { LibraryEntryDocument } from './library.schema';

@Controller('library')
export class LibraryEntryController extends OwnedController<LibraryEntryDocument> {
  constructor(service: LibraryEntryService) {
    super(service);
  }
}
