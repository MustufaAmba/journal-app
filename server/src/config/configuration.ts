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
