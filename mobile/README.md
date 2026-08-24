# Marginalia — mobile

React Native (Expo SDK 57) app for iOS and Android.

```bash
npm install
npx expo start          # then i / a, or scan with Expo Go
```

The app needs no backend and no account. Guest mode keeps everything on the
phone and is a first-class way to use it, not a trial.

## Running on a real device

Expo Go is the quickest way to try it. Two native modules are not available
there — MMKV storage and haptics — and the app degrades gracefully: storage
falls back to AsyncStorage, and haptics simply do nothing.

For the real thing, build it:

```bash
npx expo run:ios        # needs Xcode with an iOS simulator runtime installed
npx expo run:android    # needs Android Studio and a device or emulator
```

To put it on someone's phone properly, [EAS Build](https://docs.expo.dev/build/introduction/)
is the least painful route:

```bash
npx eas build --profile preview --platform ios
```

## Configuration

Everything works with no configuration. Two optional environment variables:

```bash
EXPO_PUBLIC_API_URL=http://localhost:4000      # backup/sync server
EXPO_PUBLIC_GOOGLE_BOOKS_KEY=…                 # raises the Google Books rate limit
```

## How it is put together

```
src/
├── theme/          eight palettes, the type scale, the ThemeProvider
├── components/     the design system — Card, BookCover, Shelf, QuoteCard…
│   └── illustrations/   hand-inked SVGs that take the theme's colours
├── screens/        one folder per area of the app
├── store/          Zustand stores, persisted through MMKV
├── api/            Open Library, Google Books, and our own backend
├── hooks/          data hooks (TanStack Query), autosave, milestones, stats
├── lib/            storage, dates, colour, haptics, notifications, backup
└── data/           shelves, moods, greetings, quotes about reading
```

### Local-first, always

Every write goes to local storage first and drops an operation in an outbound
queue (`store/useSyncStore.ts`). Nothing in the app ever waits on the network.
When a connection and a signed-in account both exist, the queue drains
oldest-first; if the reader never signs in, it sits there harmlessly.

Storage is MMKV, which is synchronous — that is what lets Zustand hydrate
before the first frame, so the app never flashes an empty shelf. In Expo Go,
where MMKV has no native module, `lib/storage.ts` falls back to an in-memory
map mirrored to AsyncStorage, and `store/index.ts` re-runs hydration before the
first render.

### The design system

Nothing is hard-coded. `theme/palettes.ts` defines eight rooms; every colour,
the paper grain, the ambient weather and the illustrations all come from the
active one. `theme/tokens.ts` holds the 4pt spacing scale, the type scale, the
shadow ramp and — importantly — the motion constants, so the whole app
breathes at the same rate.

Three rules that keep it feeling handmade:

1. **Every surface has grain.** `PaperTexture` is an SVG fractal-noise filter,
   not a bitmap, so it scales anywhere and ships no asset.
2. **Every touch presses in.** `components/Pressable` scales and haptically
   taps; nothing in the app is a flat web-style button.
3. **Animations are slow.** Springs are damped, fades are ~260ms, particles
   drift for twenty seconds. All of it turns off under **Calmer animations**.

### Notable pieces

| File | What it does |
|---|---|
| `components/Ambience.tsx` | The dust, rain, leaves, snow and fireflies. UI-thread Reanimated, so scrolling stays smooth. |
| `components/DraggableGrid.tsx` | Hand-written drag-to-reorder. Books lift, others slide aside, everything settles with a bounce. |
| `components/BookCover.tsx` | Renders a typeset cloth binding under the artwork, so a missing or slow cover still looks like a book. |
| `components/MarkdownText.tsx` | A ~180-line Markdown renderer for notes. No parser, no WebView. |
| `hooks/useMilestones.ts` | Watches the reader's own data and posts a postcard. Deliberately not gamified. |
| `lib/backup.ts` | Exports everything as JSON (re-importable) and the journal as Markdown (readable forever). |

## Accessibility

Text scales through the app's own setting rather than the OS, so serif
headings, handwriting and UI scale together and nothing breaks its layout.
Every control has a label and a role, ratings are `adjustable`, and **Calmer
animations** removes parallax, particles and springs in one switch.

## Known limits

- Voice notes and photos are stored as file paths on the device, so a JSON
  backup carries the references but not the files themselves.
- The heatmap and streak use the device's local timezone, which is the right
  answer for a reading diary and the wrong one if you cross a date line often.
