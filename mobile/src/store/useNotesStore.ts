import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from '@/lib/storage';
import { createId } from '@/lib/id';
import { enqueue } from './useSyncStore';
import type { Note } from '@/types';

type NotesState = {
  notes: Record<string, Note>;
  create: (seed?: Partial<Note>) => Note;
  save: (id: string, patch: Partial<Note>) => void;
  togglePin: (id: string) => void;
  cycleColor: (id: string) => void;
  remove: (id: string) => void;
  discardIfEmpty: (id: string) => void;
};

export const NOTE_COLOR_COUNT = 6;

export const useNotesStore = create<NotesState>()(
  persist(
    (set, get) => ({
      notes: {},

      create: (seed) => {
        const stamp = Date.now();
        const note: Note = {
          id: createId('note'),
          body: '',
          colorIndex: Math.floor(Math.random() * NOTE_COLOR_COUNT),
          pinned: false,
          tags: [],
          createdAt: stamp,
          updatedAt: stamp,
          ...seed,
        };
        set((s) => ({ notes: { ...s.notes, [note.id]: note } }));
        return note;
      },

      save: (id, patch) =>
        set((s) => {
          const note = s.notes[id];
          if (!note) return s;
          const next = { ...note, ...patch, updatedAt: Date.now() };
          enqueue('note', 'upsert', next);
          return { notes: { ...s.notes, [id]: next } };
        }),

      togglePin: (id) => {
        const note = get().notes[id];
        if (note) get().save(id, { pinned: !note.pinned });
      },

      cycleColor: (id) => {
        const note = get().notes[id];
        if (note) get().save(id, { colorIndex: (note.colorIndex + 1) % NOTE_COLOR_COUNT });
      },

      remove: (id) =>
        set((s) => {
          const notes = { ...s.notes };
          delete notes[id];
          enqueue('note', 'delete', { id });
          return { notes };
        }),

      discardIfEmpty: (id) => {
        const note = get().notes[id];
        if (note && !note.body.trim() && !note.title?.trim()) get().remove(id);
      },
    }),
    { name: 'notes.v1', storage: createJSONStorage(() => zustandStorage) },
  ),
);

/** Pinned notes float to the top of the board, then newest first. */
export const allNotes = (notes: Record<string, Note>): Note[] =>
  Object.values(notes).sort(
    (a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt - a.updatedAt,
  );

export const notesForBook = (notes: Record<string, Note>, bookId: string): Note[] =>
  allNotes(notes).filter((n) => n.bookId === bookId);

export const searchNotes = (notes: Record<string, Note>, query: string): Note[] => {
  const q = query.trim().toLowerCase();
  if (!q) return allNotes(notes);
  return allNotes(notes).filter((note) =>
    [note.title, note.body, note.tags.join(' ')].filter(Boolean).join(' ').toLowerCase().includes(q),
  );
};
