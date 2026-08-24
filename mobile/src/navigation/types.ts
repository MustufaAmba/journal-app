import type { NavigatorScreenParams } from '@react-navigation/native';
import type { ShelfId } from '@/types';

export type TabParamList = {
  Home: undefined;
  Library: { shelf?: ShelfId } | undefined;
  Journal: undefined;
  Collection: { tab?: 'quotes' | 'notes' } | undefined;
  You: undefined;
};

export type RootStackParamList = {
  Welcome: undefined;
  SignIn: undefined;
  SignUp: undefined;
  ForgotPassword: { email?: string } | undefined;
  DedicationWrite: { firstRun?: boolean } | undefined;
  Dedication: undefined;

  Tabs: NavigatorScreenParams<TabParamList>;

  BookDetail: { bookId: string; entryId?: string };
  Author: { authorKey: string; name?: string };
  Search: { initialQuery?: string; mode?: 'all' | 'title' | 'author' | 'isbn' } | undefined;
  Scanner: undefined;
  AddBookManually: { title?: string } | undefined;

  JournalEntry: { entryId?: string; bookId?: string };
  QuoteEditor: { quoteId?: string; bookId?: string };
  NoteEditor: { noteId?: string; bookId?: string };

  ReadingLog: { bookId: string };
  Stats: undefined;
  Goals: undefined;
  Achievements: undefined;
  ThisDay: undefined;

  Settings: undefined;
  Themes: undefined;
  DataAndBackup: undefined;
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
