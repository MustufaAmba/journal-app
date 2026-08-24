import { createConnection, Connection, Model, Schema, Types } from 'mongoose';
import { OwnedService } from './owned.service';
import { LibraryEntrySchema, LibraryEntryDocument } from '../../library/library.schema';

/**
 * The rules that keep an offline journal from eating itself: last-writer-wins
 * judged by the *device* clock, and deletes that stay deleted.
 *
 * Runs against a real MongoDB when one is reachable and skips itself when
 * there is not, so `npm test` still passes on a machine with no database.
 * Point MONGODB_TEST_URI somewhere else to use a different instance.
 */

const URI = process.env.MONGODB_TEST_URI ?? 'mongodb://127.0.0.1:27017/marginalia_test';

describe('OwnedService (sync semantics)', () => {
  let connection: Connection | null = null;
  let model: Model<LibraryEntryDocument>;
  let service: OwnedService<LibraryEntryDocument>;

  const userId = new Types.ObjectId().toHexString();

  beforeAll(async () => {
    try {
      const candidate = createConnection(URI, { serverSelectionTimeoutMS: 1500 });
      await candidate.asPromise();
      connection = candidate;
      // @nestjs/mongoose builds the schema against the plain class; registering
      // it on a raw connection needs the hydrated-document generic instead.
      model = connection.model<LibraryEntryDocument>(
        'LibraryEntry',
        LibraryEntrySchema as unknown as Schema<LibraryEntryDocument>,
      );
      service = new OwnedService<LibraryEntryDocument>(model);
    } catch {
      connection = null;
    }
  }, 15_000);

  afterAll(async () => {
    if (!connection) return;
    await model.deleteMany({});
    await connection.close();
  });

  beforeEach(async () => {
    if (connection) await model.deleteMany({});
  });

  /** Jest has no first-class "skip if" — this keeps each test honest instead. */
  const noDatabase = () => {
    if (connection) return false;
    console.warn(`Skipping sync tests: no MongoDB at ${URI}`);
    return true;
  };

  it('stores a record under the id the device generated', async () => {
    if (noDatabase()) return;
    await service.upsert(userId, { id: 'lib1', shelf: 'currentlyReading', updatedAt: 100 });

    const [stored] = await service.list(userId);
    expect(stored.id).toBe('lib1');
    expect(stored.shelf).toBe('currentlyReading');
  });

  it('lets a newer edit overwrite an older one', async () => {
    if (noDatabase()) return;
    await service.upsert(userId, { id: 'lib1', shelf: 'currentlyReading', updatedAt: 100 });
    await service.upsert(userId, { id: 'lib1', shelf: 'finished', updatedAt: 200 });

    const [stored] = await service.list(userId);
    expect(stored.shelf).toBe('finished');
  });

  it('ignores an older edit arriving late — the offline case', async () => {
    if (noDatabase()) return;
    await service.upsert(userId, { id: 'lib1', shelf: 'finished', updatedAt: 200 });
    // A phone that was offline finally pushes what it wrote an hour earlier.
    await service.upsert(userId, { id: 'lib1', shelf: 'currentlyReading', updatedAt: 100 });

    const [stored] = await service.list(userId);
    expect(stored.shelf).toBe('finished');
  });

  it('soft-deletes, so a stale device cannot resurrect the record', async () => {
    if (noDatabase()) return;
    await service.upsert(userId, { id: 'lib1', shelf: 'finished', updatedAt: 100 });
    await service.remove(userId, 'lib1');

    const records = await service.list(userId);
    expect(records).toHaveLength(1);
    expect(records[0]._deleted).toBe(true);
    await expect(service.count(userId)).resolves.toBe(0);
  });

  it('only returns what changed since a timestamp', async () => {
    if (noDatabase()) return;
    await service.upsert(userId, { id: 'old', updatedAt: 100 });
    await service.upsert(userId, { id: 'new', updatedAt: 500 });

    const changed = await service.list(userId, 300);
    expect(changed.map((record) => record.id)).toEqual(['new']);
  });

  it('keeps each reader’s records to themselves', async () => {
    if (noDatabase()) return;
    const other = new Types.ObjectId().toHexString();
    await service.upsert(userId, { id: 'mine', updatedAt: 100 });
    await service.upsert(other, { id: 'theirs', updatedAt: 100 });

    await expect(service.list(userId)).resolves.toHaveLength(1);
    await expect(service.list(other)).resolves.toHaveLength(1);
  });
});
