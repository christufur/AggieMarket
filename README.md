# AggieMarket

A campus marketplace for NMSU students to buy, sell, and trade items, services, and events.

## Prerequisites

- [Bun](https://bun.sh/) (v1.1+)
- Node.js (v18+)

## Quick Start

### 1. Start the backend

```bash
cd server
bun install
bun dev
```

The API server runs at `http://localhost:3000`.

### 2. Start the web app

```bash
cd AggieMarket
bun install
bun run web
```

The web app opens at `http://localhost:8081`.

## Project Structure

```
AggieMarket/
├── AggieMarket/          # Web app (Expo Router + React + TypeScript)
│   ├── app/              # Pages / routes
│   ├── components/ui/    # Reusable UI components (shadcn-style)
│   ├── context/          # Auth context
│   ├── constants/        # API URL, categories
│   ├── theme/            # Color tokens
│   └── lib/              # Utilities (cn helper)
│
├── server/               # Backend (Bun + Elysia + SQLite)
│   ├── index.ts          # Entry point
│   └── src/
│       ├── routes/       # API routes (auth, listings, services, events, users, uploads)
│       ├── db/           # Database setup
│       ├── middleware/    # Auth middleware
│       └── utils/        # Helpers
```

## Tech Stack

- **Frontend:** Expo Router, React, TypeScript, Tailwind CSS
- **Backend:** Bun, Elysia, SQLite, JWT auth
- **Auth:** NMSU.edu email restriction, email verification via Resend

## Team

- **Genesis Valenzo** — Frontend / UI / Project Management
- **Christopher Meraz** — Full-stack / API / WebSocket messaging / AWS deployment
- **Demetrius Billey** — Backend / DB 
