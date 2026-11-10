# Development plan

Living plan for delivering Bestreads as described in `CLAUDE.md`.
Each phase lists its tasks and a "Done when" checklist. Mark tasks with `[x]` as they are completed and record each change in `.ai/change-log.md`.

Status legend: `[ ]` not started · `[~]` in progress · `[x]` done

Current phase: **Phase 2 — My shelf** (in progress)

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
- [ ] All screens checked at 390px and 1280px, both themes (the browser window could not be narrowed from the automation; needs a check on a phone or DevTools)

---

## Phase 3 — Private

Goal: private content and verified security rules.

- [ ] Review: full-screen editor on mobile, inline editor on desktop; stored in `private/review`
- [ ] Personal cover upload: browser resize (~400px, WebP/JPEG, ≤ ~150 KB), base64 in `private/cover`
- [ ] Cover display priority: personal cover > API cover > placeholder
- [ ] Firestore rules tests with the emulator (dependency to be confirmed with the user)

Done when:
- [ ] Rules tests prove private paths are owner-only and nothing private reaches `public/...`

---

## Phase 4 — Series

- [ ] Series name + volume number per book
- [ ] Suggestions from series already used by the user
- [ ] Series as ordered, collapsible group inside a shelf
- [ ] Dot timeline (filled = read, ring = reading, outlined = not read)
- [ ] Desktop book page: full-height, independently scrolling series sidebar

---

## Phase 5 — Reading plan

Only for books with status "Reading"; opt-in via "Add reading plan".

- [ ] Plan editor: pages per day, time, weekdays, reminder
- [ ] Estimated finish date calculation (unit tested)
- [ ] "Tonight's book" strip on Home when a plan exists
- [ ] Reminder delivery approach defined (no backend available; evaluate local notifications via service worker)
- [ ] Plan UI hidden for every other status

---

## Phase 6 — Social

- [ ] Unique `@username` via `usernames/{username}` (create once)
- [ ] `public/{uid}` profile (display name, username, photo) and public profile route
- [ ] Follow / unfollow (`follows/{followerUid}_{followedUid}`)
- [ ] Friends screen and public profile with public ratings
- [ ] Feed of followed users' public ratings
- [ ] `firestore.rules` for usernames, public profile and follows
- [ ] Admin moderation of public data (usernames, public profiles, public ratings) using `isAdmin()` from `firestore.rules`; admins never get access to `users/{uid}/...`

---

## Phase 7 — Share cards and My Year

- [ ] Single-book share card (`html-to-image`)
- [ ] Year-in-review (Wrapped-style) screen and card
- [ ] Web Share API on mobile, PNG download on desktop

---

## Phase 8 — PWA and polish

- [ ] `vite-plugin-pwa`: manifest (192/512 + maskable icons generated from `public/favicon.svg`, theme color, standalone)
- [ ] Service worker caching app shell and covers; offline fallback page
- [ ] "Install app" prompt on desktop and mobile
- [ ] Accessibility pass (labels, alt text, keyboard navigation, touch targets ≥ 44px)
- [ ] Final review of every screen at both sizes, both themes, both languages

---

## Open questions

- Reminder delivery for reading plans without a backend (Phase 5).
- Firestore emulator / `@firebase/rules-unit-testing` as dev dependencies for rules tests (Phase 3). Until then, `firestore.rules` for `users/{uid}` has no automated tests.
- `signInWithRedirect` on a domain other than `<project>.firebaseapp.com` (GitHub Pages) is affected by browser third-party storage partitioning; the redirect fallback may need an auth-domain proxy or may be dropped. Popup login is the primary flow.
- ~~Search relevance~~ Decided: Google Books (whole words only, strong for Portuguese and new books) and Open Library (prefix on the last word, reader counts) are searched in parallel; copies of a work are merged and the list is ranked by match quality (title starts with the text or the text names an author > every word matches > other) and then popularity. A slow API is dropped at 1.5 s when the others already gave 3+ good matches, otherwise at 4 s. Goodreads-level popularity data is not available from free APIs, so very new or niche books can still rank lower than on Goodreads.
- ~~Shelves navigation icon~~ Decided: option A, a stack of three books lying down (`ShelvesIcon`); the other options stay in `docs/mocks/shelves-icon-options.html` for reference.
- ~~Firestore bundle size~~ Decided: keep the full Firestore SDK (≈138 KB gzip, loaded after login, outside the initial bundle). `firebase/firestore/lite` is smaller but has no offline cache, which the PWA (Phase 8) needs.
