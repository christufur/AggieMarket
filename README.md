# AggieMarket

A campus marketplace for NMSU students to buy, sell, trade items, offer services, and post events. Web + native (iOS/Android) via Expo Router; backend in Bun + Elysia + SQLite. Live deployment runs on AWS EC2 with PM2.
![alt text](https://github.com/christufur/AggieMarket/edit/main/am.gif "AM video")


## Features

- **Listings** — post items for sale with up to 8 photos, categories, price, condition; mark sold and complete a transaction.
- **Services** — offer paid or free services (e.g. tutoring, rides) with hourly / fixed / negotiable pricing.
- **Events** — post events with capacity, RSVP, date/time, location, free/paid.
- **Messaging** — 1:1 conversations with real-time WebSocket delivery, typing indicators, unread counts, mobile push via Expo APNs.
- **Reviews & Ratings** — 1–5 star reviews after a completed transaction; per-user average rating cached via DB trigger.
- **Saved items** — bookmark listings, services, or events from anywhere.
- **Reports & Moderation** — users can report content; admins see a moderation queue.
- **Auth** — NMSU-only email signup (`@nmsu.edu`), email verification via Resend, JWT-based session, forgot-password flow.
- **Image uploads** — S3 storage with absolute URL pass-through; local fallback in dev.

## Prerequisites

- [Bun](https://bun.sh/) v1.1+
- Node.js v18+ (for Expo CLI tooling)
- A `.env` file in both `server/` and `AggieMarket/` (see [Environment Variables](#environment-variables))

## Quick Start (Development)

### 1. Backend

```bash
cd server
bun install
bun dev          # starts on http://localhost:3000 with hot reload
```

First run creates `server/db.sqlite` automatically. To seed with sample users and data:

```bash
bun scripts/seed.ts
```

### 2. Frontend (web)

```bash
cd AggieMarket
bun install
bun run web      # opens http://localhost:8081
```

### 3. Frontend (native, iOS/Android)

```bash
cd AggieMarket
bun start        # then press `i` (iOS sim) or `a` (Android emulator), or scan QR with Expo Go
```

## Environment Variables

Both `.env` files are git-ignored. Create them locally before first run.

### `server/.env`

| Variable            | Required | Purpose                                                        |
| ------------------- | -------- | -------------------------------------------------------------- |
| `JWT_SECRET`        | yes      | Symmetric key for signing/verifying JWT auth tokens.           |
| `DB_PATH`           | no       | SQLite file path. Defaults to `./db.sqlite`.                   |
| `PORT`              | no       | HTTP port. Defaults to `3000`.                                 |
| `RESEND_API_KEY`    | yes\*    | Resend API key for verification + password-reset emails.       |
| `RESEND_FROM_EMAIL` | yes\*    | Sender address (e.g. `noreply@yourdomain.com`).                |
| `AWS_REGION`        | yes\*    | Region for S3 uploads (e.g. `us-east-1`).                      |

\* Email + S3 features degrade silently if missing; auth still works without them in development.

### `AggieMarket/.env`

| Variable                       | Purpose                                                                       |
| ------------------------------ | ----------------------------------------------------------------------------- |
| `EXPO_PUBLIC_API_URL`          | Default API base URL (e.g. `http://localhost:3000` in dev).                   |
| `EXPO_PUBLIC_API_URL_WEB`      | Override for web platform.                                                    |
| `EXPO_PUBLIC_API_URL_ANDROID`  | Override for Android (typically `http://10.0.2.2:3000` for emulator).         |

## Database

- SQLite via Bun's built-in driver. Schema and triggers live in `server/src/db/`.
- Tables: users, listings, services, events, conversations, messages, transactions, ratings, saved_items, reports, plus an FTS5 virtual table for search.
- Triggers maintain denormalized fields (e.g. user `rating_avg` recomputed on rating insert).
- Test runs use an in-memory DB so they never touch `db.sqlite`.

### Seeding

```bash
cd server
bun scripts/seed.ts
```

Creates a realistic test dataset. Sample user password: `SeedPass123!`.

### Reset

Delete the DB files and restart the server:

```bash
rm server/db.sqlite server/db.sqlite-shm server/db.sqlite-wal
bun dev
```

## Production Deployment (AWS EC2)

The production server runs on an Ubuntu EC2 instance managed by PM2.

### One-time setup on a fresh server

```bash
# Install Bun
curl -fsSL https://bun.sh/install | bash

# Install PM2 (via npm)
npm install -g pm2

# Clone repo
git clone https://github.com/christufur/AggieMarket.git /home/ubuntu/AggieMarket
cd /home/ubuntu/AggieMarket/server
bun install

# Create production .env (see Environment Variables above)
nano .env
```

### Start / restart the service

```bash
cd /home/ubuntu/AggieMarket/server
pm2 start ecosystem.config.cjs        # first time
pm2 restart aggiemarket               # after code changes
pm2 save                              # persist across reboot
pm2 startup                           # generate systemd unit (one-time)
```

`ecosystem.config.cjs` runs `./start.sh`, which `cd`s into the server directory and execs `bun index.ts` with `NODE_ENV=production`.

### Deploying a new version

```bash
ssh ubuntu@<EC2-PUBLIC-IP>
cd /home/ubuntu/AggieMarket
git pull origin main
cd server && bun install              # only if dependencies changed
pm2 restart aggiemarket
```

### Frontend (web) deploy

The Expo web build can be deployed to any static host:

```bash
cd AggieMarket
bun install
bunx expo export --platform web       # output in dist/
```

Upload `dist/` to S3+CloudFront, Vercel, or any static host. Set `EXPO_PUBLIC_API_URL_WEB` to your production API URL before exporting.

## Maintenance

### Logs

```bash
pm2 logs aggiemarket                  # live tail
pm2 logs aggiemarket --lines 200      # recent
pm2 logs aggiemarket --err            # errors only
```

PM2 log files live at `~/.pm2/logs/aggiemarket-{out,error}.log`.

### Restart / stop

```bash
pm2 restart aggiemarket
pm2 stop aggiemarket
pm2 status
```

### Database backup

The SQLite DB is a single file. Back up while the server is running using SQLite's online backup (safe under WAL mode):

```bash
sqlite3 /home/ubuntu/AggieMarket/server/db.sqlite ".backup /home/ubuntu/backups/db-$(date +%F).sqlite"
```

Restore by replacing `db.sqlite` (stop PM2 first).

### Uploaded media

Local uploads land in `server/uploads/`. In production, configure AWS S3 via `AWS_REGION` and credentials so the server returns S3 URLs instead.

## Testing

The backend has a `bun:test` suite covering all REST routes.

```bash
cd server
bun test                              # run all tests (in-memory DB)
bun test src/__tests__/auth.test.ts   # one file
```

Tests are isolated: each spins up its own Elysia app and seeds its own users. No external services required.

## Modifying the Project

A few common changes and where to make them:

| What you want to change           | Where                                                                             |
| --------------------------------- | --------------------------------------------------------------------------------- |
| Add a new screen                  | New `.tsx` file under `AggieMarket/app/` (filename = route).                       |
| Add a new API endpoint            | New handler in the relevant file under `server/src/routes/`. Register in `index.ts` if a new route module. |
| Change brand colors               | `AggieMarket/theme/colors.ts`.                                                    |
| Edit shared UI primitives         | `AggieMarket/components/ui/` (Button, Card, Dialog, Text, etc.).                  |
| Change API base URL               | `AggieMarket/.env` (`EXPO_PUBLIC_API_URL*`) or `AggieMarket/constants/api.ts`.    |
| Add a DB column / table           | Edit schema in `server/src/db/`, then delete `db.sqlite*` for dev or write a migration for prod. |
| Restrict signup domain            | `server/src/routes/auth.ts` — the email-suffix check.                             |
| Adjust JWT expiration             | `server/src/routes/auth.ts` — the `jwt.sign` call.                                |

## Project Structure

```
AggieMarket/
├── AggieMarket/                 # Expo app (web + iOS + Android)
│   ├── app/                     # File-based routes (Expo Router)
│   │   ├── listing/[id].tsx     # Listing detail
│   │   ├── service/[id].tsx     # Service detail
│   │   ├── event/[id].tsx       # Event detail
│   │   ├── user/[id]/           # Public profile + filtered item lists
│   │   ├── home.tsx             # Feed / create-post entry
│   │   ├── browse.tsx           # Search + category browse
│   │   ├── inbox.tsx            # Conversations
│   │   ├── profile.tsx          # Own profile
│   │   ├── saved.tsx, admin.tsx, login.tsx, register.tsx, forgot-password.tsx, verify-email.tsx
│   ├── components/              # Shared components
│   │   └── ui/                  # Design-system primitives (Button, Card, Dialog, …)
│   ├── context/                 # AuthContext, WebSocketContext
│   ├── constants/api.ts         # API endpoint URL builders
│   ├── theme/colors.ts          # Color tokens
│   └── lib/                     # Utilities (date formatters, cn helper)
│
├── server/                      # Bun + Elysia API
│   ├── index.ts                 # Entry point — registers all routes
│   ├── ecosystem.config.cjs     # PM2 process config
│   ├── start.sh                 # Production launcher
│   ├── scripts/seed.ts          # DB seed script
│   └── src/
│       ├── routes/              # auth, users, listings, services, events,
│       │                        # conversations, ratings, reports, saved, uploads
│       ├── db/                  # SQLite setup, schema, triggers, FTS5
│       ├── middleware/          # JWT auth, requireAdmin
│       └── utils/               # Email (Resend), S3, helpers
│
└── README.md
```

## Tech Stack

- **Frontend:** Expo Router, React 19, TypeScript, NativeWind / Tailwind, expo-image-picker.
- **Backend:** Bun runtime, Elysia framework, `@elysiajs/jwt`, `@elysiajs/cors`, Bun's built-in SQLite, Resend (email), AWS S3 (uploads).
- **Auth:** Custom JWT, NMSU email restriction enforced server-side, email verification + forgot-password via Resend.
- **Realtime:** WebSocket for chat delivery, typing indicators, unread counts.
- **Deploy:** AWS EC2 (Ubuntu) + PM2; web build can be exported to any static host.

## Team

- **Genesis Valenzo** — Frontend / UI / Project Management
- **Christopher Meraz** — Full-stack / API / WebSocket messaging / AWS deployment
- **Demetrius Billey** — Backend / DB
