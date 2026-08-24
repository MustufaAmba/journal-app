import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LibraryEntry, LibraryEntrySchema } from './library.schema';
import { LibraryEntryService } from './library.service';
import { LibraryEntryController } from './library.controller';

@Module({
  imports: [MongooseModule.forFeature([{ name: LibraryEntry.name, schema: LibraryEntrySchema }])],
  controllers: [LibraryEntryController],
  providers: [LibraryEntryService],
  exports: [LibraryEntryService],
})
export class LibraryEntryModule {}
