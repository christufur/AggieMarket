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
| TASK-1 Home screen real data       | ✅ Backend endpoints done        | Frontend wiring | —                |
| TASK-2 FTS5 search                 | —                                | Frontend wiring | ✅ Backend done  |
| TASK-3 Client WebSocket            | —                                | All             | —                |
| TASK-4 TestFlight build            | 🔄 In progress (enrollment)      | —               | —                |
| TASK-5 APNs push                   | ✅ Backend done / frontend next  | —               | —                |
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

- [x] Home screen renders zero hardcoded data. *(already true — home.tsx fetches live)*
- [ ] All three strips render from the API in dev and production.
- [ ] Killing the backend shows the error state, not a crash.
- [ ] Tapping a card still navigates to detail (regression check).

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

**Acceptance:**

- [ ] Typing "calc" returns listings with "calculus" in the title or description.
- [ ] Category chips filter live.
- [ ] Empty query with a category still returns results.
- [ ] Zero-results empty state.

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

**Acceptance:**

- [ ] Two browser tabs as different users can message each other with < 1s latency.
- [ ] Dropping and restoring wifi auto-reconnects.
- [ ] Unread badges update live in the inbox.

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
- [ ] "Report message" long-press in chat thread — still pending.

**Christopher — frontend:** ✅ done Apr 28

- ✅ `app/admin.tsx`: admin-only screen (`/admin` route), 404-redirects non-admins, pending/resolved/dismissed tabs, each row shows target preview + resolve/dismiss dialogs with optional admin note, load-more pagination, empty states.
- ✅ NMSU design tokens used throughout.

**Acceptance:**

- [x] Non-admin users get 404 on `/admin/*` (backend) and access-denied on frontend.
- [x] Admin dashboard lists pending reports with target preview.
- [x] Resolving a listing report soft-deletes it and removes from public views.
- [x] Dismissing marks dismissed without touching the target.
- [ ] Demo end-to-end using seeded admin account — pending production deploy.
- [ ] "Report message" in chat thread — still pending.

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