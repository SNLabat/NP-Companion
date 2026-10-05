# NP Companion

An unofficial, read-only mirror of the in-city **Twatter** feed from the NoPixel V Companion, rebuilt on Next.js for Vercel. Browse the city feed, threads, character profiles and city news, follow characters, bookmark posts, and see which characters are live on Twitch.

> Fan project. Not affiliated with NoPixel. Posts, names and images belong to their in-game authors and load from NoPixel's CDN.

## What's different from the original

| | Original | This app |
|---|---|---|
| Reposts | Silently dropped (about 40% of the feed) | Resolved to the original post, grouped ("A, B and 3 others reposted") |
| Freshness | Refetch on tab focus | Live polling every 20s with a "N new posts" pill; auto-inserts when you're at the top |
| Follows | Max 20, IDs in the URL | Up to 200, sent in the request body |
| Bookmarks | IDs in the URL (breaks at a few hundred) | Paginated server-side, up to 5,000 |
| Sync | This browser only | Optional Twitch sign-in syncs follows/bookmarks (Supabase), plus JSON export/import |
| Search | All results in one response | Paginated, with a People tab; #hashtags and @mentions are clickable |
| Discovery | None | "Trending in the city" hashtags; "Live in the city" Twitch streams |
| Live badges | None | Characters mapped to streamers show a LIVE badge and link to the stream |
| Share previews | Blank (client-rendered SPA) | Server-rendered OG/Twitter tags per post and profile, photo or generated card |
| SEO | Title only | Metadata, canonicals, sitemap of hot posts/profiles, robots, manifest |
| Caching | Browser only | Next data cache + Vercel CDN (`s-maxage`) in front of the upstream |

## Multistream (`/watch`)

Watch up to 12 Twitch or Kick POVs at once.

- **Grid or stage** layouts; any tile can be promoted to the main stage.
- **One audio source** at a time (click the speaker on a tile). Twitch players switch audio through the Twitch Embed API without reloading; Kick's player has no API, so switching to a Kick POV reloads it.
- **Chat panel** for any POV (Twitch embed chat, or Kick popout chat with a new-window fallback).
- **Shareable**: the setup lives in the URL, e.g. `/watch?s=buddha,youngmulti,k:somechannel&layout=stage&main=t:buddha`. Bare names are Twitch; `k:` marks Kick. Pasted twitch.tv / kick.com links also work.
- Add POVs from the live NoPixel list or by name. LIVE badges, the live rail, and profile banners open the stream here.
- Players are positioned absolutely and never re-ordered in the DOM, so changing layouts never reloads a stream.

## City map (`/map`)

A map of Los Santos and Blaine County with events pinned where they happened.

- **Base map**: our own schematic (coastline, Alamo Sea, city area, region and district labels) drawn as vectors in GTA V world coordinates from `src/data/map-base.ts`. No third-party map imagery is bundled. To use a detailed map image you have rights to, set `NEXT_PUBLIC_MAP_IMAGE_URL` and `NEXT_PUBLIC_MAP_IMAGE_BOUNDS` (`minX,minY,maxX,maxY` in world coordinates of the image edges).
- **Detailed tiles (optional)**: the map can show a raster tile pyramid under the pins. Build one with `node scripts/build-map-tiles.mjs --tiles <dir of x_y.webp> --zoom 8` (or `--image atlas.png --zoom 8 --offset x,y` for one large image), which writes `public/map-tiles/{z}/{x}/{y}.webp` for every zoom down to 0. Then set `NEXT_PUBLIC_MAP_TILES_URL=/map-tiles/{z}/{x}/{y}.webp`, `NEXT_PUBLIC_MAP_TILES_ZOOM=8`, and `NEXT_PUBLIC_MAP_TRANSFORM=a,b,c,d`, where world `(X, Y)` lands on native-zoom pixel `(a*X + b, c*Y + d)`. The schematic stays underneath to fill any gaps. `public/map-tiles/` is git-ignored on purpose: only commit tiles you have the right to publish.
- **Places**: `src/data/places.ts` is a hand-curated list of landmarks and districts with approximate world coordinates. It powers place search and geocoding. Names that are also everyday words or surnames (Davis, Harmony, Strawberry) are marked `ambiguous` and only match in a story's dateline.
- **Events**: `/api/map` returns a `MapFeed` from a pluggable `MapSource` (`src/lib/map/sources.ts`, selected with `MAP_SOURCE`). The default `news` source pins city news by the landmark in its headline, its dateline ("SANDY SHORES —"), or places named in the body. Landmark matches pin precisely; district matches draw a dashed "general area" circle. Stories with no recognizable place are listed under "No location found".
- **Swapping in real data**: an adapter that returns `MapFeed` (events with `x`, `y`, `kind`, `people`, etc.) can replace the news source, e.g. the official Companion map events if access is granted. The UI already handles kinds such as `crime`, `warrant` and `government`.
- **Sharing**: `/map?focus=<eventId>` and `/map?place=<placeKey>` open the map on that event or place. "Read in News" links jump to the story on `/news`.

