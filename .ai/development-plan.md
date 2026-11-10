# Development plan

Living plan for delivering Bestreads as described in `CLAUDE.md`.
Each phase lists its tasks and a "Done when" checklist. Mark tasks with `[x]` as they are completed and record each change in `.ai/change-log.md`.

Status legend: `[ ]` not started · `[~]` in progress · `[x]` done

Current phase: **Phase 8 — PWA and polish** (PWA built, waiting for a browser check; accessibility pass and final review next; Phase 7 built, waiting for a browser check; Phase 6 built and rules published, waiting for a browser check with two accounts and the admin account; Phases 2–5 are done and checked at 390px in the dark theme; the light theme check is pending)

---

## Phase 0 — Project process

- [x] `CLAUDE.md` with project scope, rules, stack, data model and design direction
- [x] Static UI mocks in `docs/mocks/`
- [x] `.ai/change-log.md` and `.ai/development-plan.md`

---

## Phase 1 — Base

Goal: an empty but deployable app with login, search, theming, i18n and the responsive shell.

### 1.1 Scaffolding and tooling
- [x] Vite + React + TypeScript (strict) project
- [x] ESLint, `typecheck` script (`tsc -b`, all tsconfigs use `noEmit`), Vitest + React Testing Library
- [x] `.gitignore` (including `.env*` except `.env.example`, `.idea/`, `dist/`) and `.gitattributes` (LF line endings)
- [x] `.env.example` with all `VITE_FIREBASE_*` keys
- [x] Folder structure: `src/app/` (root component, providers), `src/features/<feature>/`, `src/shared/` (i18n, UI), `src/test/` (helpers)

### 1.2 Design system
- [x] Tailwind with theme tokens as CSS variables (light "Classic Library" and dark gray/amber)
- [x] Merriweather (headings) and Lato (body) via `@fontsource`, latin subset only
- [x] Theme follows system setting, with manual override stored in localStorage (Firestore sync in 1.5)
- [x] Theme toggle UI (settings screen, 1.4)

### 1.3 i18n
- [x] `react-i18next` with `en` (default) and `pt-BR`; typed keys; initial language = saved choice, else English (browser language not used)
- [x] Language dropdown component (language icon + `EN` / `PT-BR`); placed in the top bar in 1.4

### 1.4 App shell and routing
- [x] `HashRouter` with lazy-loaded routes: Home, Search, Book, Shelves, Friends, My Year, Settings, not found (public profile route moved to Phase 6)
- [x] Mobile: top bar + bottom tab bar (Home, Shelves, Friends, My Year), safe areas
- [x] Desktop (`lg`+): top bar with large search + left side menu
- [x] `/` keyboard shortcut focuses search
- [x] Settings screen with theme selector (System / Light / Dark) and language
- [x] Skip-to-content link

### 1.5 Firebase and auth
- [x] Firebase project (Spark) with Google and email/password sign-in, Firestore and `.env.local`
- [x] Firebase app init from env vars; Auth and Firestore SDKs loaded on demand
- [x] Login with Google (popup, `signInWithRedirect` fallback when the popup is blocked) and email/password (sign up, sign in, password reset)
- [x] Auth guard for private routes; create `users/{uid}` on first login
- [x] Sync theme and language preferences between localStorage and `users/{uid}`
- [x] Initial `firestore.rules` covering `users/{uid}`
- [x] Publish `firestore.rules` to the Firebase project and check Google and email login end to end in the browser
- [x] Admin account (created in the Firebase console) marked by `admins/{uid}`

### 1.6 Book search
- [x] Google Books client (title, author, cover, description, pages, ISBN); optional `VITE_GOOGLE_BOOKS_API_KEY`
- [x] Open Library fallback: whole search when Google fails or finds nothing; missing covers by ISBN (description fallback moved to the book page, Phase 2). Replaced in Phase 2 by searching both APIs at once and ranking one merged list (see Open questions → search relevance)
- [x] Debounced search cached with TanStack Query (now 1 s, suggestions dropdown under the search bar from 4 characters)
- [x] Search results screen (mobile list, desktop grid)
- [x] Google Books API key `bestreads-books` (project `bestreads-17987`, restricted to the Books API and to `http://localhost:5180/*` and `https://lydiagarcia03.github.io/bestreads/*`) in `.env.local`; repository secret added in 1.7

