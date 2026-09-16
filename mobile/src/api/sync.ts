import { api, pingBackend } from './client';
import { useSyncStore } from '@/store/useSyncStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useLibraryStore } from '@/store/useLibraryStore';
import { useJournalStore } from '@/store/useJournalStore';
import { useQuotesStore } from '@/store/useQuotesStore';
import { useNotesStore } from '@/store/useNotesStore';
import { useSessionsStore } from '@/store/useSessionsStore';
import { useGoalsStore } from '@/store/useGoalsStore';
import { useBooksStore } from '@/store/useBooksStore';
import { restoreBooks } from './books';
import type { SyncOp } from '@/types';

/**
 * Drains the offline queue.
 *
 * Rules:
 *  - guests never sync (there is nothing to sync to)
 *  - a failed batch never blocks the app; it stays queued and retries later
 *  - operations are sent oldest-first so the server sees edits in order
 */

const ENDPOINTS: Record<SyncOp['entity'], string> = {
  library: '/library',
  book: '/my-books',
  journal: '/journal',
  quote: '/quotes',
  note: '/notes',
  session: '/sessions',
  goals: '/goals',
  profile: '/profile',
};

const BATCH_SIZE = 25;

let running = false;

export async function drainSyncQueue(): Promise<void> {
  if (running) return;

  const { user, accessToken } = useAuthStore.getState();
  if (!user || user.guest || !accessToken) return;

  const store = useSyncStore.getState();
  if (!store.queue.length) return;

  running = true;
  store.setStatus('syncing');

  try {
    if (!(await pingBackend())) {
      useSyncStore.getState().setStatus('offline');
      return;
    }

    while (useSyncStore.getState().queue.length) {
      const batch = useSyncStore.getState().queue.slice(0, BATCH_SIZE);
      const succeeded: string[] = [];
      const failed: string[] = [];
      let lastMessage = '';

      // Sequential rather than parallel: ordering matters more than speed here,
      // and the queue is small by construction.
      for (const op of batch) {
        try {
          if (op.action === 'delete') {
            const id = (op.payload as { id: string }).id;
            await api.delete(`${ENDPOINTS[op.entity]}/${id}`);
          } else {
            await api.post(ENDPOINTS[op.entity], op.payload);
          }
          succeeded.push(op.id);
        } catch (error) {
          lastMessage = error instanceof Error ? error.message : 'Sync failed';
          failed.push(op.id);
        }
      }

      if (succeeded.length) useSyncStore.getState().resolve(succeeded);
      if (failed.length) {
        useSyncStore.getState().fail(failed, lastMessage);
        useSyncStore.getState().setStatus('error', lastMessage);
        return;
      }
    }

    useSyncStore.getState().markSynced();
  } catch (error) {
    useSyncStore.getState().setStatus('error', error instanceof Error ? error.message : 'Sync failed');
  } finally {
    running = false;
  }
}

type Snapshot = {
  library: Record<string, unknown>[];
  books?: Record<string, unknown>[];
  journal: Record<string, unknown>[];
  quotes: Record<string, unknown>[];
  notes: Record<string, unknown>[];
  sessions: Record<string, unknown>[];
  goals?: Record<string, unknown>;
};

/**
 * Pulls the account's copy down and merges it in.
 *
 * This is what makes a new phone feel like the old one: sign in, and the
 * shelves and the journal are simply there. Merging is additive and
 * last-writer-wins, so it can never delete something the phone has that the
 * server has not seen yet — that work is still sitting in the outbound queue.
 */
export async function pullFromServer(): Promise<Snapshot | null> {
  const { user } = useAuthStore.getState();
  if (!user || user.guest) return null;

  try {
    const snapshot = await api.get<Snapshot>('/sync/snapshot');
    mergeSnapshot(snapshot);
    // Entries arrived; the books they point at may not be on this device yet.
    void refillBookCache();
    return snapshot;
  } catch {
    return null;
  }
}

const newer = <T extends { updatedAt?: number; createdAt?: number }>(a?: T, b?: T) => {
  const stamp = (record?: T) => record?.updatedAt ?? record?.createdAt ?? 0;
  return stamp(a) >= stamp(b) ? a : b;
};

function mergeInto<T extends { id: string; updatedAt?: number; createdAt?: number }>(
  current: Record<string, T>,
  incoming: Record<string, unknown>[],
): Record<string, T> {
  const next = { ...current };
  incoming.forEach((raw) => {
    const record = raw as T & { _deleted?: boolean };
    if (!record.id) return;
    if (record._deleted) {
      delete next[record.id];
      return;
    }
    delete record._deleted;
    delete (record as { _syncedAt?: number })._syncedAt;
    next[record.id] = (newer(next[record.id], record) ?? record) as T;
  });
  return next;
}

function mergeSnapshot(snapshot: Snapshot) {
  useLibraryStore.setState((s) => ({ entries: mergeInto(s.entries, snapshot.library ?? []) }));
  // setState rather than the store's own put(), so restoring a book does not
  // enqueue it straight back to the server it just came from.
  useBooksStore.setState((s) => ({ byId: mergeInto(s.byId, snapshot.books ?? []) }));
  useJournalStore.setState((s) => ({ entries: mergeInto(s.entries, snapshot.journal ?? []) }));
  useQuotesStore.setState((s) => ({ quotes: mergeInto(s.quotes, snapshot.quotes ?? []) }));
  useNotesStore.setState((s) => ({ notes: mergeInto(s.notes, snapshot.notes ?? []) }));
  useSessionsStore.setState((s) => ({ sessions: mergeInto(s.sessions, snapshot.sessions ?? []) }));

  if (snapshot.goals) {
    const { booksPerYear, booksPerMonth, pagesPerDay, minutesPerDay, year } = snapshot.goals as Record<
      string,
      number
    >;
    useGoalsStore.getState().setGoals({ booksPerYear, booksPerMonth, pagesPerDay, minutesPerDay, year });
  }
}

/**
 * Fetches any book a synced record refers to but this device has never seen.
 *
 * The catalogue was designed as a local cache, so it is the one thing that
 * does not sync. That is fine until you sign in somewhere new: the entries
 * come back and the books do not, and every shelf in the app silently drops
 * the entries it cannot resolve. The server has been caching these books all
 * along, so we just ask for them again.
 *
 * Deliberately not awaited by the caller — books land in the store one by one
 * and the shelves fill in as they arrive.
 */
export async function refillBookCache(): Promise<void> {
  const known = useBooksStore.getState().byId;
  const wanted = new Set<string>();

  Object.values(useLibraryStore.getState().entries).forEach((entry) => {
    if (entry.bookId && !known[entry.bookId]) wanted.add(entry.bookId);
  });
  // A journal entry or a quote can outlive its shelf entry.
  Object.values(useJournalStore.getState().entries).forEach((entry) => {
    if (entry.bookId && !known[entry.bookId]) wanted.add(entry.bookId);
  });
  Object.values(useQuotesStore.getState().quotes).forEach((quote) => {
    if (quote.bookId && !known[quote.bookId]) wanted.add(quote.bookId);
  });

  if (!wanted.size) return;
  await restoreBooks([...wanted]);
}

/**
 * The full round trip, run once after signing in: push whatever was written
 * while signed out, then pull down anything this device has never seen.
 */
export async function syncOnSignIn(): Promise<void> {
  await drainSyncQueue();
  await pullFromServer();
}