## Architecture

```
Browser ──► Next.js on Vercel ──► SocialSource adapter ──► upstream API
             ├─ /api/*  (CDN-cached JSON)                   (reader today)
             ├─ SSR metadata + OG images
             └─ Supabase (optional: auth + sync)  ·  Twitch Helix (optional: live)
```

All upstream access goes through `src/lib/source/`. The `SocialSource` interface is the only thing the app depends on, so a direct Companion ingest (e.g. a cron that writes to Supabase) can replace the community reader by adding an adapter and setting `SOCIAL_SOURCE`.

### API routes

| Route | Purpose |
|---|---|
| `GET /api/feed?sort=chronological\|hottest&timeframe=24h\|7d\|all&cursor=` | City feed |
| `POST /api/feed` `{type:"following", userIds, sort, cursor}` | Following feed |
| `POST /api/feed` `{type:"bookmarks", postIds, cursor}` | Bookmarked posts |
| `GET /api/users/:username` | Profile |
| `GET /api/user-feed?userId=&filter=posts\|replies\|media&cursor=` | Profile timeline |
| `GET /api/posts/:id` · `/api/posts/:id/replies` | Thread and replies |
| `GET /api/search?q=&type=posts\|users&cursor=` | Search |
| `GET /api/news?cursor=` | City news |
| `GET /api/trending` | Top hashtags from recent posts |
| `GET /api/live` | Live NoPixel streams + character links |
| `GET /api/og/post/:id` · `/api/og/user/:username` | Share images |

## Upstream rate limits

The reader API allows roughly **3 requests/second and 20 per 10 seconds per IP**, and every visitor's request leaves from the same Vercel servers. The app stays inside that budget by:

- caching every read in Next's data cache and Vercel's CDN (`s-maxage`), so the shared city feed costs one upstream call per few seconds no matter how many people are watching;
- collapsing identical in-flight requests and capping concurrency per instance;
- backing off and retrying on `429` using the `x-ratelimit-reset-*` headers;
- polling per-user feeds (Following) every 60s instead of 20s.

If traffic grows, the next step is an **ingest adapter**: a scheduled job polls the city feed once every ~15s into Supabase, and the app reads from the database. Upstream load then stays flat regardless of visitors, and you gain history and full-text search.

## Setup

```bash
npm install
cp .env.example .env.local   # everything optional; works with no keys
npm run dev
```

### Optional: live badges (Twitch)

1. Create an app at <https://dev.twitch.tv/console/apps> (any OAuth redirect, e.g. `http://localhost`).
2. Set `TWITCH_CLIENT_ID` and `TWITCH_CLIENT_SECRET`.
3. "Live in the city" lists GTA V streams whose title matches `TWITCH_TITLE_FILTER`.
4. To badge characters, map Twatter handles to Twitch logins in `src/data/streamers.json`:
   ```json
   { "links": [{ "username": "SomeCharacterHandle", "twitch": "streamerlogin" }] }
   ```
   or insert rows into the Supabase `streamer_links` table (no redeploy needed).

### Optional: accounts and sync (Supabase)

1. Create a Supabase project and run `supabase/migrations/0001_init.sql` in the SQL editor.
2. **Authentication > Providers > Twitch**: enable it with your Twitch app's client ID/secret, and add Supabase's callback URL to the Twitch app's OAuth redirects.
3. **Authentication > URL Configuration**: add `https://<your-domain>/auth/callback` (and `http://localhost:3000/auth/callback`) to redirect URLs.
4. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

Signed-out users keep everything in `localStorage`. On first sign-in, local follows/bookmarks merge into the account.

## Deploy on Vercel

Import the repo in Vercel (framework auto-detects as Next.js), add any env vars above, deploy. No other config needed.

## Stack

Next.js 16 (App Router, Turbopack) · React 19 · TanStack Query · Tailwind CSS 4 · Supabase · Twitch Helix · `next/og`
