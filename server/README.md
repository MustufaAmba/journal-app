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

**Three values need filling in. Everything else already has a working default.**

| Variable | | Notes |
|---|---|---|
| `MONGODB_URI` | **required** | `mongodb+srv://user:pass@cluster0.xxxxx.mongodb.net/marginalia?retryWrites=true&w=majority` |
| `JWT_ACCESS_SECRET` | **required** | `openssl rand -base64 48` |
| `JWT_REFRESH_SECRET` | **required** | The same command again — a *different* value |

On Render both secrets are generated for you, so `MONGODB_URI` is the only
thing you are asked for.

<details>
<summary>The rest, all optional</summary>

| Variable | Default | Notes |
|---|---|---|
| `PORT` | `4000` | Render injects this; do not set it there. |
| `NODE_ENV` | `development` | |
| `JWT_ACCESS_TTL` | `30m` | |
| `JWT_REFRESH_TTL` | `60d` | How long before a reader has to sign in again. |
| `CORS_ORIGINS` | *(empty)* | Comma-separated. Empty means "the app only" — a phone sends no `Origin` header. Only needed if a website calls this API. |
| `GOOGLE_BOOKS_API_KEY` | *(empty)* | Only raises the rate limit on the metadata fallback. Open Library needs no key. |

**Google sign-in** needs all three, or none. Unset, the feature simply does not
exist and email accounts and guest mode are unaffected.

| Variable | Notes |
|---|---|
| `GOOGLE_CLIENT_ID` | From the Google Cloud console |
| `GOOGLE_CLIENT_SECRET` | |
| `GOOGLE_CALLBACK_URL` | **Must be your real URL in production** — `https://your-service.onrender.com/auth/google/callback`. The default is localhost and will not work once deployed. |

</details>

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

## Deploying to Render

Render has no managed MongoDB, so the database goes on **MongoDB Atlas** (free
M0 tier) and only the API runs on Render. About ten minutes, start to finish.

### 1. The database — MongoDB Atlas

1. Create a free account, then **Build a Database → M0 (Free)**.
2. **Database Access →** add a user. Use a generated password and copy it now.
3. **Network Access →** add `0.0.0.0/0`. Render's free tier has no fixed
   outbound IP, so there is nothing narrower to allow-list. The database is
   still protected by the username and password.
4. **Connect → Drivers** and copy the string. Add the database name before the
   query string:

   ```
   mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/marginalia?retryWrites=true&w=majority
                                                          ^^^^^^^^^^^
   ```

   If the password contains `@ : / ? # [ ] %`, percent-encode it or the URI
   will not parse.

### 2. The API — Render

Push this repository to GitHub, then in Render:

**New → Blueprint → select the repository → Apply.**

Render reads [`render.yaml`](../render.yaml) at the repository root and sets
everything up: the build and start commands, the `/health` check, and both JWT
secrets, which it generates itself. The only thing it asks you for is
`MONGODB_URI` — paste the Atlas string from step 1.

There is nothing to configure in the dashboard afterwards. To do it by hand
instead of via the blueprint, the equivalent settings are:

| Setting | Value |
|---|---|
| Root directory | `server` |
| Build command | `npm ci && npm run build` |
| Start command | `node dist/main` |
| Health check path | `/health` |
| Env | `MONGODB_URI`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `NODE_ENV=production` |

Render injects `PORT` itself; the app already reads it and binds `0.0.0.0`.

### 3. Check it

```bash
curl https://YOUR-SERVICE.onrender.com/health
# {"status":"ok","database":"connected",...}
```

`database: "connected"` is the part that matters — `ok` with `disconnected`
means the Atlas URI or the network allow-list is wrong.

### 4. Point the app at it

The API URL is **compiled into the APK**, not read at runtime. Set it in
[`mobile/eas.json`](../mobile/eas.json) before building:

```json
"preview": {
  "env": { "EXPO_PUBLIC_API_URL": "https://YOUR-SERVICE.onrender.com" }
}
```

Then build the APK:

```bash
cd mobile
npx eas build --profile preview --platform android
```

An APK built without that variable points at `localhost`, and sync will
silently never run — the app keeps working perfectly offline, which makes the
mistake easy to miss.

### About the free tier

A free Render service **sleeps after 15 minutes of inactivity** and takes
roughly 50 seconds to wake. This is fine here, by design: the app is
local-first, so nothing the reader does ever waits on the server. The client's
health check allows a full minute for a cold start before deciding it is
offline, and anything unsynced stays queued until next time.

If you would rather it stayed awake, either move to Render's paid Starter plan
or point a free uptime monitor (UptimeRobot, Better Stack) at `/health` every
ten minutes.

Atlas's free tier does not sleep, so nothing is ever lost while the API is
suspended.

## Deploying elsewhere

The `Dockerfile` is a two-stage build that runs as a non-root user and has a
real health check. Anywhere that runs a container and can reach a MongoDB will
do — Fly.io, Railway, a Raspberry Pi in a cupboard. Set the two JWT secrets and
point `MONGODB_URI` at your database.
