import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserBook, UserBookSchema } from './user-books.schema';
import { UserBookService } from './user-books.service';
import { UserBookController } from './user-books.controller';

@Module({
  imports: [MongooseModule.forFeature([{ name: UserBook.name, schema: UserBookSchema }])],
  controllers: [UserBookController],
  providers: [UserBookService],
  exports: [UserBookService],
})
export class UserBookModule {}
