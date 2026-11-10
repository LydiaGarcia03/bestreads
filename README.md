<div align="center">

<img src="public/favicon.svg" alt="Bestreads icon: three book spines on a shelf, one leaning" width="96" height="96">

<h1>
  <img src="docs/readme/wordmark-light.svg#gh-light-mode-only" alt="bestreads" width="300" height="64">
  <img src="docs/readme/wordmark-dark.svg#gh-dark-mode-only" alt="bestreads" width="300" height="64">
</h1>

**A reading journal that stays yours.**

Track what you read, rate it in quarter stars, write reviews only you can see,<br>
and keep your shelves, series and reading plans in one calm place.

[**Open the app →**](https://lydiagarcia03.github.io/bestreads/)

![React](https://img.shields.io/badge/React-20232a?logo=react&logoColor=61dafb)
![TypeScript](https://img.shields.io/badge/TypeScript-3178c6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646cff?logo=vite&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-Spark_plan-ffca28?logo=firebase&logoColor=black)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-0f172a?logo=tailwindcss&logoColor=38bdf8)
![Cost](https://img.shields.io/badge/running_cost-%240-2F6B4F)

</div>

> Inspired by Goodreads, built around one idea: **everything you record is private by default.** The only thing that can ever be public is a book's rating, and only when you choose to share it.

---

## ✨ What it does

<table>
<tr>
<td width="50%" valign="top">

### 🔎 Find any book, fast
One search bar, two free catalogs: Google Books and Open Library are searched in parallel and merged into a single ranked list, with covers, authors, series ("Dune, #1") and descriptions. Press <kbd>/</kbd> on a computer to start typing.

### ⭐ Ratings in quarter stars
Move the mouse across the stars and the rating follows in 0.25 steps (3.75 is three full stars and a ¾ star); click to save. Arrow keys work too. Each rating has its own public/private switch.

### 📝 A private review
Write as much as you like about a book. Reviews are owner-only, always: inline on a computer, full-screen editor on the phone.

</td>
<td width="50%" valign="top">

### 📚 Shelves and series
*Want to read*, *Currently reading* and *Read*, plus as many shelves of your own as you need. Books of the same series group together on a shelf, in volume order, with a dot timeline (● read, ◉ reading, ○ not yet). The book page shows the whole series, including the volumes you don't have yet, ready to add.

### 📈 Progress, dates and re-reads
Track progress by page or percentage, with start and finish dates for every read, so re-reads keep their own history.

### 🌙 Reading plans
For the book you're reading: pages per day, a time and the days of the week. Bestreads estimates your finish date, shows *Tonight's book* on Home, and can add a repeating reminder to your phone's or computer's calendar.

</td>
</tr>
</table>

### And also

- 🖼️ **Your own cover**: drop, paste or pick a photo of your edition. It is resized on your device and only you can see it.
- ✨ **Popular books on Home**: what readers are reading this year.
- 🌗 **Light and dark themes**: a cream-and-green "classic library" look by day, a warm dark gray by night. It follows your system unless you pick one.
- 🌎 **English and Brazilian Portuguese**: switch from the top bar; your choice is saved.
- 📱 **One app, every screen**: bottom tabs on the phone, a side menu and cover grids on the computer.

## 🔒 Private by design

| What you record | Who can see it |
| --- | --- |
| Shelves, progress, dates, reading plans | Only you |
| Reviews and personal covers | Only you, stored apart from the book |
| A rating marked **public** | Signed-in users: just the title, author, cover and rating |
| A rating left private | Only you |

Firestore security rules enforce all of this on the server, not just in the app, and every rule has its own automated test on the Firebase emulator. Unpublishing a rating deletes its public copy.

## 🛠️ Tech stack

- [Vite](https://vite.dev/) + [React](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) (strict)
- [Tailwind CSS](https://tailwindcss.com/): theme tokens for both color schemes
- [TanStack Query](https://tanstack.com/query): caching, optimistic updates
- [React Router](https://reactrouter.com/) (hash routing for GitHub Pages)
- [react-i18next](https://react.i18next.com/): English and Brazilian Portuguese
- [Firebase](https://firebase.google.com/): Authentication (Google and email/password) and Cloud Firestore
- [Google Books API](https://developers.google.com/books) + [Open Library](https://openlibrary.org/developers/api): book data
- [Vitest](https://vitest.dev/) + [Testing Library](https://testing-library.com/), and `@firebase/rules-unit-testing` for the security rules
- GitHub Pages + GitHub Actions: hosting and deployment

## 🚀 Getting started

### Requirements

- Node.js (LTS) and Git
- A Firebase project (free Spark plan) with Authentication (Google + Email/Password) and Cloud Firestore
- *(Optional)* Java 21+ to run the security rules tests on the Firestore emulator
- *(Optional)* A Google Books API key

### Run locally

```bash
git clone https://github.com/LydiaGarcia03/bestreads.git
cd bestreads
npm install
```

Copy `.env.example` to `.env.local` and fill in your Firebase web config (Firebase console → *Project settings* → *Your apps*). `.env.local` is git-ignored, so never commit it.

```bash
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
# Optional: restrict it to your site's HTTP referrers and to the Books API
VITE_GOOGLE_BOOKS_API_KEY=...
```

Publish `firestore.rules` in the Firebase console (*Firestore* → *Rules*), then start the dev server:

```bash
npm run dev
```

The app opens at `http://localhost:5180/`.

### Checks

```bash
npm run lint        # ESLint
npm run typecheck   # TypeScript
npm test            # unit and integration tests (Vitest)
npm run test:rules  # Firestore security rules on the emulator (Java 21+)
npm run build       # production build in dist/
npm run preview     # serve the build on http://localhost:4180/
```

## 📦 Deployment

Every push to `main` runs lint, typecheck, the tests and the security rules tests, then builds and deploys to GitHub Pages through GitHub Actions. A failing check blocks the deploy.

The Firebase config and the optional Google Books key reach the build as repository secrets (`VITE_FIREBASE_*`, `VITE_GOOGLE_BOOKS_API_KEY`). Both are browser keys: they ship in the bundle by design and are protected by Firebase Authorized domains, Firestore rules and Google Cloud restrictions. Remember to add `<user>.github.io` to Firebase Auth's *Authorized domains*.

## 💸 Keeping it free

Bestreads is designed to run at **zero cost**:

- **Firebase Spark plan**: no Cloud Functions and no Cloud Storage. Personal covers are resized in the browser (about 400 px, ≤ 150 KB) and kept in Firestore.
- **Few reads**: queries are limited and cached, with no listeners on large collections.
- **Book data**: Google Books and Open Library are free; results are cached, and the search waits for you to stop typing.
- **No backend**: a static site. All data access goes through the Firebase SDK, guarded by security rules.
- **Hosting**: GitHub Pages.
- **Small and quick**: under 250 KB of JavaScript (gzip) on first load. Each screen and the Firebase SDK load on demand.

## 🗺️ Roadmap

- [x] **Foundation**: sign-in, profile, themes, languages, responsive layout
- [x] **Books**: search, book page, library, ratings with public copies, progress, reads, shelves, popular books
- [x] **Private data**: reviews, personal covers, security rules tested on the emulator
- [x] **Series**: series and volume per book, series sidebar, grouped shelves with dot timelines
- [x] **Reading plans**: plan editor, finish estimate, *Tonight's book*, calendar reminders
- [ ] **Social**: `@username`, follow friends and see their public ratings
- [ ] **Share cards and My Year**: share a book as an image and a Wrapped-style year in review
- [ ] **PWA**: install on phone and computer, offline app shell and covers

## 📜 Data and attribution

Book data from the [Google Books API](https://developers.google.com/books) and [Open Library](https://openlibrary.org/) (Internet Archive). Covers belong to their publishers and are shown as provided by those services. Fonts: [Merriweather](https://fonts.google.com/specimen/Merriweather) and [Lato](https://fonts.google.com/specimen/Lato) (SIL Open Font License).

<div align="center">
<br>
<sub>A personal project, built with the help of <a href="https://claude.ai">Claude</a>. 📖</sub>
</div>
