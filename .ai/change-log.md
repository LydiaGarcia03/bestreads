# Change log

Living record of every change made to this repository. Newest entries first.
Each entry states what was done (facts), not what was requested.

Format:

```
## YYYY-MM-DD
- <type>(<scope>): <what was changed> (`path/to/file`)
```

---

## 2026-11-09
- build: project scaffolding (Phase 1.1). `package.json` with scripts `dev`, `build`, `preview`, `lint`, `typecheck` (`tsc -b`), `test` (`vitest run`), `test:watch`. Runtime deps: react, react-dom, react-router-dom, @tanstack/react-query, i18next, react-i18next, @fontsource/merriweather, @fontsource/lato. Dev deps: vite 8, @vitejs/plugin-react, typescript 6, tailwindcss 4 + @tailwindcss/vite, eslint 10 + typescript-eslint + react-hooks/react-refresh plugins, vitest 5, @testing-library/react, jest-dom, user-event, jsdom. Added `tsconfig.json` / `tsconfig.app.json` (strict, `noUncheckedIndexedAccess`, `@/*` alias) / `tsconfig.node.json`, `vite.config.ts` (base `/bestreads/` on build, Vitest with jsdom), `eslint.config.js`, `.env.example` (`VITE_FIREBASE_*`), `index.html`, `src/main.tsx`, `src/App.tsx`, `src/index.css`, `src/test/setup.ts`, `src/App.test.tsx`. `typecheck`, `lint`, `test` and `build` pass.
- build: added `.gitattributes` (LF line endings for all text files, CRLF for `.bat`/`.cmd`/`.ps1`, image and font files marked binary). `git add --renormalize` produced no changes (tracked files were already LF).
- build: added `.gitignore` (node_modules, build output, `.env*` except `.env.example`, coverage, Firebase logs, editor/OS files including `.idea/`).
- docs(ai): defined commit message format in `CLAUDE.md` (Git and authorship) — `type(scope): description`, list of types and project scopes, description rules, breaking change notation and examples. Change log entry format updated to include the scope.
- docs: created `.ai/` folder.
- docs: created `.ai/change-log.md` (this file).
- docs: created `.ai/development-plan.md` with phases 0–8; Phase 0 marked done, Phase 1 set as current. The plan expands the former 5-step roadmap and adds separate phases for Reading plan (5), Share cards and My Year (7) and PWA and polish (8).
- docs: updated `CLAUDE.md` — added "AI workspace (`.ai/`)" rules section (change log, plan usage, documentation wording) and replaced the "Roadmap" section with a pointer to `.ai/development-plan.md`.
