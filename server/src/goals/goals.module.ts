import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Goals, GoalsSchema } from './goals.schema';
import { GoalsService } from './goals.service';
import { GoalsController } from './goals.controller';

@Module({
  imports: [MongooseModule.forFeature([{ name: Goals.name, schema: GoalsSchema }])],
  controllers: [GoalsController],
  providers: [GoalsService],
  exports: [GoalsService],
})
export class GoalsModule {}
