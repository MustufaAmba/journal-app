import { Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { OwnedDocument } from '../common/sync/owned.schema';

export type LibraryEntryDocument = HydratedDocument<LibraryEntry>;

/** Shelf entries — one per book on a shelf, exactly as the device holds them. */
@Schema({ timestamps: true, collection: 'library_entries' })
export class LibraryEntry extends OwnedDocument {}

export const LibraryEntrySchema = SchemaFactory.createForClass(LibraryEntry);

// One row per record per reader.
LibraryEntrySchema.index({ userId: 1, clientId: 1 }, { unique: true });
// The "give me everything since X" query.
LibraryEntrySchema.index({ userId: 1, clientUpdatedAt: 1 });
