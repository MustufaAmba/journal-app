import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type BookDocument = HydratedDocument<Book>;

/**
 * The shared book cache.
 *
 * Not per-user: two readers looking up the same novel should hit the same
 * cached record. It exists so the app is quick, so Open Library is not
 * hammered, and so a book already looked up once still resolves when Open
 * Library is having one of its slow days.
 */
@Schema({ timestamps: true, collection: 'books' })
export class Book {
  /** Open Library work id (OL…W), or `isbn_…` / `manual_…` for the rest. */
  @Prop({ required: true, unique: true, index: true })
  bookId!: string;

  @Prop({ index: true })
  workKey?: string;

  @Prop()
  editionKey?: string;

  @Prop({ required: true, index: 'text' })
  title!: string;

  @Prop()
  subtitle?: string;

  @Prop({ type: [String], default: [] })
  authors!: string[];

  @Prop({ type: [String], default: [] })
  authorKeys!: string[];

  @Prop()
  coverUrl?: string;

  @Prop()
  summary?: string;

  @Prop({ type: [String], default: [] })
  genres!: string[];

  @Prop()
  publisher?: string;

  @Prop()
  publishedDate?: string;

  @Prop()
  firstPublishYear?: number;

  @Prop({ index: true, sparse: true })
  isbn13?: string;

  @Prop({ index: true, sparse: true })
  isbn10?: string;

  @Prop()
  pageCount?: number;

  @Prop()
  language?: string;

  @Prop()
  series?: string;

  @Prop()
  seriesPosition?: number;

  @Prop({ enum: ['openlibrary', 'google', 'manual'], default: 'openlibrary' })
  source!: string;

  @Prop({ default: () => Date.now() })
  fetchedAt!: number;
}

export const BookSchema = SchemaFactory.createForClass(Book);
