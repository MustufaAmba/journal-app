# Marginalia

A book journal for one reader.

Not a productivity app — a digital scrapbook. Somewhere to keep what you read,
and what reading made you think: the shelves, the diary, the lines you had to
read twice, the photograph of the page you were on. It is meant to feel like a
lamp-lit corner of a second-hand bookshop rather than a piece of software.

```
book-journal/
├── mobile/    React Native (Expo) app — iOS and Android
├── server/    NestJS + MongoDB API — optional, for backup and a second device
└── docker-compose.yml
```

---

## Start here

The app is **local-first**. It runs, and keeps everything, with no backend and
no account at all. The server exists only so the journal can be backed up and
carried to a new phone.

```bash
cd mobile
npm install
npx expo start
```

Then press `i` for the iOS simulator, `a` for Android, or scan the QR code with
the Expo Go app. On the welcome screen, choose **"Just let me in — no account"**
and it works immediately.

The backend, if you want it — locally:

```bash
cp .env.example .env      # then fill in the two JWT secrets
docker compose up --build
```

…or hosted, so an installed APK can back itself up:
**[deploy to Render in ten minutes](server/README.md#deploying-to-render)**
(free tier, with MongoDB Atlas for the database).

## Giving it to someone

No app store needed — build an APK and send it.

```bash
# 1. deploy the backend, then put its URL in mobile/eas.json
# 2. build
cd mobile
npx eas build --profile preview --platform android
```

EAS gives you a download link for the `.apk`. The recipient enables
"install from unknown sources" once and that is it.

One thing to get right: `EXPO_PUBLIC_API_URL` is **compiled into the APK**, so
it has to be set in `mobile/eas.json` *before* the build. Get it wrong and the
app still works flawlessly offline — which is exactly why the mistake is easy
to miss.

---

## What is in it

**The shelves** — Currently Reading, Want to Read, Finished, Paused, Did Not
Finish, Favourites, Wishlist, Archive. Four ways to look at them: a wooden
bookshelf, a grid, a list, and a spine view where the books stand edge-on the
way they do on a real shelf. Press and hold to drag them into whatever order
pleases you.

**The journal** — the heart of it. Every book gets its own diary: mood, an
emoji, photographs, little spoken voice notes, favourite chapter, favourite
character, favourite scene, what you think happens next, what it taught you.
Nothing is ever saved by hand; it saves itself as you write.

**Keepsakes** — quotes on coloured cards you can share as an image, and sticky
notes with Markdown, pinning and colours.

**Reading tracker** — pages, minutes, a heatmap, a streak that is deliberately
forgiving, and an estimated finish based on how fast you have actually been
reading rather than an average.

**Quiet delights** — a dedication page written in the front, reading
anniversaries, "this day in reading" from previous years, achievement postcards
instead of badges, ambient weather that drifts behind the page and follows both
the theme and the season.

**Eight themes** — Classic Library, Autumn, Coffee Shop, Rainy Evening, Forest
Reading, Sepia Paper, Morning Light and Midnight. Each one changes the colours,
the paper grain, the illustrations and the weather.

Books come from [Open Library](https://openlibrary.org), with Google Books
filling in anything missing. Search by title, author or ISBN, or point the
camera at a barcode.

---

## Making it yours

The single most important screen is the dedication. On first launch the app
asks you to write it; afterwards it lives under **Settings → Dedication**. It is
what turns this from an app into a gift, so it is worth five quiet minutes.

A few other things worth setting before you hand the phone over:

- **Settings → Theme** — pick the room that suits them.
- **Settings → Gentle reminders** — off by default, and worded like a friend.
- **You → Reading goals** — or leave them at zero, which the app treats as
  "reading for its own sake" rather than a failure.

---

## Documentation

- [mobile/README.md](mobile/README.md) — architecture, running on a device, the design system
- [server/README.md](server/README.md) — API reference, sync model, deployment

## Licence

MIT. Written to be given away.
