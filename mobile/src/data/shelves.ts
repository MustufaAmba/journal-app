import type { ShelfId } from '@/types';

export type ShelfMeta = {
  id: ShelfId;
  name: string;
  /** shown on the empty shelf, in the reader's own voice */
  empty: string;
  icon: string;
  /** shelves that describe an active state get the accent ribbon */
  accent?: boolean;
};

export const SHELVES: Record<ShelfId, ShelfMeta> = {
  currentlyReading: {
    id: 'currentlyReading',
    name: 'Currently Reading',
    empty: 'Nothing open just now. What will it be?',
    icon: 'book-open-variant',
    accent: true,
  },
  wantToRead: {
    id: 'wantToRead',
    name: 'Want to Read',
    empty: 'The lovely pile of soon. Add the first one.',
    icon: 'bookmark-outline',
  },
  finished: {
    id: 'finished',
    name: 'Finished',
    empty: 'Every finished book lands here, with the date you closed it.',
    icon: 'check-circle-outline',
  },
  paused: {
    id: 'paused',
    name: 'Paused',
    empty: 'Books resting with a bookmark in them. No guilt allowed.',
    icon: 'pause-circle-outline',
  },
  didNotFinish: {
    id: 'didNotFinish',
    name: 'Did Not Finish',
    empty: 'Life is short and some books are long. Nothing here yet.',
    icon: 'close-circle-outline',
  },
  favorites: {
    id: 'favorites',
    name: 'Favorites',
    empty: 'The ones you would press into someone else’s hands.',
    icon: 'heart-outline',
    accent: true,
  },
  wishlist: {
    id: 'wishlist',
    name: 'Wishlist',
    empty: 'For the bookshop trip you are already planning.',
    icon: 'gift-outline',
  },
  archive: {
    id: 'archive',
    name: 'Archive',
    empty: 'Tucked away, but never thrown out.',
    icon: 'archive-outline',
  },
};

/** Order the shelves appear in the library and in pickers. */
export const SHELF_ORDER: ShelfId[] = [
  'currentlyReading',
  'wantToRead',
  'finished',
  'paused',
  'didNotFinish',
  'favorites',
  'wishlist',
  'archive',
];

/** Shelves that count toward reading statistics and goals. */
export const COUNTED_SHELVES: ShelfId[] = ['currentlyReading', 'finished', 'paused', 'didNotFinish'];
