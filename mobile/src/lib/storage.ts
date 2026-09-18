import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * A tiny synchronous key/value store.
 *
 * MMKV is the real engine — it is synchronous, which is what lets Zustand
 * hydrate before the first frame so the app never flashes an empty shelf.
 * MMKV needs a native build though, so when the app is opened in Expo Go we
 * fall back to an in-memory map that is mirrored to AsyncStorage. The rest of
 * the app never has to know which one it got.
 */

type SyncKV = {
  getString(key: string): string | undefined;
  set(key: string, value: string): void;
  delete(key: string): void;
  getAllKeys(): string[];
  clearAll(): void;
};

const FALLBACK_PREFIX = 'marginalia:';

function createFallback(): SyncKV {
  const map = new Map<string, string>();
  let flushTimer: ReturnType<typeof setTimeout> | null = null;
  const dirty = new Set<string>();

  const flush = () => {
    flushTimer = null;
    const writes: [string, string][] = [];
    const removals: string[] = [];
    dirty.forEach((key) => {
      const value = map.get(key);
      if (value === undefined) removals.push(FALLBACK_PREFIX + key);
      else writes.push([FALLBACK_PREFIX + key, value]);
    });
    dirty.clear();
    if (writes.length) void AsyncStorage.multiSet(writes);
    if (removals.length) void AsyncStorage.multiRemove(removals);
  };

  const schedule = (key: string) => {
    dirty.add(key);
    if (flushTimer) return;
    // Coalesce bursts of writes (autosave fires a lot) into one round trip.
    flushTimer = setTimeout(flush, 120);
  };

  return {
    getString: (key) => map.get(key),
    set: (key, value) => {
      map.set(key, value);
      schedule(key);
    },
    delete: (key) => {
      map.delete(key);
      schedule(key);
    },
    getAllKeys: () => Array.from(map.keys()),
    clearAll: () => {
      const keys = Array.from(map.keys());
      map.clear();
      keys.forEach(schedule);
    },
    // exposed for hydration below
    ...({ __map: map } as object),
  } as SyncKV;
}

let engine: SyncKV;
let usingMMKV = false;

try {
  // Required lazily so a missing native module degrades instead of crashing.
  const { createMMKV } = require('react-native-mmkv') as typeof import('react-native-mmkv');
  const instance = createMMKV({ id: 'marginalia' });
  // Touch it once — the native module is only really resolved on first use.
  instance.getString('__probe__');
  engine = {
    getString: (key) => instance.getString(key),
    set: (key, value) => instance.set(key, value),
    delete: (key) => {
      instance.remove(key);
    },
    getAllKeys: () => instance.getAllKeys(),
    clearAll: () => instance.clearAll(),
  };
  usingMMKV = true;
} catch {
  engine = createFallback();
}

/** True when the fast native store is in use (i.e. a dev/production build, not Expo Go). */
export const isNativeStorage = usingMMKV;

/**
 * Pulls the AsyncStorage mirror into memory. No-op when MMKV is available.
 * Must be awaited before the first render so persisted state is present.
 */
export async function hydrateStorage(): Promise<void> {
  if (usingMMKV) return;
  const map = (engine as unknown as { __map: Map<string, string> }).__map;
  const keys = (await AsyncStorage.getAllKeys()).filter((k) => k.startsWith(FALLBACK_PREFIX));
  if (!keys.length) return;
  const entries = await AsyncStorage.multiGet(keys);
  entries.forEach(([key, value]) => {
    if (value != null) map.set(key.slice(FALLBACK_PREFIX.length), value);
  });
}

export const kv = {
  get<T>(key: string, fallback: T): T {
    const raw = engine.getString(key);
    if (raw === undefined) return fallback;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  },
  set(key: string, value: unknown): void {
    engine.set(key, JSON.stringify(value));
  },
  remove(key: string): void {
    engine.delete(key);
  },
  keys(): string[] {
    return engine.getAllKeys();
  },
  wipe(): void {
    engine.clearAll();
  },
};

/**
 * Zustand persist adapter over the same engine — with the writes coalesced.
 *
 * Zustand re-serialises a whole store on every single change to it, and these
 * stores are not small: a hundred books with their blurbs is a couple of
 * hundred kilobytes of JSON. Tapping through a shelf, dragging a book, typing
 * in the journal — each one was stringifying the lot on the JS thread, which
 * is exactly the thread that has to answer the next tap.
 *
 * So writes are held for a moment and collapsed: the last value for a key
 * within the window is the only one that reaches storage. Everything pending
 * is flushed the instant the app goes to the background, and `flushWrites` is
 * there for anywhere else that needs to be certain.
 */
const WRITE_DELAY_MS = 350;

const pendingWrites = new Map<string, string | null>();
let writeTimer: ReturnType<typeof setTimeout> | null = null;

export function flushWrites(): void {
  if (writeTimer) {
    clearTimeout(writeTimer);
    writeTimer = null;
  }
  if (!pendingWrites.size) return;
  pendingWrites.forEach((value, key) => {
    if (value === null) engine.delete(key);
    else engine.set(key, value);
  });
  pendingWrites.clear();
}

function scheduleWrite(key: string, value: string | null) {
  pendingWrites.set(key, value);
  if (writeTimer) return;
  writeTimer = setTimeout(() => {
    writeTimer = null;
    flushWrites();
  }, WRITE_DELAY_MS);
}

export const zustandStorage = {
  // Reads must see a write that has not reached the engine yet, or a store
  // rehydrated during the window would read its own stale value.
  getItem: (name: string) => {
    const pending = pendingWrites.get(name);
    if (pending !== undefined) return pending;
    return engine.getString(name) ?? null;
  },
  setItem: (name: string, value: string) => scheduleWrite(name, value),
  removeItem: (name: string) => scheduleWrite(name, null),
};
