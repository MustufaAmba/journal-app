import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from '@/lib/storage';
import { createId } from '@/lib/id';
import { enqueue } from './useSyncStore';
import { isAnniversaryOf } from '@/lib/date';
import type { JournalEntry } from '@/types';

/**
 * The journal. This is the part of the app that matters most, so the rules are
 * strict: an entry is never lost, never blocked on a network call, and never
 * requires the reader to press Save.
 */

type JournalState = {
  entries: Record<string, JournalEntry>;

  /** create a blank entry immediately so autosave has something to write into */
  startEntry: (bookId: string, seed?: Partial<JournalEntry>) => JournalEntry;
  /** autosave target — merges a patch and stamps updatedAt */
  save: (id: string, patch: Partial<JournalEntry>) => void;
  /** promote a draft to a real entry once it has any content */
  commit: (id: string) => void;
  remove: (id: string) => void;
  addPhoto: (id: string, uri: string) => void;
  removePhoto: (id: string, uri: string) => void;
  addVoiceNote: (id: string, note: { uri: string; durationMs: number }) => void;
  removeVoiceNote: (id: string, uri: string) => void;
  /** throw away an untouched draft when the editor closes */
  discardIfEmpty: (id: string) => void;
};

const EMPTY: Omit<JournalEntry, 'id' | 'bookId' | 'createdAt' | 'updatedAt' | 'date'> = {
  title: undefined,
  mood: undefined,
  emoji: undefined,
  text: '',
  photos: [],
  voiceNotes: [],
  tags: [],
};

/** An entry is "empty" when there is genuinely nothing worth keeping. */
export function isEntryEmpty(entry: JournalEntry): boolean {
  return (
    !entry.text.trim() &&
    !entry.title?.trim() &&
    !entry.photos.length &&
    !entry.voiceNotes.length &&
    !entry.mood &&
    !entry.emoji &&
    !entry.tags.length &&
    !entry.chapter?.trim() &&
    !entry.favoriteCharacter?.trim() &&
    !entry.favoriteScene?.trim() &&
    !entry.prediction?.trim() &&
    !entry.lesson?.trim() &&
    !entry.reflection?.trim() &&
    !entry.memory?.trim()
  );
}

export const useJournalStore = create<JournalState>()(
  persist(
    (set, get) => ({
      entries: {},

      startEntry: (bookId, seed) => {
        const stamp = Date.now();
        const entry: JournalEntry = {
          id: createId('jrn'),
          bookId,
          date: stamp,
          createdAt: stamp,
          updatedAt: stamp,
          draft: true,
          ...EMPTY,
          ...seed,
        };
        set((s) => ({ entries: { ...s.entries, [entry.id]: entry } }));
        return entry;
      },

      save: (id, patch) =>
        set((s) => {
          const entry = s.entries[id];
          if (!entry) return s;
          const next: JournalEntry = { ...entry, ...patch, updatedAt: Date.now() };
          // The first real keystroke turns a draft into an entry.
          if (next.draft && !isEntryEmpty(next)) next.draft = false;
          if (!next.draft) enqueue('journal', 'upsert', next);
          return { entries: { ...s.entries, [id]: next } };
        }),

      commit: (id) => {
        const entry = get().entries[id];
        if (!entry) return;
        get().save(id, { draft: false });
      },

      remove: (id) =>
        set((s) => {
          const entries = { ...s.entries };
          delete entries[id];
          enqueue('journal', 'delete', { id });
          return { entries };
        }),

      addPhoto: (id, uri) => {
        const entry = get().entries[id];
        if (!entry || entry.photos.includes(uri)) return;
        get().save(id, { photos: [...entry.photos, uri] });
      },

      removePhoto: (id, uri) => {
        const entry = get().entries[id];
        if (!entry) return;
        get().save(id, { photos: entry.photos.filter((p) => p !== uri) });
      },

      addVoiceNote: (id, note) => {
        const entry = get().entries[id];
        if (!entry) return;
        get().save(id, {
          voiceNotes: [...entry.voiceNotes, { ...note, recordedAt: Date.now() }],
        });
      },

      removeVoiceNote: (id, uri) => {
        const entry = get().entries[id];
        if (!entry) return;
        get().save(id, { voiceNotes: entry.voiceNotes.filter((v) => v.uri !== uri) });
      },

      discardIfEmpty: (id) => {
        const entry = get().entries[id];
        if (entry && entry.draft && isEntryEmpty(entry)) get().remove(id);
      },
    }),
    { name: 'journal.v1', storage: createJSONStorage(() => zustandStorage) },
  ),
);

/* ---------------------------- selectors ---------------------------- */

export const journalForBook = (entries: Record<string, JournalEntry>, bookId: string): JournalEntry[] =>
  Object.values(entries)
    .filter((e) => e.bookId === bookId && !e.draft)
    .sort((a, b) => b.date - a.date);

export const allEntriesNewestFirst = (entries: Record<string, JournalEntry>): JournalEntry[] =>
  Object.values(entries)
    .filter((e) => !e.draft)
    .sort((a, b) => b.date - a.date);

/** "This Day in Reading" — entries written on this calendar day in past years. */
export const entriesOnThisDay = (
  entries: Record<string, JournalEntry>,
  on: Date = new Date(),
): JournalEntry[] =>
  Object.values(entries)
    .filter((e) => !e.draft && isAnniversaryOf(e.date, on))
    .sort((a, b) => b.date - a.date);

export const allJournalTags = (entries: Record<string, JournalEntry>): string[] => {
  const counts = new Map<string, number>();
  Object.values(entries).forEach((entry) => {
    if (entry.draft) return;
    entry.tags.forEach((tag) => counts.set(tag, (counts.get(tag) ?? 0) + 1));
  });
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([tag]) => tag);
};

export const searchJournal = (entries: Record<string, JournalEntry>, query: string): JournalEntry[] => {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return allEntriesNewestFirst(entries).filter((entry) =>
    [
      entry.title,
      entry.text,
      entry.chapter,
      entry.favoriteCharacter,
      entry.favoriteScene,
      entry.prediction,
      entry.lesson,
      entry.reflection,
      entry.memory,
      entry.tags.join(' '),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(q),
  );
};
