# IQ Motors Website

Next.js (App Router) + Tailwind marketplace UI aligned with the Flutter app.

**Stack:** Next.js 16 · React 19 · Tailwind 4 · Redux Toolkit · Firebase JS SDK  
**Default:** http://localhost:3000

## Setup

```bash
cd website
cp .env.example .env.local
# NEXT_PUBLIC_API_BASE_URL + Firebase web config
npm install
npm run dev
```

Requires the Express API (default `http://localhost:4000`). See [backend README](../backend/README.md).

## Environment

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_API_BASE_URL` | Express origin (default `http://localhost:4000`) |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase web config |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Same project as the Flutter app |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | |
| `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` | Firebase Analytics measurement ID |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | GA4 gtag stream (`G-…`; same as measurement ID) |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Cloudflare Turnstile site key (never the secret). Empty = widget hidden, bot checks skipped until the API secret is also set. |

See [`.env.example`](.env.example). Use `.env.local` for local secrets (gitignored).

## API proxy

Browser calls go through a same-origin rewrite to avoid CORS:

```
/api/backend/:path*  →  NEXT_PUBLIC_API_BASE_URL/:path*
```

Configured in `next.config.ts`. Client helper: `src/lib/api.ts`. Auth: Firebase web SDK, then `Authorization: Bearer <idToken>` on API requests.

## Routes

### Public / user

| Path | Purpose |
|------|---------|
| `/` | Home / hero + latest listings |
| `/cars`, `/cars/[id]` | Browse & detail (bids, favorites) |
| `/compare` | Side-by-side comparison (`?ids=`) |
| `/sell` | Multi-step sell wizard |
| `/showrooms` | Dealer directory |
| `/auth` | Sign in / register |
| `/dashboard` | Account home, listings, favorites, messages, settings |

### Admin (super-admin)

| Path | Purpose |
|------|---------|
| `/admin` | Overview + pending queue |
| `/admin/approvals` | Approval queue (list / by city) |
| `/admin/listings` | All statuses (activate, expire, sold, delete) |
| `/admin/users`, `/admin/showrooms` | Users & dealers |
| `/admin/flagged` | Reported ads |
| `/admin/leads` | Help-widget lead requests |
| `/admin/messages` | Support tickets |
| `/admin/catalog` | Brands / models / trims |
| `/admin/analytics` | GA report + CSV |
| `/admin/activity` | Admin activity log |
| `/admin/settings` | Platform config |

## Layout

```
src/
  app/          App Router pages
  components/   Shared UI
  lib/          api, firebase, i18n, helpers
  store/        Redux
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm start` | Serve production build |
| `npm run lint` | ESLint |
