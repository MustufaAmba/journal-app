import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Book, BookSchema } from './book.schema';
import { BooksService } from './books.service';
import { BooksController } from './books.controller';
import { OpenLibraryProvider } from './providers/open-library.provider';
import { GoogleBooksProvider } from './providers/google-books.provider';

@Module({
  imports: [MongooseModule.forFeature([{ name: Book.name, schema: BookSchema }])],
  controllers: [BooksController],
  providers: [BooksService, OpenLibraryProvider, GoogleBooksProvider],
  exports: [BooksService],
})
export class BooksModule {}
