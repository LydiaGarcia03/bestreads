# Development plan

Living plan for delivering Bestreads as described in `CLAUDE.md`.
Each phase lists its tasks and a "Done when" checklist. Mark tasks with `[x]` as they are completed and record each change in `.ai/change-log.md`.

Status legend: `[ ]` not started · `[~]` in progress · `[x]` done

Current phase: **Phase 1 — Base**

---

## Phase 0 — Project process

- [x] `CLAUDE.md` with project scope, rules, stack, data model and design direction
- [x] Static UI mocks in `docs/mocks/`
- [x] `.ai/change-log.md` and `.ai/development-plan.md`

---

## Phase 1 — Base

Goal: an empty but deployable app with login, search, theming, i18n and the responsive shell.

### 1.1 Scaffolding and tooling
- [ ] Vite + React + TypeScript (strict) project
- [ ] ESLint, `typecheck` script (`tsc --noEmit`), Vitest + React Testing Library
- [x] `.gitignore` (including `.env*` except `.env.example`, `.idea/`, `dist/`) and `.gitattributes` (LF line endings)
- [ ] `.env.example` with all `VITE_FIREBASE_*` keys
- [ ] Feature-based folder structure under `src/features/`

### 1.2 Design system
- [ ] Tailwind with theme tokens as CSS variables (light "Classic Library" and dark gray/amber)
- [ ] Merriweather (headings) and Lato (body)
- [ ] Theme follows system setting, with manual override stored in preferences

### 1.3 i18n
- [ ] `react-i18next` with `en` (default) and `pt-BR`
- [ ] Language dropdown (globe + `EN` / `PT-BR`) in the top bar

### 1.4 App shell and routing
- [ ] `HashRouter` with routes: Home, Search, Book, Shelves, Friends, My Year, Profile, Settings
- [ ] Mobile: top bar + bottom tab bar (Home, Shelves, Friends, My Year), safe areas
- [ ] Desktop (`lg`+): top bar with large search + left side menu
- [ ] `/` keyboard shortcut focuses search

### 1.5 Firebase and auth
- [ ] Firebase app init from env vars
- [ ] Login with Google (popup, `signInWithRedirect` fallback on mobile) and email/password (sign up, sign in, password reset)
- [ ] Auth guard for private routes; create `users/{uid}` on first login
- [ ] Initial `firestore.rules` covering `users/{uid}`

### 1.6 Book search
- [ ] Google Books client (title, author, cover, description, pages, ISBN)
- [ ] Open Library fallback for missing cover/description
- [ ] Debounced (400 ms) search cached with TanStack Query
- [ ] Search results screen (mobile list, desktop grid)

### 1.7 Deploy
- [ ] `vite.config.ts` with `base: '/<repo>/'`
- [ ] `.github/workflows/deploy.yml` (build + GitHub Pages deploy, secrets as env)

Done when:
- [ ] `lint`, `typecheck` and `test` pass
- [ ] App deployed on GitHub Pages; login and search work on 390px and 1280px, both themes, both languages

---

## Phase 2 — My shelf

Goal: the user can track books on shelves with status, rating, progress and dates.

- [ ] Add book from search to `users/{uid}/books/{bookId}` (no duplicates by `bookId`)
- [ ] Fixed statuses: Want to read, Reading, Read
- [ ] Custom shelves: create, rename, reorder, delete; assign books to many shelves
- [ ] Shelves screen with filter chips (mobile list, desktop cover grid)
- [ ] Rating component: tap star for whole value, −/+ stepper by 0.25, clipped partial star fill
- [ ] Rating public/private toggle; publish/unpublish slim copy to `public/{uid}/ratings/{bookId}`
- [ ] Reading progress by pages or percentage ("Update progress")
- [ ] Reads: start/finish dates, re-reads supported
- [ ] Book page (mobile and desktop layouts from mocks)
- [ ] Home: "Currently reading" card and shelves
- [ ] `firestore.rules` for books, shelves and public ratings (rating validation)

Done when:
- [ ] Unit tests for rating math and progress calculation
- [ ] All screens checked at 390px and 1280px, both themes

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
- [ ] `public/{uid}` profile (display name, username, photo)
- [ ] Follow / unfollow (`follows/{followerUid}_{followedUid}`)
- [ ] Friends screen and public profile with public ratings
- [ ] Feed of followed users' public ratings
- [ ] `firestore.rules` for usernames, public profile and follows

---

## Phase 7 — Share cards and My Year

- [ ] Single-book share card (`html-to-image`)
- [ ] Year-in-review (Wrapped-style) screen and card
- [ ] Web Share API on mobile, PNG download on desktop

---

## Phase 8 — PWA and polish

- [ ] `vite-plugin-pwa`: manifest (192/512 + maskable icons, theme color, standalone)
- [ ] Service worker caching app shell and covers; offline fallback page
- [ ] "Install app" prompt on desktop and mobile
- [ ] Accessibility pass (labels, alt text, keyboard navigation, touch targets ≥ 44px)
- [ ] Final review of every screen at both sizes, both themes, both languages

---

## Open questions

- Reminder delivery for reading plans without a backend (Phase 5).
- Firestore emulator / `@firebase/rules-unit-testing` as dev dependencies for rules tests (Phase 3).
