import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useBooksStore } from '@/store/useBooksStore';
import { useLibraryStore } from '@/store/useLibraryStore';
import { useJournalStore } from '@/store/useJournalStore';
import { useQuotesStore } from '@/store/useQuotesStore';
import { useNotesStore } from '@/store/useNotesStore';
import { useSessionsStore } from '@/store/useSessionsStore';
import { useGoalsStore } from '@/store/useGoalsStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { prettyDate, format } from '@/lib/date';
import { moodMeta } from '@/data/moods';
import type { Book, JournalEntry } from '@/types';

/**
 * Backup, export and import.
 *
 * The journal is the whole point of this app, so it must be possible to get
 * it back out in a form that outlives the app itself: one JSON file that can
 * be re-imported, and one Markdown file that can simply be read.
 */

export const BACKUP_VERSION = 1;

export type Backup = {
  version: number;
  exportedAt: string;
  app: 'marginalia';
  books: Record<string, Book>;
  library: unknown;
  journal: unknown;
  quotes: unknown;
  notes: unknown;
  sessions: unknown;
  goals: unknown;
  achievements: unknown;
  dedication: unknown;
};

export function buildBackup(): Backup {
  return {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    app: 'marginalia',
    books: useBooksStore.getState().byId,
    library: useLibraryStore.getState().entries,
    journal: useJournalStore.getState().entries,
    quotes: useQuotesStore.getState().quotes,
    notes: useNotesStore.getState().notes,
    sessions: useSessionsStore.getState().sessions,
    goals: useGoalsStore.getState().goals,
    achievements: useGoalsStore.getState().achievements,
    dedication: useSettingsStore.getState().dedication,
  };
}

export type BackupSummary = {
  books: number;
  journal: number;
  quotes: number;
  notes: number;
  sessions: number;
};

export function summarise(backup: Backup): BackupSummary {
  const count = (value: unknown) => Object.keys((value ?? {}) as object).length;
  return {
    books: count(backup.books),
    journal: count(backup.journal),
    quotes: count(backup.quotes),
    notes: count(backup.notes),
    sessions: count(backup.sessions),
  };
}

async function writeAndShare(filename: string, contents: string, mimeType: string, title: string) {
  const file = new File(Paths.cache, filename);
  // Overwrite rather than accumulate — the cache is not an archive.
  if (file.exists) file.delete();
  file.create();
  file.write(contents);

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, { mimeType, dialogTitle: title, UTI: mimeType });
  }
  return file.uri;
}

const stamp = () => format(new Date(), 'yyyy-MM-dd');

/** The machine-readable copy: everything, re-importable. */
export async function exportBackup(): Promise<string> {
  return writeAndShare(
    `bookie-backup-${stamp()}.json`,
    JSON.stringify(buildBackup(), null, 2),
    'application/json',
    'Save your Bookie backup',
  );
}

/** The human-readable copy: the journal as a document you could print. */
export async function exportJournalMarkdown(): Promise<string> {
  const books = useBooksStore.getState().byId;
  const journal = Object.values(useJournalStore.getState().entries).filter((e) => !e.draft);
  const quotes = Object.values(useQuotesStore.getState().quotes);
  const library = Object.values(useLibraryStore.getState().entries);
  const dedication = useSettingsStore.getState().dedication;

  const lines: string[] = ['# My reading journal', ''];

  if (dedication?.message) {
    lines.push('> ' + dedication.message.split('\n').join('\n> '));
    if (dedication.from) lines.push('>', `> — ${dedication.from}`);
    lines.push('');
  }

  lines.push(`_Exported ${prettyDate(new Date())}_`, '');

  // Group everything by book so the export reads like a commonplace book.
  const byBook = new Map<string, JournalEntry[]>();
  journal.forEach((entry) => {
    const existing = byBook.get(entry.bookId) ?? [];
    existing.push(entry);
    byBook.set(entry.bookId, existing);
  });

  const bookIds = Array.from(
    new Set([...byBook.keys(), ...quotes.map((q) => q.bookId).filter(Boolean) as string[]]),
  ).sort((a, b) => (books[a]?.title ?? '').localeCompare(books[b]?.title ?? ''));

  bookIds.forEach((bookId) => {
    const book = books[bookId];
    const entry = library.find((e) => e.bookId === bookId);
    lines.push('---', '', `## ${book?.title ?? 'Unknown book'}`);
    if (book?.authors.length) lines.push(`*${book.authors.join(', ')}*`);

    const facts: string[] = [];
    if (entry?.startedAt) facts.push(`Started ${prettyDate(entry.startedAt)}`);
    if (entry?.finishedAt) facts.push(`Finished ${prettyDate(entry.finishedAt)}`);
    if (entry?.rating) facts.push(`${entry.rating}/5`);
    if (facts.length) lines.push('', facts.join(' · '));

    const bookQuotes = quotes.filter((q) => q.bookId === bookId);
    if (bookQuotes.length) {
      lines.push('', '### Lines worth keeping', '');
      bookQuotes.forEach((quote) => {
        lines.push(`> ${quote.text.split('\n').join('\n> ')}`);
        const attribution = [quote.speaker, quote.chapter, quote.page ? `p. ${quote.page}` : null]
          .filter(Boolean)
          .join(' · ');
        if (attribution) lines.push('>', `> — ${attribution}`);
        lines.push('');
      });
    }

    const bookEntries = (byBook.get(bookId) ?? []).sort((a, b) => a.date - b.date);
    if (bookEntries.length) {
      lines.push('', '### Journal', '');
      bookEntries.forEach((item) => {
        const mood = moodMeta(item.mood);
        lines.push(`#### ${item.title || prettyDate(item.date)}`);
        lines.push(
          `*${prettyDate(item.date)}${mood ? ` · ${mood.emoji} ${mood.label}` : ''}${item.emoji ? ` ${item.emoji}` : ''}*`,
          '',
        );
        if (item.text) lines.push(item.text, '');

        const extras: [string, string | undefined][] = [
          ['Favourite chapter', item.chapter],
          ['Favourite character', item.favoriteCharacter],
          ['Favourite scene', item.favoriteScene],
          ['What I thought would happen', item.prediction],
          ['Something it taught me', item.lesson],
          ['Looking back', item.reflection],
          ['A memory it stirred', item.memory],
        ];
        extras.forEach(([label, value]) => {
          if (value?.trim()) lines.push(`**${label}:** ${value.trim()}`, '');
        });

        if (item.photos.length) lines.push(`*${item.photos.length} photo(s) attached*`, '');
        if (item.voiceNotes.length) lines.push(`*${item.voiceNotes.length} voice note(s) attached*`, '');
        if (item.tags.length) lines.push(item.tags.map((t) => `#${t}`).join(' '), '');
      });
    }
  });

  // Notes are not attached to any book, so they get their own section.
  const notes = Object.values(useNotesStore.getState().notes);
  if (notes.length) {
    lines.push('---', '', '## Notes', '');
    notes
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .forEach((note) => {
        lines.push(`### ${note.title || prettyDate(note.updatedAt)}`, '', note.body, '');
      });
  }

  return writeAndShare(
    `reading-journal-${stamp()}.md`,
    lines.join('\n'),
    'text/markdown',
    'Export your journal',
  );
}

