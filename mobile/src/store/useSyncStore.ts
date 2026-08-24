import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from '@/lib/storage';
import { createId } from '@/lib/id';
import type { SyncOp } from '@/types';

/**
 * Offline-first plumbing.
 *
 * Nothing in this app ever waits for the network. Writes go straight to local
 * storage and drop an operation in this queue; when a connection and a signed-in
 * account are both available, the queue drains oldest-first. If the reader
 * never signs in, the queue simply sits there harmlessly.
 */

type SyncState = {
  queue: SyncOp[];
  status: 'idle' | 'syncing' | 'offline' | 'error';
  lastSyncedAt: number | null;
  lastError: string | null;

  push: (op: Omit<SyncOp, 'id' | 'createdAt' | 'attempts'>) => void;
  /** remove ops that succeeded */
  resolve: (ids: string[]) => void;
  /** put failures back with a bumped attempt count */
  fail: (ids: string[], message: string) => void;
  setStatus: (status: SyncState['status'], error?: string | null) => void;
  markSynced: () => void;
  clear: () => void;
};

/** Give up on an op after this many tries so a poison record cannot wedge the queue. */
const MAX_ATTEMPTS = 6;

export const useSyncStore = create<SyncState>()(
  persist(
    (set) => ({
      queue: [],
      status: 'idle',
      lastSyncedAt: null,
      lastError: null,

      push: (op) =>
        set((s) => {
          const next: SyncOp = { ...op, id: createId('op'), createdAt: Date.now(), attempts: 0 };
          // Collapse repeated edits to the same record — autosave is chatty.
          const payloadId = (op.payload as { id?: string } | undefined)?.id;
          const queue = payloadId
            ? s.queue.filter(
                (existing) =>
                  !(
                    existing.entity === op.entity &&
                    existing.action === op.action &&
                    (existing.payload as { id?: string } | undefined)?.id === payloadId
                  ),
              )
            : s.queue;
          return { queue: [...queue, next] };
        }),

      resolve: (ids) => set((s) => ({ queue: s.queue.filter((op) => !ids.includes(op.id)) })),

      fail: (ids, message) =>
        set((s) => ({
          queue: s.queue
            .map((op) => (ids.includes(op.id) ? { ...op, attempts: op.attempts + 1, lastError: message } : op))
            .filter((op) => op.attempts < MAX_ATTEMPTS),
          lastError: message,
        })),

      setStatus: (status, error = null) => set({ status, lastError: error }),
      markSynced: () => set({ lastSyncedAt: Date.now(), status: 'idle', lastError: null }),
      clear: () => set({ queue: [], lastError: null }),
    }),
    {
      name: 'sync.v1',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (s) => ({ queue: s.queue, lastSyncedAt: s.lastSyncedAt }),
    },
  ),
);

/** Convenience used by every other store. */
export const enqueue = (entity: SyncOp['entity'], action: SyncOp['action'], payload: unknown) =>
  useSyncStore.getState().push({ entity, action, payload });
