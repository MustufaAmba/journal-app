import { Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { OwnedDocument } from '../common/sync/owned.schema';

export type ReadingSessionDocument = HydratedDocument<ReadingSession>;

/** Reading sessions, exactly as the device holds them. */
@Schema({ timestamps: true, collection: 'reading_sessions' })
export class ReadingSession extends OwnedDocument {}

export const ReadingSessionSchema = SchemaFactory.createForClass(ReadingSession);

// One row per record per reader.
ReadingSessionSchema.index({ userId: 1, clientId: 1 }, { unique: true });
// The "give me everything since X" query.
ReadingSessionSchema.index({ userId: 1, clientUpdatedAt: 1 });
