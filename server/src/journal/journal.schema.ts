import { Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { OwnedDocument } from '../common/sync/owned.schema';

export type JournalEntryDocument = HydratedDocument<JournalEntry>;

/** Journal entries, exactly as the device holds them. */
@Schema({ timestamps: true, collection: 'journal_entries' })
export class JournalEntry extends OwnedDocument {}

export const JournalEntrySchema = SchemaFactory.createForClass(JournalEntry);

// One row per record per reader.
JournalEntrySchema.index({ userId: 1, clientId: 1 }, { unique: true });
// The "give me everything since X" query.
JournalEntrySchema.index({ userId: 1, clientUpdatedAt: 1 });
