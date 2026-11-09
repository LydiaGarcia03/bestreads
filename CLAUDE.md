# CLAUDE.md

Guidance for Claude when working in this repository.

## Project

**Bestreads** (working name) is a private-first reading journal inspired by Goodreads.
Everything a user records is private by default; only a book's rating can be made public.

Core features:
- Login (Google and email/password)
- Search books (cover, title, author, description) from free public APIs
- Upload a personal cover for a book (private, never shared)
- Rate books from 0.25 to 5 stars in 0.25 steps (.25, .5, .75), with a public/private toggle per rating. UI: tap a star for a whole value, then fine-tune with a −/+ stepper (0.25 per step); partial stars render as a clipped fill (e.g. 3.75 = three full stars + a 75% star)
- Private review (free text, owner-only)
- Reading progress by pages or percentage
- Start and finish dates per read (re-reads supported)
- Optional reading plan, only for books in "Currently reading": opt-in via an "Add reading plan" button (pages per day, time, weekdays, reminder, estimated finish date). Books without a plan show only the button; never show plan UI for other statuses.
- Shelves: fixed (Want to read, Reading, Read) plus unlimited custom shelves
- Series shown as an ordered, collapsible group inside a shelf
- Social: follow users by @username and see their public ratings
- Shareable image cards (single book and year-in-review, Wrapped-style)
- Deployed as a static site on GitHub Pages

## Rules

### Language
- **All communication with the user must be in Brazilian Portuguese (PT-BR):** explanations, questions, summaries, plans, review notes.
- **All code and app content must be in English:** identifiers, comments, commit messages, PR titles and descriptions, branch names, file names, UI strings, docs inside the repo.
- The app UI supports exactly two languages: English (`en`, default) and Brazilian Portuguese (`pt-BR`). A small language dropdown (globe icon + `EN` / `PT-BR`) sits in the top bar on mobile and desktop; the choice is saved in the user's preferences. Every user-facing string goes through i18n (`react-i18next`); never hardcode UI text in components. Add the key to `en` first, then `pt-BR`. Translations live in `src/shared/i18n/locales/{en,pt-BR}.json`. Keys are type-checked against `en.json`, and a test fails if the two files don't have the same keys.