### 1.7 Deploy
- [x] `vite.config.ts` with `base: '/bestreads/'` (build only)
- [x] `.github/workflows/deploy.yml` (lint, typecheck, test, build + GitHub Pages deploy, secrets as env: `VITE_FIREBASE_*` and `VITE_GOOGLE_BOOKS_API_KEY`)
- [x] Repository secrets and Pages source "GitHub Actions" set in the GitHub repository settings
- [x] First deploy after the end-of-phase commit and push; `https://lydiagarcia03.github.io/bestreads/` loads the login screen with the Firebase config

Done when:
- [x] `lint`, `typecheck` and `test` pass
- [x] App deployed on GitHub Pages; login and search work on 390px and 1280px, both themes, both languages

---

## Phase 2 — My shelf

Goal: the user can track books on shelves with status, rating, progress and dates.

Delivered in sub-steps, each one tested and checked in the browser before the next:

### 2.1 Catalog and library data
- [x] Move the external book API code (Google Books, Open Library) from `search` to a `catalog` feature; add single-book lookup by `bookId`, with the Open Library work description as fallback
- [x] Library domain: fixed statuses (Want to read, Reading, Read), `users/{uid}/books/{bookId}` document shape and validation
- [x] Library repository (Firestore) and hooks: get, add (no duplicates by `bookId`), update status, remove, list by status
- [x] `firestore.rules` for `users/{uid}/books`
- [x] Publish the updated `firestore.rules` in the Firebase console

### 2.2 Book page
- [x] Book page (mobile and desktop layouts from mocks): cover, title, authors, pages, year, description
- [x] Status button: add to library with a status, change status, remove from library
- [ ] Checked in the browser while signed in (390px and 1280px, both themes)

### 2.3 Rating
- [x] Rating component: tap star for whole value, −/+ stepper by 0.25, clipped partial star fill, clear; shown for books in the library
- [x] Rating public/private toggle; publish/unpublish slim copy to `public/{uid}/ratings/{bookId}` in the same batch as the private rating; removing a book deletes its copy
- [x] `firestore.rules` for public ratings (fields, rating validation, copy must match the private book after the batch)
- [x] Publish the updated `firestore.rules` in the Firebase console (removing a book also needs it, since it deletes the public copy)
- [~] Checked in the browser while signed in: desktop, dark theme done (rate, fine-tune, partial star); 390px and light theme pending

### 2.4 Progress and reads
- [x] Reading progress by pages or percentage ("Update progress"), shown while reading; "Mark as read" once finished
- [x] Reads: start/finish dates, re-reads supported; status changes open/close reads (reading → starts, read → finishes, back to reading another day → re-read with progress reset); past reads can be added and removed
- [~] Checked in the browser while signed in: desktop, dark theme done (add as reading, progress, dates, removal); 390px and light theme pending

### 2.5 Shelves
- [x] Custom shelves: create, rename, reorder, delete; assign books to many shelves (`users/{uid}/shelves`, rules); on the book page, shelf chips and an "Edit shelves" panel (checkboxes + new shelf)
- [x] Shelves screen with filter chips and counts (mobile list, desktop cover grid; rating or progress per book), shelf management beside it
- [x] Desktop side menu: "My shelves" list with counts and "+ New shelf" below the main tabs (lazy-loaded, desktop only)
- [x] Publish the updated `firestore.rules` (custom shelves) in the Firebase console
- [~] Checked in the browser while signed in: desktop, dark theme done (shelves screen, side menu with counts); 390px and light theme pending

### 2.6 Home
- [x] Home: "Currently reading" cards (progress, inline "Update progress", "Open book"; up to 3, then a link to the shelf) and "My shelves" (chips switching the shelf in place via `?shelf=`, latest 12 books, link to the whole shelf). "Tonight's book" strip waits for reading plans (Phase 5); the desktop side column (series, friends, year) waits for Phases 4, 6 and 7
- [x] "Popular books" (Open Library yearly trending): at the top while the library is empty, after the shelves otherwise
- [~] Checked in the browser while signed in: desktop, dark theme done; 390px and light theme pending

Done when:
- [x] Unit tests for rating math and progress calculation
- [~] All screens checked at 390px and 1280px, both themes: 1280px dark and 390px dark done (390px check found and fixed a visible scrollbar under the shelf chips); light theme pending

---

## Phase 3 — Private

Goal: private content and verified security rules.

