# AggieMarket — Final Sprint Roadmap (Apr 20 → May 14, 2026)

## Context for Claude Code

- **Frontend:** Expo / React Native with web support via `react-native-web`. Lives in `AggieMarket/`. API base URL logic is in `AggieMarket/constants/api.ts` and uses a `Platform.OS === "web"` check to route to `https://aggiemarket.xyz` in production vs `localhost:3000` in dev. Do not remove that check.
- **Backend:** Bun / Elysia in `server/`. JWT via `@elysiajs/jwt`, bcrypt via `Bun.password.hash`, Resend for transactional email, SQLite (do not migrate to Postgres in this sprint). Routes live under `server/src/routes/` — `auth.ts`, `listings.ts`, and messaging/profile routes from Sprint 3 already exist.
- **Deployment:** AWS EC2 + Nginx + PM2/systemd, Cloudflare in front (SSL mode Flexible — do not change). S3 for images. Deploy script pattern is: `git pull` → `npx expo export --platform web` → permission fixes → `pm2 restart`.
- **Tables:** `listings`, `services`, and `events` are **separate tables**, not one unified table with a category column. Do not merge them.

## Team and lanes

- **Christopher** — full-stack, DevOps, ops owner. Runs all deploys. Primary on anything that touches infrastructure (TestFlight, APNs, seeds) and picks up frontend on web redesign work since he did the NMSU tokens pass last sprint.
- **Genesis** — frontend owner. Anything that lives in `AggieMarket/app/` or `AggieMarket/components/` and isn't an admin dashboard is hers.
- **Demetrius** — backend / DB owner. Anything that adds tables, migrations, or new routes in `server/` is his, except for APNs (Christopher owns that because it's tangled with deploy).

## Success criteria for May 14

A fresh user installs AggieMarket from TestFlight, registers with `@nmsu.edu`, browses real seeded listings, searches with FTS5, messages a seller, gets an APNs push, marks a listing as sold, leaves a rating, and — if logged in as an admin — can see and resolve a reported listing. All on a real iPhone.

## Owner summary

| Task                               | Christopher                      | Genesis         | Demetrius        |
| ---------------------------------- | -------------------------------- | --------------- | ---------------- |
| TASK-1 Home screen real data       | ✅ Backend endpoints done        | ✅ Frontend done | —               |
| TASK-2 FTS5 search                 | —                                | ✅ Frontend done | ✅ Backend done  |
| TASK-3 Client WebSocket            | —                                | ✅ Done         | —                |
| TASK-4 TestFlight build            | 🔄 Config done — run eas build   | —               | —                |
| TASK-5 APNs push                   | ✅ Backend + frontend done       | —               | —                |
| TASK-6 Seed data                   | ✅ Script ready (run on prod)    | —               | —                |
| TASK-7 Reviews and Ratings         | —                                | ✅ Frontend done | ✅ Backend done  |
| TASK-8 Mark as Sold + profile tabs | —                                | ✅ Frontend done | ✅ Backend done  |
| TASK-9 Admin and moderation        | ✅ Admin dashboard done          | ✅ Report button done | ✅ Backend done |
| TASK-10 Bug sweep                  | Coordinator                      | Frontend pass   | Backend pass     |

---

## TASK-1 — Kill mock data on home screen ✅ (Christopher backend done)

**Owners:** Christopher (backend) ✅ + Genesis (frontend)

**Goal:** Replace the hardcoded `popularListings`, `popularServices`, and `events` arrays in `AggieMarket/app/home.tsx` with real API data.

**Christopher — backend:** ✅ done Apr 21

- ✅ `GET /listings/popular?limit=N` — recent active listings, `created_at DESC`, no auth.
- ✅ `GET /services/popular?limit=N` — recent active services, no auth.
- ✅ `GET /events/popular?limit=N` — upcoming events, `starts_at ASC`, no auth.
- ✅ `API.listingsPopular()`, `API.servicesPopular()`, `API.eventsPopular()` added to `constants/api.ts`.
- Note: `home.tsx` already fetches from `GET /listings|/services|/events` directly — the home screen was already wired to real data from Sprint 3. The `/popular` routes are a clean alias (default limit=10) Genesis can use if she wants a dedicated "featured" strip.

**Genesis — frontend:**

- Add the three endpoints to `AggieMarket/constants/api.ts`. ✅ (already added by Christopher)
- In `app/home.tsx`, swap the three `const` arrays for `useEffect` + `fetch` calls.
- Three states per strip: loading, empty ("No listings yet — be the first!"), error (retry button).

**Acceptance:**

- [x] Home screen renders zero hardcoded data.
- [x] All three strips render from the API (skeleton cards while loading).
- [x] Killing the backend shows error state with retry button, not a crash.
- [x] Tapping a card navigates to detail.

---

## TASK-2 — Finish FTS5 search

**Owners:** Demetrius (backend) ✅ + Genesis (frontend)

**Goal:** The search screen and category chips filter real results. Demetrius already started the FTS5 scaffold — finish it.

**Demetrius — backend:** ✅ done Apr 28

- ✅ FTS5 virtual tables built against `listings`, `services`, `events` in `server/src/db/index.ts` with insert/update/delete triggers.
- ✅ `GET /search?q=&category=&min_price=&max_price=&limit=&offset=&condition=` — queries FTS5, joins to `listings`. Lives in `server/src/routes/listings.ts`.
- ✅ `API.search` added to `AggieMarket/constants/api.ts`.

**Genesis — frontend:**

- Find the search screen under `AggieMarket/app/` (Screen 2 in the wireframes).
- Wire the search input with a 300ms debounce.
- Wire the category chips to the `category` param.
- Render results using `CardV`.

**Genesis — frontend:** ✅ done Apr 28 (built into home.tsx)

- ✅ Search input in nav bar with 200ms debounce, hits `GET /search` FTS5 endpoint.
- ✅ Category sidebar chips filter live via `category=` param.
- ✅ Condition filter for listings via `condition=` param.
- ✅ Skeleton loading while search results fetch.
- ✅ Zero-results empty state with post prompt.

**Acceptance:**

- [x] Typing "calc" returns listings with "calculus" in title or description.
- [x] Category chips filter live.
- [x] Empty query with category still returns results.
- [x] Zero-results empty state.

---

## TASK-3 — Client-side WebSocket for live messaging

**Owner:** Genesis

**Goal:** Inbox already pulls conversations from the API (Sprint 3). The chat thread now needs WS send/receive in real time, not polling.

**Context:** The WS messaging backend was built Sprint 3. Look under `server/src/` for it (likely `routes/ws.ts` or similar). Verify the message format before writing the client.

**Work:**

- Create `AggieMarket/lib/ws.ts`. Opens a connection after login using the JWT, handles reconnection with exponential backoff, exposes `connect()`, `sendMessage(conversationId, text)`, `onMessage(cb)`.
- Chat thread screen: connect on mount, disconnect on unmount.
- Optimistic UI: messages appear immediately on send in a "sending" state, update on server ACK.
- Update inbox unread counts when a WS message arrives for a conversation not currently open.

**Status:** ✅ done Apr 28

- ✅ `WebSocketContext.tsx` — global WS client with auto-connect, exponential backoff (1s→30s), subscribe/send API.
- ✅ `ChatPanel` in `inbox.tsx` subscribes to `new_message` and `typing` WS events on mount, unsubscribes on unmount.
- ✅ Optimistic UI: message appears immediately at opacity 0.65 (`_status:'sending'`), replaced by real message on server ACK.
- ✅ Failed messages show "Failed" label + "Tap to retry" pressable that restores text to input.
- ✅ WS dedup guard prevents double-append when server also sends `new_message` event.
- ✅ Unread badges in nav update live on new messages.
- ✅ Conversation list refreshes on new WS message.

**Acceptance:**

- [x] Two browser tabs can message with <1s latency (WS push, not polling).
- [x] Dropping wifi auto-reconnects with exponential backoff.
- [x] Unread badges update live in inbox.

---

## TASK-4 — TestFlight build

**Owner:** Christopher

**Goal:** Signed iOS build to TestFlight so the team and Dr. Darian can install AggieMarket as a real app.

**Prereqs (not code — start immediately):**

- Apple Developer Program enrollment ($99, identity review can take 2–3 days).
- Create an App Store Connect entry for AggieMarket.

**Code / config:**

- Set `ios.bundleIdentifier` in `AggieMarket/app.json` to `edu.nmsu.aggiemarket`.
- Configure `eas.json`, run `eas build --platform ios --profile preview`.
- Verify `constants/api.ts` routes native to `https://aggiemarket.xyz`, not localhost.
- `eas submit --platform ios` to TestFlight.

**Acceptance:**

- [ ] Build installable on a real iPhone from TestFlight.
- [ ] Registration with `@nmsu.edu` works from the installed build.
- [ ] Home screen loads real production data.
- [ ] Team + Dr. Darian added as internal testers.

---

## TASK-5 — APNs push notifications ✅ (backend done)

**Owner:** Christopher (both backend and frontend — this one's tangled with deploy)

**Goal:** A new chat message triggers a push on the recipient's iPhone lock screen.

**Backend:** ✅ done Apr 21

- ✅ `push_tokens` table: `(id, user_id, token, platform, is_active, created_at)` — added to schema.
- ✅ `POST /users/me/push-token` — registers token for authed user, idempotent via `ON CONFLICT`.
- ✅ Push delivery hooked into `POST /conversations/:id/messages` — fires after message persists, fire-and-forget (never blocks message delivery).
- ✅ Uses **Expo Push API** (`https://exp.host/--/api/v2/push/send`) — correct choice since `expo-notifications` gives Expo push tokens, not raw APNs device tokens.
- ✅ `API.pushToken` added to `constants/api.ts`.

**Frontend:** (Christopher — pending TestFlight build)

- `expo-notifications` — install and wire up.
- On login, request permission, fetch the Expo push token, `POST` to `API.pushToken`.
- Tap-to-open: tapping a notification deep-links to the right chat thread via `conversation_id` in payload.

**Acceptance:**

- [ ] User A sends to User B with B's app closed → B's iPhone shows a push within a few seconds.
- [ ] Tapping the push opens AggieMarket directly into that conversation.
- [ ] Sender does not get a push of their own message.

---

## TASK-6 — Seed realistic data ✅

**Owner:** Christopher ✅ done Apr 21

**Goal:** Production DB feels populated on demo day.

**Work:** ✅

- ✅ `server/scripts/seed.ts` — run with `bun scripts/seed.ts` from `server/`.
    - 15 NMSU-flavored listings (Calc textbook, TI-84, MacBook, dorm fridge, mountain bike, desk, printer, etc.)
    - 8 services (tutoring, photography, logo design, moving help, bike repair, essay editing)
    - 5 events with future dates (Career Fair, Hackathon, Bonfire BBQ, Pre-Med Workshop, Trail Ride)
    - 6 seed users (active, verified) owning the above posts
    - ✅ Admin account: `aggiemarket.admin@nmsu.edu` / `SeedPass123!` — **change before demo day**
- ✅ Idempotent via `seed_meta` table — second run prints "already applied" and exits
- ✅ `is_admin` column migration added to `users` table

**To run against production:**
```
ssh ec2  →  cd /path/to/server  →  bun scripts/seed.ts
```

**Acceptance:**

- [x] First run populates the DB.
- [x] Second run is a no-op.
- [ ] Production home screen looks full. *(run after deploy)*
- [x] At least one admin user exists.

---

## TASK-7 — Reviews and Ratings

**Owners:** Demetrius (backend) ✅ + Genesis (frontend)

**Goal:** After a listing is marked sold, both buyer and seller can leave a 1–5 star rating with an optional text review. Ratings show on the user's profile and drive their star average.

**Demetrius — backend:** ✅ done Apr 28

- ✅ `ratings` table with unique constraint on `(transaction_id, reviewer_id)`.
- ✅ `POST /ratings` — auth-gated, validates caller was part of transaction, transaction is closed, not already rated.
- ✅ `GET /users/:id/ratings?limit=&offset=` — paginated, joins reviewer name.
- ✅ SQLite triggers (`ratings_ai`, `ratings_ad`, `ratings_au`) auto-update `users.rating_avg` and `users.rating_count`.

**Genesis — frontend:** ✅ done Apr 28

- ✅ `profile.tsx` fetches real ratings from `GET /users/:id/ratings`, renders reviewer name/stars/body/date.
- ✅ Star distribution bars compute live percentages from fetched ratings array.
- ✅ "Load more" button appears when 20+ ratings, paginates with offset.
- ✅ `RatingItem` type added to `types/index.ts`.
- Note: "Leave a review" prompt requires `transaction_id` exposure on listing objects — deferred, marked with TODO in code.

**Acceptance:**

- [ ] Buyer and seller can each leave exactly one rating per transaction. *(backend enforced; leave-review UI deferred)*
- [x] Rating average on the profile reflects new ratings within a page refresh.
- [x] Attempting to rate twice returns a clean error (409 from backend).
- [x] Profile Reviews section paginates past 20 reviews.

---

## TASK-8 — Mark as Sold + profile tabs

**Owners:** Demetrius (backend) ✅ + Genesis (frontend)

**Goal:** Sellers can mark their own listings as sold. Sold listings show up on their profile under a `Sold` tab (separate from `Active`), with a visible "Sold" badge. This is also what unlocks the rating flow in TASK-7.

**Demetrius — backend:** ✅ done Apr 28

- ✅ `transactions` table: `(id, listing_id UNIQUE, seller_id, buyer_id NULLABLE, sold_at)`.
- ✅ `POST /listings/:id/mark-sold` — auth-gated, owner-only, optional `buyer_id`, creates transaction row, flips listing to `sold`. Validates buyer exists and is not the seller.
- ✅ `GET /users/:id/listings?status=active|sold` — filters by status, defaults to showing both `active` and `sold`.

**Genesis — frontend:** ✅ done Apr 28

- ✅ `listing/[id].tsx`: "Mark as Sold" button (owner + active only), confirm dialog with optional buyer ID, SOLD badge on title.
- ✅ Listing cards in `profile.tsx` already showed SOLD badge on `status === 'sold'` — confirmed working.
- ✅ `profile.tsx`: Listings tab has Active/Sold sub-tabs fetching `?status=active` and `?status=sold` separately.

**Acceptance:**

- [x] Seller sees "Mark as sold" only on their own active listings.
- [x] Marking sold flips listing status in local state immediately.
- [x] Profile Sold tab shows sold items; Active tab excludes them.
- [ ] Marking sold triggers TASK-7 review prompt — deferred (needs transaction_id on listing objects).

---

## TASK-9 — Admin and moderation

**Owners:** Demetrius (backend) ✅ + Genesis (report button) + Christopher (admin dashboard frontend)

**Goal:** Any user can report a listing or a message. Admins (flagged by `users.is_admin`) see pending reports in a dashboard and can resolve or dismiss. Resolving removes the offending content.

**Demetrius — backend:** ✅ done Apr 28

- ✅ `reports` table with `target_type IN ('listing','message','user')`, `status IN ('pending','resolved','dismissed')`.
- ✅ `POST /reports` — auth-gated, validates target exists before inserting.
- ✅ `GET /admin/reports?status=&limit=&offset=` — admin-only (404 for non-admins), returns inlined target content (listing/message/user fields).
- ✅ `POST /admin/reports/:id/resolve` — soft-deletes listings, hides messages, records `reviewed_by` + `admin_note`.
- ✅ `POST /admin/reports/:id/dismiss` — marks dismissed with optional note.
- ✅ `requireAdmin` helper in `reports.ts` returns 404 (not 403) to avoid leaking route existence.

**Genesis — frontend:** ✅ done Apr 28

- ✅ `listing/[id].tsx`: "Report listing" inline flow for non-owners — reason picker (Spam / Inappropriate / Counterfeit / Other), `POST /reports`, inline "Report submitted" confirmation.
- ✅ `inbox.tsx`: "Report message" — hover reveals flag icon on non-mine bubbles, inline reason dropdown (Spam / Harassment / Inappropriate content / Other), POST /reports, shows "Reported" label on success.

**Christopher — frontend:** ✅ done Apr 28

- ✅ `app/admin.tsx`: admin-only screen (`/admin` route), 404-redirects non-admins, pending/resolved/dismissed tabs, each row shows target preview + resolve/dismiss dialogs with optional admin note, load-more pagination, empty states.
- ✅ NMSU design tokens used throughout.

**Acceptance:**

- [x] Non-admin users get 404 on `/admin/*` (backend) and access-denied on frontend.
- [x] Admin dashboard lists pending reports with target preview.
- [x] Resolving a listing report soft-deletes it and removes from public views.
- [x] Dismissing marks dismissed without touching the target.
- [ ] Demo end-to-end using seeded admin account — pending production deploy.

---

## TASK-10 — Bug sweep and polish

**Owners:** Christopher (coordinator) + Genesis (frontend pass) + Demetrius (backend pass)

**Goal:** Demo-ready. No crashes, no ugly empty states, no broken auth edges.

**Split by person:**

- **Genesis:** Walk every screen on web and iOS. Log bugs to a shared checklist. Empty states on every list (home strips, search, inbox, chat, profile active, profile sold, reviews, admin dashboard). Image load failures → placeholder, not broken icon. Navigation back button works from every screen.
- **Demetrius:** Every API endpoint returns a sensible error on bad input (no 500s from unvalidated params). Auth edge cases — expired JWT, missing token, non-NMSU email on register. Admin routes reject non-admins cleanly. Rating and mark-sold validations behave correctly against edge cases.
- **Christopher:** Coordinate the list, own the deploy flow through the sweep, verify everything works in production against the seeded DB, handle TestFlight build iteration.

**Acceptance:**

- [ ] Full user journey (register → verify → post listing with photos → browse → search → message → receive push → mark sold → rate → report abuse → admin resolves) runs cleanly on iOS TestFlight and web.
- [ ] No crashes in a 15-minute free exploration by someone outside the team.

---

## Suggested calendar

- **Apr 20–27 (Week 1):** TASK-1, TASK-2, TASK-3. Christopher starts Apple Developer enrollment day one so it's not a blocker in Week 2. Demetrius also starts TASK-7 and TASK-8 backend in parallel since he wraps FTS5 mid-week.
- **Apr 28 – May 4 (Week 2):** TASK-4, TASK-5, TASK-7, TASK-8. Genesis spends this week on ratings and mark-as-sold UI. Christopher on TestFlight + APNs. Demetrius finishes backend for 7/8 and starts TASK-9.
- **May 5–11 (Week 3):** TASK-6, TASK-9, TASK-10. Admin dashboard, seed, bug sweep. Christopher builds the admin UI while running final deploys.
- **May 12–14:** Demo prep only. Final journal, final peer review, poster/slides, two dress rehearsals. No production code changes in the last 48 hours unless actively broken.

## House rules for Claude Code

- Match the existing code style in `server/` and `AggieMarket/` — don't rewrite patterns that already work.
- No new major dependencies without flagging first. Small additions (APNs lib, expo-notifications) are fine; swapping the state manager or HTTP client is not.
- Every PR scoped to a single TASK-N. Do not bundle.
- Every deploy to production: `git pull` → `npx expo export --platform web` → permission fixes → `pm2 restart`.
- If a task description conflicts with what's actually in the codebase, trust the codebase and flag the conflict. The roadmap was written from memory of recent work, not a fresh inspection.

## Still out of scope

- SQLite → PostgreSQL migration
- Android build
- Unifying listings / services / events into one table
- Auto-expiring listings (30-day rule)
- Services and Events search (search is listings-only for now)

---

## Pickup Feature Plan

The "Confirm pickup" button has been removed from the inbox right rail for now. The
proper feature replaces a single button with a small state machine shared by buyer and
seller.

### Goals

1. Buyer and seller can agree on a pickup time and place inside the chat without
   leaving Aggie Market.
2. A listing can only be marked **sold** after both sides confirm pickup happened —
   not just a one-sided tap.
3. Reviews/ratings unlock only after a confirmed pickup so we don't get review spam
   on listings that never actually changed hands.

### Pickup states (per conversation, listing-only for v1)

```
none → proposed → scheduled → completed
                       ↓
                    cancelled
```

- `none` — default. Just a chat thread.
- `proposed` — one party submitted a `{location, time, notes}` offer. The other side
  sees an Accept / Decline / Counter card.
- `scheduled` — both sides accepted. A live "Pickup at {place} on {date}" card
  pins to the top of the chat.
- `completed` — after the scheduled time passes, both sides get a "Did the pickup
  happen?" prompt. Two YES taps move the listing to `sold` and unlock ratings.
- `cancelled` — either side bails. Returns to `none` so they can repropose.

### Backend (server/src/routes/pickups.ts — new file)

Migration: a `pickups` table.

```sql
CREATE TABLE pickups (
  id           TEXT PRIMARY KEY,
  listing_id   TEXT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  proposer_id  INTEGER NOT NULL,
  status       TEXT NOT NULL CHECK (status IN ('proposed','scheduled','completed','cancelled')),
  location     TEXT NOT NULL,
  scheduled_at TEXT NOT NULL,
  notes        TEXT,
  buyer_confirmed_at  TEXT,
  seller_confirmed_at TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX pickup_active_per_listing
  ON pickups(listing_id) WHERE status IN ('proposed','scheduled');
```

Endpoints (all auth-gated, both buyer and seller of the listing allowed):

- `POST   /pickups`                    — body `{listing_id, conversation_id, location, scheduled_at, notes?}` → creates `proposed`
- `GET    /pickups/by-conversation/:conversation_id` — returns the active pickup or null
- `PATCH  /pickups/:id/accept`          — counterpart accepts → `scheduled`
- `PATCH  /pickups/:id/counter`         — body `{location?, scheduled_at?, notes?}` → resets to `proposed` from the other side
- `PATCH  /pickups/:id/cancel`          — either party cancels → `cancelled`
- `PATCH  /pickups/:id/confirm`         — must be `scheduled` AND `now() >= scheduled_at`. Sets `buyer_confirmed_at` or `seller_confirmed_at` based on caller. When both timestamps are set: status → `completed` and the linked listing is auto-marked `sold` (reuses `markSold` SQL transaction).

WebSocket: when status changes, push `{type: "pickup_update", conversationId, pickup}` so both clients re-render the chat banner without polling.

### Frontend

1. **`components/PickupCard.tsx`** — single component rendered:
   - Inline in the chat stream when status = `proposed` (Accept / Counter / Decline buttons).
   - Pinned banner above the message list when status = `scheduled`.
   - Inline "How did it go?" card when status = `scheduled` AND `now >= scheduled_at`,
     with two states (waiting for you / waiting for them) until both sides confirm.
2. **Inbox right rail (`app/inbox.tsx`)** — replace today's static "Pickup plan" card
   with a button "Propose pickup" when status = `none`. On press, opens a small modal
   with location autocomplete (campus map points first), date/time picker, optional notes.
3. **Listing page (`app/listing/[id].tsx`)** — when an active pickup exists, show a
   "Pickup scheduled for {date}" banner instead of the "Make offer / Message seller"
   action bar (web) or the sticky bottom bar (native).
4. **Profile / ratings** — `POST /ratings` already requires a `transaction_id`. After
   the pickup transitions to `completed`, generate that transaction id and surface a
   "Leave a review" CTA in the chat for the next 14 days.

### Rollout

1. Ship migration + endpoints behind a feature flag (`PICKUPS_ENABLED`).
2. Ship `PickupCard` and the inbox propose button only for listings (not services /
   events) — keeps blast radius small.
3. Once a few real pickups complete cleanly in production, gate the new
   "Mark sold" path behind pickup completion and remove the legacy "Mark sold" button
   that fires without a confirmed pickup.

### Out of scope for v1

- Pickup for services and events (different shape — recurring services don't fit).
- Real maps / route directions.
- Reminders 1h before scheduled time (push notification — easy follow-up using the
  existing push token table).
- Disputes / "didn't happen" arbitration — for v1 either party cancelling is enough.
