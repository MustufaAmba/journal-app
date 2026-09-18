/**
 * All environment reading happens here, once, with sensible defaults so the
 * server starts on a fresh clone with nothing but `docker compose up`.
 */
export type AppConfig = ReturnType<typeof configuration>;

const list = (value?: string) =>
  (value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

/**
 * Catches connection strings that will never work, and says why.
 *
 * Atlas offers several "Connect" options and only one of them is the driver
 * string. The SQL / Data Federation endpoint in particular looks plausible but
 * speaks a different protocol, and the driver's own error for it is a generic
 * "check your IP allowlist", which sends you looking in the wrong place
 * entirely. Better to refuse it at boot with a straight answer.
 */
export function describeBadMongoUri(uri: string): string | null {
  if (!uri.trim()) return 'MONGODB_URI is empty.';

  if (!/^mongodb(\+srv)?:\/\//.test(uri)) {
    return 'MONGODB_URI must start with mongodb:// or mongodb+srv://';
  }

  if (uri.includes('atlas-sql-') || uri.includes('.query.mongodb.net')) {
    return [
      'That is the Atlas SQL / Data Federation endpoint, not the database.',
      'In Atlas use Connect → Drivers, and copy the string that looks like:',
      '  mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/marginalia',
    ].join('\n  ');
  }

  if (/<[^>]+>/.test(uri)) {
    return 'MONGODB_URI still contains a placeholder like <password> — substitute the real value.';
  }

  if (/mongodb\+srv:\/\/[^/]*@[^/?]+\/?(\?|$)/.test(uri)) {
    return [
      'MONGODB_URI has no database name, so the driver silently uses "test".',
      '',
      'Careful here. If this server has been running without a name, every',
      'record it has ever written is in "test" — adding a fresh name now',
      'points it at an empty database and the data will look lost.',
      '',
      'Check Atlas > Browse Collections for the database holding',
      '"library_entries", and name that one before the query string:',
      '  ...mongodb.net/test?retryWrites=true',
      '',
      'Only use a new name on a genuinely new deployment.',
    ].join('\n  ');
  }

  return null;
}

export const configuration = () => ({
  port: Number.parseInt(process.env.PORT ?? '4000', 10),
  env: process.env.NODE_ENV ?? 'development',
  corsOrigins: list(process.env.CORS_ORIGINS),

  mongo: {
    uri: process.env.MONGODB_URI ?? 'mongodb://localhost:27017/marginalia',
  },

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET ?? 'dev-only-access-secret-change-me',
    refreshSecret: process.env.JWT_REFRESH_SECRET ?? 'dev-only-refresh-secret-change-me',
    accessTtl: process.env.JWT_ACCESS_TTL ?? '30m',
    refreshTtl: process.env.JWT_REFRESH_TTL ?? '60d',
  },


  books: {
    googleApiKey: process.env.GOOGLE_BOOKS_API_KEY ?? '',
    /** how long a cached book record is considered fresh */
    cacheTtlMs: 1000 * 60 * 60 * 24 * 30,
  },
});
