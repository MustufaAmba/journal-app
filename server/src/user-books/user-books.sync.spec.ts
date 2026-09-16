import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { connection } from 'mongoose';

/**
 * A hand-added book has to survive a new phone.
 *
 * It exists nowhere but the device that typed it in, so unlike a looked-up
 * book it cannot be fetched again from anywhere. This walks the whole path:
 * push one, pull the snapshot back, and check it came home — then delete it
 * and check the deletion travels too.
 *
 * Runs against a real MongoDB when one is reachable and skips itself when
 * there is not, like the other database tests here.
 */

const URI = process.env.MONGODB_TEST_URI ?? 'mongodb://127.0.0.1:27017/marginalia_e2e';

describe('hand-added books survive a reinstall', () => {
  let app: INestApplication | null = null;
  let token = '';

  const book = {
    id: 'manual_test_abc',
    title: 'A Paperback No Database Has Heard Of',
    authors: ['Someone'],
    genres: [],
    pageCount: 231,
    source: 'manual',
    updatedAt: 1_700_000_000_000,
  };

  beforeAll(async () => {
    process.env.MONGODB_URI = URI;
    process.env.JWT_ACCESS_SECRET = 'test-access';
    process.env.JWT_REFRESH_SECRET = 'test-refresh';

    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { AppModule } = require('../app.module');
      const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
      app = moduleRef.createNestApplication();
      await app.init();

      const email = `e2e_${Date.now()}@example.com`;
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email, password: 'correct horse battery staple', name: 'E2E' });
      token = res.body?.accessToken ?? '';
      if (!token) throw new Error(`no token: ${res.status} ${JSON.stringify(res.body)}`);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('skipping: no database or app could not boot —', (error as Error).message);
      if (app) await app.close().catch(() => undefined);
      app = null;
    }
  }, 40_000);

  afterAll(async () => {
    if (app) await app.close();
    await connection.dropDatabase().catch(() => undefined);
    await connection.close().catch(() => undefined);
  }, 20_000);

  const auth = (r: request.Test) => r.set('Authorization', `Bearer ${token}`);

  it('pushes to /my-books and comes back in the snapshot', async () => {
    if (!app) return;
    const server = app.getHttpServer();

    await auth(request(server).post('/my-books').send(book)).expect(201);

    const snapshot = await auth(request(server).get('/sync/snapshot')).expect(200);
    const books = snapshot.body.books ?? [];
    const found = books.find((b: { id: string }) => b.id === book.id);

    expect(found).toBeDefined();
    expect(found.title).toBe(book.title);
    expect(found.pageCount).toBe(231);
    expect(found.source).toBe('manual');
  }, 30_000);

  it('does not let a stale copy overwrite a newer edit', async () => {
    if (!app) return;
    const server = app.getHttpServer();

    await auth(
      request(server).post('/my-books').send({ ...book, title: 'Retitled', updatedAt: 1_700_000_001_000 }),
    ).expect(201);
    // an older edit arriving late
    await auth(
      request(server).post('/my-books').send({ ...book, title: 'Stale', updatedAt: 1_600_000_000_000 }),
    ).expect(201);

    const snapshot = await auth(request(server).get('/sync/snapshot')).expect(200);
    const found = (snapshot.body.books ?? []).find((b: { id: string }) => b.id === book.id);
    expect(found.title).toBe('Retitled');
  }, 30_000);

  it('carries the deletion too', async () => {
    if (!app) return;
    const server = app.getHttpServer();

    await auth(request(server).delete(`/my-books/${book.id}`)).expect(200);

    const snapshot = await auth(request(server).get('/sync/snapshot')).expect(200);
    const found = (snapshot.body.books ?? []).find((b: { id: string }) => b.id === book.id);
    expect(found?._deleted).toBe(true);
  }, 30_000);

  it('keeps one reader\'s books away from another', async () => {
    if (!app) return;
    const server = app.getHttpServer();

    const other = await request(server)
      .post('/auth/register')
      .send({ email: `e2e_other_${Date.now()}@example.com`, password: 'another good passphrase', name: 'Other' });

    const snapshot = await request(server)
      .get('/sync/snapshot')
      .set('Authorization', `Bearer ${other.body.accessToken}`)
      .expect(200);

    expect(snapshot.body.books ?? []).toHaveLength(0);
  }, 30_000);
});
