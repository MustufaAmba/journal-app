# Marginalia — server

A small NestJS + MongoDB API. Its entire job is to let one person's journal
survive a new phone.

**The app does not need it.** Everything works offline and forever without an
account; this exists for backup and for keeping two devices in step.

```bash
# from the repository root
cp .env.example .env      # fill in the two JWT secrets
docker compose up --build
```

Or locally, against a MongoDB you already have running:

```bash
npm install
cp .env.example .env
npm run dev               # http://localhost:4000
```

## Configuration

| Variable | Default | Notes |
|---|---|---|
| `PORT` | `4000` | |
| `MONGODB_URI` | `mongodb://localhost:27017/marginalia` | |
| `JWT_ACCESS_SECRET` | — | **Required.** `openssl rand -base64 48` |
| `JWT_REFRESH_SECRET` | — | **Required**, and different from the above. |
| `JWT_ACCESS_TTL` | `30m` | |
| `JWT_REFRESH_TTL` | `60d` | |
| `CORS_ORIGINS` | *(empty)* | Comma-separated. Empty means "phones only" — a mobile app sends no `Origin`. |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | *(empty)* | Leave blank and Google sign-in simply does not exist. |
| `GOOGLE_BOOKS_API_KEY` | *(empty)* | Only raises the rate limit on the metadata fallback. |

## API

Everything requires `Authorization: Bearer <accessToken>` unless marked public.

### Auth

| | | |
|---|---|---|
| `POST` | `/auth/register` | public · `{name, email, password}` → user + tokens |
| `POST` | `/auth/login` | public · `{email, password}` |
| `POST` | `/auth/refresh` | public · `{refreshToken}` → rotates both tokens |
| `POST` | `/auth/forgot-password` | public · always reports success |
| `POST` | `/auth/reset-password` | public · `{email, token, password}` |
| `GET` | `/auth/google` | public · `?redirect=<app deep link>` |
| `GET` | `/auth/me` · `PATCH /auth/me` | profile |
| `POST` | `/auth/logout` | revokes the refresh token |

### Books — all public

| | |
|---|---|
| `GET /books/search?q=&mode=all\|title\|author\|isbn` | Open Library search, cached |
| `GET /books/:id` | full detail, enriched from Google Books if thin |
| `GET /books/isbn/:isbn` | barcode lookup |
| `GET /books/:id/related` | same author, then same subject |
| `GET /books/author/:key` · `GET /books/subject/:subject` | |

### Sync

`library`, `journal`, `quotes`, `notes` and `sessions` all speak the same three verbs:

| | |
|---|---|
| `GET /<entity>?since=<ms>` | everything changed since a timestamp |
| `POST /<entity>` | one record, or an array of them |
| `DELETE /<entity>/:clientId` | soft delete |

Plus `GET /goals` · `POST /goals`, `GET /sync/snapshot`, `GET /sync/status`,
`DELETE /sync/everything`, and a public `GET /health`.

## How sync works

The **phone owns identity**. Records are created offline with an id generated
on the device, and the server stores whatever it is given under that id
(`clientId`). That is what lets someone write in the journal on a plane and
have it land correctly hours later.

Conflicts are resolved **last-writer-wins by the device clock**, read from the
record's own `updatedAt`. An older edit arriving late is dropped rather than
allowed to clobber a newer one. There is no merge UI and there should not be:
this is one person with at most two devices, and a dialogue box asking them to
reconcile two versions of their own diary would be a worse product.

Deletes are **soft**. A hard delete would be resurrected the moment another
device pushed its stale copy.

`src/common/sync/` holds all of this, and `owned.service.spec.ts` covers each
rule with a real database.

## Security notes

- Passwords: bcrypt, 12 rounds.
- Refresh tokens: **SHA-256, not bcrypt**, compared in constant time. bcrypt
  truncates at 72 bytes and two JWTs for the same user share far more prefix
  than that, so bcrypt would consider a revoked token equal to its
  replacement — rotation would silently revoke nothing. There is a regression
  test for this in `src/auth/auth.tokens.spec.ts`.
- Refresh tokens rotate on every use and are stored hashed, so a leaked
  database cannot mint sessions.
- Every route is behind the JWT guard by default; public routes opt out with
  `@Public()` rather than the other way round.
- The Google callback only ever redirects to the app's own scheme or an
  allow-listed origin — an open redirect here would hand out tokens.
- Login, registration and password reset are rate-limited.

## Tests

```bash
npm test
```

Nine tests: the sync semantics above (against a real MongoDB, skipped
automatically if none is reachable) and the token-hashing regression.

## Deploying

The `Dockerfile` is a two-stage build that runs as a non-root user and has a
real health check. Anywhere that runs a container and can reach a MongoDB will
do — Fly.io, Railway, a Raspberry Pi in a cupboard. Set the two JWT secrets and
point `MONGODB_URI` at your database.
