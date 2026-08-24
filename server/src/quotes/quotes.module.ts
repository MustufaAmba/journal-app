import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Quote, QuoteSchema } from './quotes.schema';
import { QuoteService } from './quotes.service';
import { QuoteController } from './quotes.controller';

@Module({
  imports: [MongooseModule.forFeature([{ name: Quote.name, schema: QuoteSchema }])],
  controllers: [QuoteController],
  providers: [QuoteService],
  exports: [QuoteService],
})
export class QuoteModule {}