- [x] Review: full-screen editor on mobile, inline editor on desktop; stored in `private/review` (up to 20,000 characters, owner only, only for books in the library; removing a book deletes it)
- [x] Publish the updated `firestore.rules` (private review and cover) in the Firebase console; removing a book needs it too, since it now deletes the private documents
- [x] Personal cover upload: browser resize (~400px, WebP/JPEG, ≤ ~150 KB), base64 in `private/cover`; a dialog takes a dropped, pasted or chosen image, previews it and saves it; the cover can be removed
- [x] Cover display priority: personal cover > API cover > placeholder (book page, shelves, Home cards; loaded only for books flagged `hasPersonalCover`)
- [x] Publish the updated `firestore.rules` (optional `hasPersonalCover` on books)
- [x] Firestore rules tests with the emulator: `firebase-tools` + `@firebase/rules-unit-testing` (dev only), `npm run test:rules` (project `demo-bestreads`), also run in CI before the build

Done when:
- [x] Rules tests prove private paths are owner-only and nothing private reaches `public/...` (18 tests; a deliberately loosened rule makes them fail)

---

## Phase 4 — Series

- [x] Series name + volume number per book (filled from the catalog when added, editable; optional `series` in `firestore.rules`, published)
- [x] Suggestions from series already used by the user
- [x] Series as ordered, collapsible group inside a shelf (2+ books of a series on the same shelf; volume order; expanded by default)
- [x] Dot timeline (filled = read, ring = reading, outlined = not read; dashed = not in the library)
- [x] Desktop book page: full-height, independently scrolling series sidebar (on phones, the series section follows the dates), with every volume known to Open Library, "+ Add" per missing volume and "Add the N missing books to Want to read"

---

## Phase 5 — Reading plan

Only for books with status "Reading"; opt-in via "Add reading plan".

- [x] Plan editor: pages per day, time (optional), weekdays, reminder; optional `plan` on the book in `firestore.rules` (only while reading)
- [x] Estimated finish date calculation (unit tested), shown in the editor and in the plan strip
- [x] "Tonight's book" strip on Home when a plan has a session today (earliest session first)
- [x] Reminder delivery approach defined: an iCalendar (.ics) file with a weekly event and an alarm, imported into the user's calendar app. Scheduled notifications need a push server (Notification Triggers was abandoned), which the Spark plan and "no backend" rule out
- [x] Plan UI hidden for every other status; the plan is dropped when the book leaves "Currently reading"

---

## Phase 6 — Social

Delivered in sub-steps, each one tested and checked in the browser before the next.

Decisions:
- A username is 3–20 characters: lowercase letters, digits and `_` (typed with or without `@`, stored lowercase); a few names are reserved. It is chosen once and can't be changed from the app.
- The username lives in `public/{uid}` (not in `users/{uid}`): having a `public/{uid}` document means having a public profile. `usernames/{username}` and `public/{uid}` are created in one transaction, and the rules check each against the other.
- People are found by their exact `@username` (no prefix search), so the list of usernames can't be read by anyone.
- The feed reads each followed user's latest public ratings (one small query per followed user), since a public rating has no owner field for a collection-group query.

### 6.1 Username and public profile
- [x] `usernames/{username}` + `public/{uid}` (display name, username, photo), claimed together; `firestore.rules` and rules tests
- [x] "Public profile" section in Settings and on the Friends screen (choose a username, or see it)
- [x] Display name and photo changes copied to `public/{uid}` on login
- [x] Publish the updated `firestore.rules` in the Firebase console
- [x] Checked in the browser while signed in (choosing a username works end to end)

### 6.2 Public profile screen
- [x] Public profile route `/u/:username` with the user's public ratings (paginated, 20 per page, "Load more")
- [x] Follow / unfollow (`follows/{followerUid}_{followedUid}`) with rules and tests; following needs a username of one's own
- [x] Publish the updated `firestore.rules` in the Firebase console
- [ ] Checked in the browser while signed in (two accounts: follow, unfollow, ratings list)

### 6.3 Friends
- [x] Friends screen: find by `@username`, people you follow, followers (lists capped at 100)
- [x] Feed of followed users' public ratings (Friends screen; Home desktop side column, not rendered on phones)
- [ ] Checked in the browser while signed in (two accounts: feed, lists, Home side column at 1280px; Friends at 390px)

### 6.4 Moderation
- [x] Admin moderation of public data (usernames, public profiles, public ratings) using `isAdmin()` from `firestore.rules`; admins never get access to `users/{uid}/...`
  - On someone else's public profile, an admin sees a "Moderation" section ("Remove profile") and "Remove" under each public rating, both confirmed first.
  - Removing a profile deletes its public ratings, its follows (both ways) and `public/{uid}`; `usernames/{username}` stays, so the name is blocked for good and the owner must choose a new one.
  - Known limit: a removed rating's private book keeps `ratingPublic: true` (admins can't write `users/...`); the copy comes back if the owner saves that rating again. No ban: the owner can claim a new username and publish again.
