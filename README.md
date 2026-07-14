# 🎬 Scope Ticket Monitor

A full-stack web app that watches [Scope Cinemas](https://www.scopecinemas.com) for movie ticket availability and notifies you the moment tickets go on sale — no more manually refreshing the site.

## How it works

A scheduled scraper checks Scope Cinemas' listings for movies that aren't on sale yet. Add a movie to your watchlist, and as soon as it flips to "Buy Tickets," you'll get a Telegram message.

## Features

- 🔍 **Automated scraping** — Playwright/Chromium checks Scope Cinemas' "Now Showing" and "Coming Soon" pages on a schedule, with Cloudflare bot-management mitigations and scroll-until-stable logic to catch everything below the fold
- 🔔 **Watchlist + notifications** — add any not-yet-available movie to your watchlist and get a Telegram message the moment it goes on sale
- ✉️ **Passwordless login** — sign in with a magic link sent to your email, no password required
- 🤖 **Telegram bot** — `/help`, `/status`, and `/stop` commands to manage your notifications right from the chat
- 🔁 **Live dashboard** — auto-refreshes on a 60s poll plus instantly on tab focus, so you're never looking at stale data
- 🧹 **Self-cleaning watchlist** — items for movies that drop off Scope's listings are pruned automatically

## Tech stack

| Layer | Tech |
|---|---|
| Frontend | React (Vite), Tailwind CSS, axios, lucide-react |
| Backend | Node.js, Express |
| Database | PostgreSQL via Prisma ORM |
| Scraping | Playwright (Chromium) |
| Notifications | Telegram Bot API |
| Email | Gmail API (magic-link auth) |
| Deployment | Railway (Docker) |

## Project structure

```
.
├── backend/                 # Express API + scraper + scheduler
│   ├── src/
│   │   ├── routes/          # auth, movies, telegram, watchlist
│   │   ├── services/        # business logic (auth, email, movies, notifications, telegram, cleanup, scheduler)
│   │   ├── scraper/         # Playwright listing scraper
│   │   ├── middleware/      # auth guards
│   │   ├── lib/              # shared Prisma client
│   │   └── utils/           # logger, rate limiting
│   ├── prisma/               # schema + migrations
│   └── scripts/              # one-off setup scripts (Gmail refresh token)
├── frontend/                 # Vite + React dashboard
│   └── src/
│       ├── pages/            # Dashboard
│       ├── components/       # MovieCard, NotifyButton, LoginModal, TelegramConnect, ...
│       ├── hooks/             # useMovies, useAuth, useWatchlist
│       └── api/               # axios client
└── docker-compose.yml         # local multi-container setup (optional)
```

## Prerequisites

- Node.js 20+
- A PostgreSQL database (e.g. a free [Railway](https://railway.app) instance)
- A Google Cloud Console project with the Gmail API enabled (for magic-link emails)
- A Telegram bot token from [@BotFather](https://t.me/BotFather)

## Getting started

### 1. Clone and install

```bash
git clone <your-repo-url>
cd scope-ticket-monitor
cd backend && npm install
cd ../frontend && npm install
```

### 2. Configure environment variables

Create `backend/.env` (see [Environment variables](#environment-variables) below for the full list).

### 3. Generate a Gmail refresh token (one-time)

Magic-link emails are sent via the Gmail API. With `GMAIL_CLIENT_ID` and `GMAIL_CLIENT_SECRET` set in `backend/.env`:

```bash
cd backend
npm run get-gmail-token
```

Follow the printed URL, sign in with the Gmail account you want to send from, and copy the resulting `GMAIL_REFRESH_TOKEN` into `backend/.env`.

### 4. Run database migrations

```bash
cd backend
npx prisma migrate dev
```

### 5. Start the app

Run each side in its own terminal:

```bash
# Terminal 1 — backend (http://localhost:3001)
cd backend
npm run dev

# Terminal 2 — frontend (http://localhost:5173)
cd frontend
npm run dev
```

The Vite dev server proxies `/api` requests to `http://localhost:3001`, so no CORS config is needed locally.

### 6. (Optional) Run with Docker Compose

A `docker-compose.yml` is included for a containerized setup instead of running each side separately:

```bash
cp .env.example .env   # fill in real values
docker-compose up --build
```

This builds the backend (with Playwright/Chromium baked in) and the frontend (served via nginx), publishing the backend on `:3001` and the frontend on `:80`.

## Environment variables

Set these in `backend/.env` for local dev, or as environment variables in your deployment platform (e.g. Railway):

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `SCOPE_BASE_URL` | Base URL for Scope Cinemas (e.g. `https://www.scopecinemas.com/movies`) |
| `SCRAPE_INTERVAL_MINUTES` | How often the scraper runs (default: `10`) |
| `PORT` | Backend port (default: `3001`) |
| `JWT_SECRET` | Secret for signing session tokens — generate with `openssl rand -hex 32` |
| `BACKEND_URL` | Publicly reachable backend URL (used in magic-link email URLs) |
| `FRONTEND_URL` | Publicly reachable frontend URL (used for post-login redirects) |
| `GMAIL_CLIENT_ID` | Google Cloud Console OAuth client ID |
| `GMAIL_CLIENT_SECRET` | Google Cloud Console OAuth client secret |
| `GMAIL_REFRESH_TOKEN` | Generated via `npm run get-gmail-token` |
| `GMAIL_SENDER_EMAIL` | The Gmail address magic-link emails are sent from |
| `TELEGRAM_BOT_TOKEN` | Bot token from BotFather |
| `TELEGRAM_BOT_USERNAME` | Your bot's username, without the `@` |
| `TELEGRAM_WEBHOOK_SECRET` | Optional shared secret to verify incoming webhook calls are really from Telegram |
| `CLEANUP_STALE_DAYS` | Days a movie can be missing from scrapes before its watchlist items are pruned (default: `3`) |
| `CLEANUP_CRON_EXPRESSION` | Cron expression for the daily cleanup job (default: `0 3 * * *`) |

The frontend only needs one build-time variable (see `frontend/vite.config.js` for the local dev proxy, which makes this unnecessary for `npm run dev`):

| Variable | Description |
|---|---|
| `VITE_API_BASE_URL` | Full URL of the backend API (e.g. `http://localhost:3001/api` or your deployed backend URL) |

See `.env.example` for a template covering the Docker Compose setup.

## Live demo

🔗 **[https://scope-ticket-monitor.vercel.app](https://scope-ticket-monitor.vercel.app)**

## Deployment

Backend runs on [Railway](https://railway.app) (deployed from `backend/Dockerfile`, runs Prisma migrations on boot). Frontend runs on [Vercel](https://vercel.com) (Root Directory set to `frontend`).

Note: `VITE_API_BASE_URL` must be set in Vercel's project environment variables *before* each build — Vite only reads `VITE_*` vars at build time, not runtime.

## How notifications work

1. The scraper runs on a schedule and diffs each movie's availability against what's stored in the database.
2. When a movie flips from unavailable → available, everyone watching it (who hasn't already been notified) gets a Telegram message.
3. If you link Telegram *after* a movie you're watching has already gone on sale, you'll get a one-time backlog notification catching you up.
4. Notified items stay on your watchlist, marked as notified, until you remove them yourself.
5. Movies that disappear from Scope's listings (their run ended) have their watchlist entries cleaned up automatically by a daily job.

## Roadmap

- [ ] WhatsApp Business API as a second notification channel (the notification service is already built to be pluggable — see `notificationService.js`)

## License

Licensed under the [MIT License](LICENSE).