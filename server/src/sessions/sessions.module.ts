import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ReadingSession, ReadingSessionSchema } from './sessions.schema';
import { ReadingSessionService } from './sessions.service';
import { ReadingSessionController } from './sessions.controller';

@Module({
  imports: [MongooseModule.forFeature([{ name: ReadingSession.name, schema: ReadingSessionSchema }])],
  controllers: [ReadingSessionController],
  providers: [ReadingSessionService],
  exports: [ReadingSessionService],
})
export class ReadingSessionModule {}
