import { Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { OwnedDocument } from '../common/sync/owned.schema';

export type UserBookDocument = HydratedDocument<UserBook>;

/**
 * A reader's own copy of a book record.
 *
 * Distinct from the `books` collection, which is a shared, public cache of
 * whatever Open Library told us. This one holds the books that only exist
 * because someone typed them in — the paperback no database has heard of, the
 * proof copy, the one with a photograph of the actual cover — plus any edits
 * made to a looked-up book. Nothing here is public; it is owned, synced and
 * soft-deleted like every other record the reader writes.
 */
@Schema({ timestamps: true, collection: 'user_books' })
export class UserBook extends OwnedDocument {}

export const UserBookSchema = SchemaFactory.createForClass(UserBook);

UserBookSchema.index({ userId: 1, clientId: 1 }, { unique: true });
UserBookSchema.index({ userId: 1, clientUpdatedAt: 1 });
