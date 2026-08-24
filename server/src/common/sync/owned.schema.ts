import { Prop, Schema } from '@nestjs/mongoose';
import { Types } from 'mongoose';

/**
 * Everything the app syncs shares the same shape.
 *
 * The phone is the source of truth for identity: it generates `clientId`
 * offline, and the server stores whatever it is given under that id. That is
 * what lets a reader write in the journal on a plane and have it land
 * correctly hours later.
 */
@Schema()
export class OwnedDocument {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId!: Types.ObjectId;

  /** the id the device generated; unique per user */
  @Prop({ required: true, index: true })
  clientId!: string;

  /** the record exactly as the device holds it */
  @Prop({ type: Object, required: true })
  data!: Record<string, unknown>;

  /** device clock, used for last-writer-wins */
  @Prop({ required: true, default: 0 })
  clientUpdatedAt!: number;

  @Prop({ default: false })
  deleted?: boolean;
}