export type ImportMode = 'merge' | 'replace';

export function isBackup(value: unknown): value is Backup {
  return Boolean(
    value &&
      typeof value === 'object' &&
      (value as Backup).app === 'marginalia' &&
      typeof (value as Backup).version === 'number',
  );
}

/**
 * Restores a backup.
 *
 * "merge" keeps whatever is already on the phone and adds anything missing,
 * preferring whichever copy of a record was edited most recently. "replace"
 * throws away what is here first — only offered behind a confirmation.
 */
export function restoreBackup(backup: Backup, mode: ImportMode = 'merge'): BackupSummary {
  const mergeRecords = <T extends { id: string; updatedAt?: number }>(
    current: Record<string, T>,
    incoming: Record<string, T>,
  ): Record<string, T> => {
    if (mode === 'replace') return { ...incoming };
    const out = { ...current };
    Object.entries(incoming).forEach(([id, record]) => {
      const existing = out[id];
      if (!existing || (record.updatedAt ?? 0) > (existing.updatedAt ?? 0)) out[id] = record;
    });
    return out;
  };

  const asRecord = <T>(value: unknown) => (value ?? {}) as Record<string, T>;

  useBooksStore.setState((s) => ({
    byId: mode === 'replace' ? { ...backup.books } : { ...s.byId, ...backup.books },
  }));
  useLibraryStore.setState((s) => ({ entries: mergeRecords(s.entries, asRecord(backup.library)) }));
  useJournalStore.setState((s) => ({ entries: mergeRecords(s.entries, asRecord(backup.journal)) }));
  useQuotesStore.setState((s) => ({ quotes: mergeRecords(s.quotes, asRecord(backup.quotes)) }));
  useNotesStore.setState((s) => ({ notes: mergeRecords(s.notes, asRecord(backup.notes)) }));
  useSessionsStore.setState((s) => ({
    sessions: mode === 'replace' ? asRecord(backup.sessions) : { ...s.sessions, ...asRecord(backup.sessions) },
  }));

  if (backup.goals) useGoalsStore.setState({ goals: backup.goals as never });
  if (backup.achievements) {
    useGoalsStore.setState((s) => ({
      achievements:
        mode === 'replace'
          ? asRecord(backup.achievements)
          : { ...s.achievements, ...asRecord(backup.achievements) },
    }));
  }
  if (backup.dedication) useSettingsStore.getState().setDedication(backup.dedication as never);

  return summarise(backup);
}

/** Opens the system file picker and parses whatever comes back. */
export async function readBackupFromDisk(): Promise<Backup | null> {
  // Some pickers report .json as octet-stream, so accept anything and validate.
  const picked = await File.pickFileAsync({ mimeTypes: ['application/json', 'text/plain', '*/*'] });
  if (picked.canceled || !picked.result) return null;

  const parsed = JSON.parse(await picked.result.text()) as unknown;
  return isBackup(parsed) ? parsed : null;
}
