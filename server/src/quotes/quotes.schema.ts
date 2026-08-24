import { Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { OwnedDocument } from '../common/sync/owned.schema';

export type QuoteDocument = HydratedDocument<Quote>;

/** Saved quotes, exactly as the device holds them. */
@Schema({ timestamps: true, collection: 'quotes' })
export class Quote extends OwnedDocument {}

export const QuoteSchema = SchemaFactory.createForClass(Quote);

// One row per record per reader.
QuoteSchema.index({ userId: 1, clientId: 1 }, { unique: true });
// The "give me everything since X" query.
QuoteSchema.index({ userId: 1, clientUpdatedAt: 1 });
