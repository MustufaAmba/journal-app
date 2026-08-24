export type ShelfId =
  | 'wantToRead'
  | 'currentlyReading'
  | 'finished'
  | 'paused'
  | 'didNotFinish'
  | 'favorites'
  | 'wishlist'
  | 'archive';

export type Book = {
  /** stable local id; equals the Open Library work key when we have one */
  id: string;
  workKey?: string;
  editionKey?: string;
  title: string;
  subtitle?: string;
  authors: string[];
  authorKeys?: string[];
  coverUrl?: string;
  /** solid colour used when there is no cover art */
  spineColor?: string;
  summary?: string;
  genres: string[];
  publisher?: string;
  publishedDate?: string;
  firstPublishYear?: number;
  isbn10?: string;
  isbn13?: string;
  pageCount?: number;
  language?: string;
  series?: string;
  seriesPosition?: number;
  /** ms epoch of the last successful metadata fetch */
  fetchedAt?: number;
  source?: 'openlibrary' | 'google' | 'manual';
};

export type AuthorDetail = {
  key: string;
  name: string;
  bio?: string;
  birthDate?: string;
  deathDate?: string;
  photoUrl?: string;
  topWorks?: { id: string; title: string; coverUrl?: string }[];
};

/** A book that lives on the reader's shelves, with everything personal attached. */
export type LibraryEntry = {
  id: string;
  bookId: string;
  shelf: ShelfId;
  /** manual order within the shelf; lower is further left */
  order: number;
  favorite: boolean;
  rating?: number; // 0.5 – 5, half steps
  addedAt: number;
  startedAt?: number;
  finishedAt?: number;
  /** every time this book has been read, newest last */
  rereads?: { startedAt: number; finishedAt: number }[];
  currentPage: number;
  /** overrides book.pageCount when the reader's edition differs */
  pageCountOverride?: number;
  format?: 'paperback' | 'hardcover' | 'ebook' | 'audiobook';
  privateNote?: string;
  /** anniversary confetti already shown for these ISO dates */
  celebratedOn?: string[];
  updatedAt: number;
};

export type ReadingSession = {
  id: string;
  bookId: string;
  /** yyyy-MM-dd, the day the pages were read */
  date: string;
  startPage: number;
  endPage: number;
  minutes: number;
  note?: string;
  createdAt: number;
};

export type Mood =
  | 'cosy'
  | 'moved'
  | 'thrilled'
  | 'thoughtful'
  | 'heartbroken'
  | 'delighted'
  | 'restless'
  | 'peaceful';

export type JournalEntry = {
  id: string;
  bookId: string;
  title?: string;
  /** ms epoch — the date the entry is *about*, editable by the reader */
  date: number;
  mood?: Mood;
  emoji?: string;
  text: string;
  photos: string[];
  voiceNotes: { uri: string; durationMs: number; recordedAt: number }[];
  chapter?: string;
  favoriteCharacter?: string;
  favoriteScene?: string;
  prediction?: string;
  lesson?: string;
  reflection?: string;
  memory?: string;
  pageRef?: number;
  tags: string[];
  createdAt: number;
  updatedAt: number;
  /** true while the entry has never been committed — used for the draft chip */
  draft?: boolean;
};

export type Quote = {
  id: string;
  bookId?: string;
  /** kept denormalised so a quote survives a book being removed */
  bookTitle?: string;
  bookAuthor?: string;
  text: string;
  page?: number;
  chapter?: string;
  speaker?: string;
  category?: string;
  favorite: boolean;
  colorIndex: number;
  createdAt: number;
  updatedAt: number;
};

export type Note = {
  id: string;
  bookId?: string;
  title?: string;
  body: string;
  colorIndex: number;
  pinned: boolean;
  tags: string[];
  createdAt: number;
  updatedAt: number;
};

export type Goals = {
  booksPerYear: number;
  booksPerMonth: number;
  pagesPerDay: number;
  minutesPerDay: number;
  /** the year the yearly goal applies to */
  year: number;
};

export type Achievement = {
  id: string;
  kind:
    | 'firstBook'
    | 'streak'
    | 'booksMilestone'
    | 'pagesMilestone'
    | 'genreExplorer'
    | 'nightOwl'
    | 'yearGoal'
    | 'anniversary'
    | 'journalMilestone';
  title: string;
  message: string;
  /** the postcard illustration to print on the front */
  scene: 'window' | 'shelf' | 'lamp' | 'forest' | 'cafe' | 'stars';
  earnedAt: number;
  bookId?: string;
  seen: boolean;
};

export type UserProfile = {
  id: string;
  name?: string;
  email?: string;
  avatarUrl?: string;
  guest: boolean;
};

export type SyncOp = {
  id: string;
  entity: 'library' | 'journal' | 'quote' | 'note' | 'session' | 'goals' | 'profile';
  action: 'upsert' | 'delete';
  payload: unknown;
  createdAt: number;
  attempts: number;
  lastError?: string;
};
