import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type GoalsDocument = HydratedDocument<Goals>;

/** One row per reader: their targets and the postcards they have earned. */
@Schema({ timestamps: true, collection: 'goals' })
export class Goals {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ default: 24 })
  booksPerYear!: number;

  @Prop({ default: 2 })
  booksPerMonth!: number;

  @Prop({ default: 30 })
  pagesPerDay!: number;

  @Prop({ default: 30 })
  minutesPerDay!: number;

  @Prop({ default: () => new Date().getFullYear() })
  year!: number;

  @Prop({ type: [Object], default: [] })
  achievements!: Record<string, unknown>[];
}

export const GoalsSchema = SchemaFactory.createForClass(Goals);
