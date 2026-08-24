import { Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { OwnedDocument } from '../common/sync/owned.schema';

export type NoteDocument = HydratedDocument<Note>;

/** Sticky notes, exactly as the device holds them. */
@Schema({ timestamps: true, collection: 'notes' })
export class Note extends OwnedDocument {}

export const NoteSchema = SchemaFactory.createForClass(Note);

// One row per record per reader.
NoteSchema.index({ userId: 1, clientId: 1 }, { unique: true });
// The "give me everything since X" query.
NoteSchema.index({ userId: 1, clientUpdatedAt: 1 });
