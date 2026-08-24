import { hydrateStorage, isNativeStorage } from '@/lib/storage';
import { useSettingsStore } from './useSettingsStore';
import { useAuthStore } from './useAuthStore';
import { useBooksStore } from './useBooksStore';
import { useLibraryStore } from './useLibraryStore';
import { useJournalStore } from './useJournalStore';
import { useQuotesStore } from './useQuotesStore';
import { useNotesStore } from './useNotesStore';
import { useSessionsStore } from './useSessionsStore';
import { useGoalsStore } from './useGoalsStore';
import { useSyncStore } from './useSyncStore';

export {
  useSettingsStore,
  useAuthStore,
  useBooksStore,
  useLibraryStore,
  useJournalStore,
  useQuotesStore,
  useNotesStore,
  useSessionsStore,
  useGoalsStore,
  useSyncStore,
};

const PERSISTED = [
  useSettingsStore,
  useAuthStore,
  useBooksStore,
  useLibraryStore,
  useJournalStore,
  useQuotesStore,
  useNotesStore,
  useSessionsStore,
  useGoalsStore,
  useSyncStore,
];

/**
 * Loads persisted state before the first frame.
 *
 * Zustand's persist middleware reads storage the moment a store module is
 * imported. With MMKV that is synchronous and everything is already in place.
 * Without it — in Expo Go, or on the web — the underlying map has to be filled
 * from AsyncStorage first, which means the stores rehydrated against an empty
 * store and have to be told to read again.
 */
export async function hydrateStores(): Promise<void> {
  await hydrateStorage();
  if (isNativeStorage) return;
  await Promise.all(PERSISTED.map((store) => store.persist.rehydrate()));
}