### Git and authorship
- **Never add Claude as author or co-author of a commit.** No `Co-Authored-By: Claude ...` trailer, no "Generated with Claude Code" line, no AI attribution in commit messages, PR descriptions, or code comments.
- Never change git `user.name` / `user.email`.
- **Never commit or push unless the user explicitly asks for it.** Leave changes in the working tree and report them. Permission for one commit or push doesn't carry over to later ones.
- Never force-push, rebase shared branches, or delete branches without asking the user first.
- Commit messages follow Conventional Commits in English: `type(scope): description`.
  - Use a colon after the scope, never a dash.
  - Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`.
  - Scopes: `auth`, `account`, `search`, `books`, `shelves`, `rating`, `progress`, `review`, `cover`, `series`, `plan`, `social`, `share`, `year`, `pwa`, `i18n`, `theme`, `layout`, `rules`, `deploy`, `deps`, `ai`. Add a new scope to this list when a new area appears.
  - Description: imperative mood, lowercase, no trailing period, header ≤ 72 characters.
  - Optional body explains why. Breaking changes use `!` after the scope (`feat(rules)!: ...`) or a `BREAKING CHANGE:` footer.
  - Examples: `feat(rating): add 0.25 stepper with partial star fill`, `fix(auth): fall back to redirect login on mobile`, `docs(ai): add change log and development plan`.
- Keep commits small and focused; one logical change per commit.

### Privacy and data
- Private data stays under `users/{uid}/...`. Reviews, personal covers, progress, and dates are **never** copied to `public/...`.
- Only a slim copy of a rating (title, author, API cover, rating, date) goes to `public/{uid}/ratings` and only when the user marks it public. Unpublishing deletes that copy.
- Any change to the data model must come with a matching update to `firestore.rules`. Never loosen a rule to make something work; explain the problem to the user instead.
- Never log or display another user's private data.

### Infrastructure limits
- Stay on the Firebase **Spark (free) plan**. Do not add anything that requires Blaze: no Firebase Cloud Storage, no Cloud Functions.
- No custom backend server. The app is a static site; all data access goes through the Firebase client SDK protected by Firestore rules.
- Personal covers are resized in the browser (~400px wide, WebP/JPEG, max ~150 KB) and stored as base64 in `users/{uid}/books/{bookId}/private/cover`. Never store images in the main book document (1 MB document limit).
- Never commit secrets. Firebase web config comes from `VITE_FIREBASE_*` env vars (`.env.local` locally, repository secrets in CI). Never commit `.env*` files except `.env.example`.
- Never put tokens that must stay private (e.g. a Hardcover API token) in frontend code.
- The optional Google Books key (`VITE_GOOGLE_BOOKS_API_KEY`) is a browser key: it ships in the bundle, so it must be restricted to the app's HTTP referrers and to the Books API in the Google Cloud console.

### AI workspace (`.ai/`)
- **Change log:** update `.ai/change-log.md` after every change made to the repository (code, config, docs). Add entries under today's date, newest first, one bullet per change with the type and affected paths.
- **Development plan:** read `.ai/development-plan.md` before starting any task to know the current phase and what comes next. Follow the plan in order; work outside the current phase only when the user asks for it.
  - Mark tasks `[~]` when started and `[x]` when done, and update "Current phase" when a phase is complete.
  - If the work shows the plan is wrong or incomplete (new task, reordered step, dropped item, open question answered), update the plan in the same change and record it in the change log.
- **How to refer to the user:** in all documentation, refer to the person who owns this project only as "user" (English docs) or "usuário" (PT-BR). Never use names, pronouns implying gender, or any other term.
- **Document facts, not requests:** documentation and the change log describe what was actually done and the current state of the project, never what was asked for (no "the user asked...", "as requested...").

### Dependencies and changes
- Ask before adding a new dependency; explain why it's needed and what it costs in bundle size.
- Don't refactor or restyle code unrelated to the current task.
- Ask before deleting files or making changes that can't be easily undone.

## Stack

| Layer | Choice |
| --- | --- |
| Frontend | React + Vite + TypeScript (strict) |
| Styling | Tailwind CSS |
| Routing | React Router with `HashRouter` (GitHub Pages has no SPA rewrites) |
| Server state | TanStack Query |
| i18n | `react-i18next` (default `en`, also `pt-BR`) |
| Auth | Firebase Authentication (Google + email/password) |
| Database | Cloud Firestore (Spark plan) |
| Book data | Google Books API (primary) + Open Library (fallback for missing cover/description) |
| Share cards | `html-to-image` + Web Share API (download PNG on desktop) |
| PWA | `vite-plugin-pwa` |
| Deploy | GitHub Actions to GitHub Pages |

## Data model (Firestore)

| Path | Content | Read | Write |
| --- | --- | --- | --- |
| `users/{uid}` | display name, photo, preferences (`theme`, `language`), `createdAt`; username from Phase 6 | owner | owner |
| `users/{uid}/books/{bookId}` | title, author, API cover, pages, ISBN, description, status, shelves, rating, progress, series + volume, reads (start/finish) | owner | owner |
| `users/{uid}/books/{bookId}/private/review` | review text | owner | owner |
| `users/{uid}/books/{bookId}/private/cover` | personal cover (base64) | owner | owner |
| `users/{uid}/shelves/{shelfId}` | custom shelf name and order | owner | owner |
| `admins/{uid}` | admin marker (`createdAt`), created only in the Firebase console | owner | nobody (console only) |
| `usernames/{username}` | owning `uid` (enforces unique usernames) | signed in | owner, create once |
| `public/{uid}` | display name, username, photo | signed in | owner |
| `public/{uid}/ratings/{bookId}` | title, author, API cover, rating, date | signed in | owner |
| `follows/{followerUid}_{followedUid}` | follow relation + date | signed in | follower |

`bookId` = Google Books volume id, or `ol-<id>` for Open Library, so the same book is never added twice.

`rating` is a number from 0.25 to 5 in 0.25 steps (or `null` when unrated). Validate it in the app and in `firestore.rules` (`rating * 4 == math.floor(rating * 4)` and `0 < rating <= 5`).

## Architecture and code quality

### Architecture
- Layered, with dependencies pointing inward:
  1. **UI** (`components/`, screens): rendering and user events only.
  2. **Hooks**: state and orchestration (TanStack Query, context).
  3. **Data access** (`api.ts`, providers): the only place that talks to Firebase, `fetch` or `localStorage`.
  4. **Domain** (plain TypeScript): pure logic with no React or I/O, such as rating math, progress, reading plan estimates and API response mappers.
- Components never import the Firebase SDK, call `fetch` or touch storage directly.
- External services sit behind small interfaces, so they can be swapped and mocked. For example, a `BookSearchProvider` is implemented by Google Books and by Open Library.
- Firebase-backed implementations are loaded with dynamic `import()` and injected through `AppProviders` (`src/app/services.ts`); tests pass the fakes from `src/test/fakes.ts`. Only those lazily loaded modules import `src/shared/firebase/app.ts`.
- Features import each other only through the feature's public `index.ts`. Page components are the exception: they are not exported from the index, and `src/app/AppRoutes.tsx` lazy-loads each one from its own module so it gets its own chunk. Shared, feature-agnostic code lives in `src/shared/` (UI primitives, utils).

### SOLID and clean code
- **Single responsibility:** one reason to change per module, component and hook. Split a component when it mixes data fetching, state and layout.
- **Open/closed:** extend through composition (props, children, new providers), not boolean flags that branch behavior.
- **Liskov and interface segregation:** keep interfaces and props small and focused. Any implementation of an interface must be usable wherever that interface is expected.
- **Dependency inversion:** high-level code depends on interfaces, and concrete implementations are injected (props, context, module boundary).
- Use descriptive names, small functions and early returns.
- Use named constants instead of magic numbers.
- Don't leave dead or commented-out code. Comments explain *why*, not *what*.
- No premature abstraction. Extract shared code once a second real use exists.
- Handle errors at boundaries (data-access layer, error boundaries). Show user-facing error messages through i18n. Never swallow an error silently unless a comment explains why.

### Performance
- Split code per route with `React.lazy`, and load heavy libraries on demand (e.g. `html-to-image` only when sharing).
- Import only the modular Firebase SDK functions in use.
- Budget: initial JS ≤ 250 KB gzip. Check the `npm run build` output whenever a dependency or a new route is added, and report the size change.
- Avoid needless re-renders:
  - Memoize context values.
  - Split contexts that change at different rates.
  - Use `memo`/`useMemo`/`useCallback` only where it prevents measurable work.
- Minimize Firestore reads:
  - Limit and paginate queries.
  - Don't attach listeners to large collections.
  - Set a sensible `staleTime` in TanStack Query.
- Covers use `loading="lazy"`, fixed dimensions or `aspect-ratio` (no layout shift) and the smallest available size.

### Testing
- **Unit tests** (Vitest): every domain function and every hook with logic, including edge cases (bounds, empty, invalid input).
- **Integration tests** (React Testing Library):
  - Every screen and every interactive component.
  - Rendered with the real providers (i18n, theme, router, query client) via the helpers in `src/test/`, with the data-access layer mocked at its boundary (`api.ts` or provider interface).
  - Query by role and label, as the user would.
- **Firestore rules tests** with the emulator for every rule (from Phase 3).
- A feature isn't done without its tests, and every bug fix includes a regression test.
- Tests are colocated as `*.test.ts(x)` next to the code they cover.

## Conventions

- TypeScript strict mode; no `any` without a comment explaining why.
- Feature-based folders: `src/features/<feature>/` (components, hooks, api, types).
- Firestore access only through typed functions in `src/features/*/api.ts`; components never call the SDK directly.
- Book API calls are debounced (400 ms) and cached with TanStack Query.
- Accessible by default: labels on inputs, alt text on covers, keyboard navigation.

## Platforms: desktop and mobile (PWA)

The app is a single responsive web app that works equally well on desktop (PC) and mobile, and is installable as a PWA on both.

- **Every screen must be designed and tested at both sizes.** Never ship a screen that only works on one. Check at least 390px (phone) and 1280px (desktop) wide.
- Mobile-first CSS with Tailwind breakpoints; the desktop layout starts at `lg` (1024px).
- Navigation: bottom tab bar on mobile (Home, Shelves, Friends, My Year); left side menu on desktop with the same items plus the user's shelves. Search lives in the top bar on both.
- Desktop uses the extra width for content, not stretched mobile cards: multi-column layouts (e.g. Home = main column + side column with friends and year stats), cover grids instead of lists.
- No inline long-text editing on mobile: the book page shows an "Add review" / "Edit review" button that opens a full-screen editor. On desktop the review can be edited inline.
- Touch targets ≥ 44px on mobile; hover and focus states plus keyboard shortcuts (`/` focuses search) on desktop.
- PWA (`vite-plugin-pwa`): web app manifest (name, icons 192/512 + maskable, theme color, `display: standalone`), service worker that caches the app shell and book covers, offline fallback page, and an "Install app" prompt on both desktop and mobile.
- Respect safe areas on mobile (`env(safe-area-inset-*)`) when installed in standalone mode.

## Design direction

- Logo: the "shelf" mark in `public/favicon.svg` (three book spines on a shelf, one leaning, on dark brown). It is the source for favicon and PWA icons; don't replace it without asking the user. The in-app wordmark is the text "best**reads**" with "reads" in the accent color.
- Base look: "Classic Library" — cream background `#F4F1EA`, dark brown text `#382110`, green accent `#2F6B4F`, Merriweather for headings, Lato for body.
- Dark theme: neutral dark gray palette (no blue or purple tint) — background `#141414`, surfaces `#1F1F1F`, borders `#2E2E2E`, text `#EDE6DA`, muted text `#ABABAB`, amber accent `#F2B66D`. Follows the system setting by default, with a manual toggle in settings.
- Colors and fonts come from Tailwind theme tokens (CSS variables), never hardcoded hex values in components, so both themes stay in sync.
- Series are shown as a vertical timeline with dots (filled = read, ring = currently reading, outlined = not read yet).
- Desktop book page: book info column on the left (cover, change cover, status, shelves, reading dates); title, summary, progress, rating, reading plan and a large review textarea in the center, laid out with spacing instead of boxed cards; for books in a series, a full-height series sidebar on the right, right below the app header, scrolling on its own so long series (15+ books) fit.

## UI reference (mocks)

Static HTML mocks live in `docs/mocks/` (open `docs/mocks/index.html` in a browser). **Build the UI from them**: layout, spacing, colors, fonts, copy and component behavior. They are a visual reference, not code to copy: rebuild them as React components with Tailwind theme tokens and i18n strings.

| Mock | Screen | Key points |
| --- | --- | --- |
| `home-mobile-light.html` | Home, mobile, light | Search in top bar, language dropdown, "Currently reading" card with "Update progress" and the "Tonight's book" strip (only when a reading plan exists), shelves with filter chips, series as dot timeline, bottom tabs Home / Shelves / Friends / My Year |
| `home-mobile-dark.html` | Home, mobile, dark | Same screen in the dark gray theme |
| `book-mobile-light.html` | Book page, mobile | Cover + "Change cover", status button, shelves, progress (pages / %), "Add reading plan" button, rating with stars + 0.25 stepper, dates, "Add review" button (opens a full-screen editor) |
| `home-desktop-light.html` | Home, desktop | Top bar with large search (`/` shortcut), language dropdown, "Install app"; left side menu with tabs and shelves; main column with current book and cover grid; side column with series, Friends, My Year |
| `book-desktop-dark.html` | Book page, desktop | Left info column (cover, status, shelves, dates) kept as is; center without boxed cards: title + summary, large progress, reading plan strip, rating above a large review textarea; full-height series sidebar on the right |

Rules for using the mocks:
- Every screen needs both themes and both sizes, even where only one variant is mocked (e.g. build the book page in light theme and on mobile in dark theme from the same tokens).
- Screens without a mock (search results, shelves, friends, profile, My Year, share card, settings, reading plan editor, review editor) follow the same visual language: Merriweather headings, Lato body, cream/brown/green light theme, gray/amber dark theme, dot timelines for series.
- Book covers in the mocks are colored placeholders; real covers come from the API or the user's own upload.
- If a mock and this file disagree, this file wins; ask the user before changing the design direction.

## Deploy

- `vite.config.ts` uses `base: '/<repo>/'`.
- `.github/workflows/deploy.yml`: `npm ci` → lint, typecheck, test → `npm run build` (repository secrets `VITE_FIREBASE_*` and `VITE_GOOGLE_BOOKS_API_KEY` as env) → `actions/upload-pages-artifact` (`dist`) → `actions/deploy-pages`. A failing check blocks the deploy.
- Firebase Auth must list `<user>.github.io` under Authorized domains.
- If the Google popup login fails on mobile, use `signInWithRedirect`.

## Commands

```bash
npm install        # install dependencies
npm run dev        # local dev server on http://localhost:5180/ (preview: 4180)
npm run build      # production build to dist/
npm run lint       # ESLint
npm run typecheck  # tsc --noEmit
npm test           # Vitest
```

Run `lint`, `typecheck` and `test` before saying a task is done.

## Roadmap

The phased development plan, with task status and open questions, lives in `.ai/development-plan.md` and is the single source of truth for what to build next.