- [x] Publish the updated `firestore.rules` in the Firebase console
- [ ] Checked in the browser with the admin account (remove a rating, remove a test profile)

---

## Phase 7 — Share cards and My Year

- [x] Single-book share card (`html-to-image`, loaded only when sharing): catalog cover, title, author, rating, finish month or status; "Share" on the book page for library books
- [x] Year-in-review (Wrapped-style) screen and card: `/year?year=YYYY` with year chips, books finished (re-reads count again), pages, average rating, books per month chart, highlights (best rated, longest book, most-read author), finished books grid; "Share my year" card
- [x] Web Share API on mobile, PNG download on desktop (1080 × 1920 PNG)
- [x] My Year card in the Home desktop side column (books, pages, average rating, link to My Year)
- [ ] Checked in the browser at 390px and 1280px, both themes (cards follow the theme's banner colors); sharing tried on a phone

Decisions:
- Cards never use personal covers (private). Catalog covers are fetched as data URLs first; a host that blocks reading them from the browser (no CORS) gets a title placeholder in the preview and in the image alike.
- My Year reads the "Read" and "Currently reading" shelves (300 books each, the shelf limit), since a re-read in progress can hold a read finished earlier.
- The share feature imports no other feature: cards take plain data.

---

## Phase 8 — PWA and polish

- [x] `vite-plugin-pwa`: manifest (192/512 + maskable icons generated from `public/favicon.svg`, theme color, standalone)
  - Icons from `@vite-pwa/assets-generator` (`npm run generate-pwa-assets`, `pwa-assets.config.ts`; maskable and Apple icons on the logo's dark brown), committed in `public/`.
- [x] Service worker caching app shell and covers; offline fallback page
  - The precached app shell is the offline fallback (`navigateFallback: index.html`; HashRouter keeps every route on it); an in-app banner says when the connection is gone. Covers: `CacheFirst`, 400 entries, 60 days. Firestore and the book APIs are never cached by the worker.
  - Updates wait for the user: a "new version" banner with "Reload" / "Later", so nothing being typed is lost.
- [x] "Install app" prompt on desktop and mobile (top bar button while the browser offers it; hidden when installed; Safari installs via Share → Add to Home Screen)
- [ ] Checked in the browser: install on desktop and Android, offline launch, update banner after a deploy
- [ ] Accessibility pass (labels, alt text, keyboard navigation, touch targets ≥ 44px)
- [ ] Final review of every screen at both sizes, both themes, both languages

---

## Open questions

- ~~Reminder delivery for reading plans without a backend~~ Decided: calendar file (.ics) with a weekly event and an alarm; the user's calendar app sends the reminders.
- ~~Firestore emulator for rules tests~~ Decided: `firebase-tools` and `@firebase/rules-unit-testing` as dev dependencies; rules tests run locally (`npm run test:rules`) and in CI.
- `signInWithRedirect` on a domain other than `<project>.firebaseapp.com` (GitHub Pages) is affected by browser third-party storage partitioning; the redirect fallback may need an auth-domain proxy or may be dropped. Popup login is the primary flow.
- ~~Search relevance~~ Decided: Google Books (whole words only, strong for Portuguese and new books) and Open Library (prefix on the last word, reader counts) are searched in parallel; copies of a work are merged and the list is ranked by match quality (title starts with the text or the text names an author > every word matches > other) and then popularity. A slow API is dropped at 1.5 s when the others already gave 3+ good matches, otherwise at 4 s. Goodreads-level popularity data is not available from free APIs, so very new or niche books can still rank lower than on Goodreads.
- Search identical to Goodreads: needs Goodreads-like data (reader counts, canonical editions, series, translated titles). Free public APIs (Google Books, Open Library) get close on famous books and series but not identical. Hardcover's API has that kind of data but needs a private token, which can't ship in the frontend and would need a small proxy outside Firebase (against "no custom backend"); undecided.
- ~~Shelves navigation icon~~ Decided: option A, a stack of three books lying down (`ShelvesIcon`); the other options stay in `docs/mocks/shelves-icon-options.html` for reference.
- Firestore offline cache (`persistentLocalCache`): would let the library open offline, but keeps the user's private data (books, reviews, covers) in the browser's IndexedDB after signing out, unless sign-out also clears it (`terminate` + `clearIndexedDbPersistence`). Not enabled yet; undecided.
- ~~Firestore bundle size~~ Decided: keep the full Firestore SDK (≈138 KB gzip, loaded after login, outside the initial bundle). `firebase/firestore/lite` is smaller but has no offline cache, which the PWA (Phase 8) needs.
