import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Goals, GoalsDocument } from './goals.schema';
import type { UpdateGoalsDto } from './dto/goals.dto';

@Injectable()
export class GoalsService {
  constructor(@InjectModel(Goals.name) private readonly model: Model<GoalsDocument>) {}

  private oid(userId: string) {
    return new Types.ObjectId(userId);
  }

  /** Reading the goals for the first time creates the defaults. */
  async get(userId: string) {
    const existing = await this.model.findOne({ userId: this.oid(userId) }).exec();
    return existing ?? this.model.create({ userId: this.oid(userId) });
  }

  async update(userId: string, patch: UpdateGoalsDto) {
    return this.model
      .findOneAndUpdate({ userId: this.oid(userId) }, patch, {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      })
      .exec();
  }

  clear(userId: string) {
    return this.model.deleteMany({ userId: this.oid(userId) }).exec();
  }
}
