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
- build: added `.gitattributes` (LF line endings for all text files, CRLF for `.bat`/`.cmd`/`.ps1`, image and font files marked binary) and renormalized tracked files.
- build: added `.gitignore` (node_modules, build output, `.env*` except `.env.example`, coverage, Firebase logs, editor/OS files including `.idea/`).
- docs(ai): defined commit message format in `CLAUDE.md` (Git and authorship) — `type(scope): description`, list of types and project scopes, description rules, breaking change notation and examples. Change log entry format updated to include the scope.
- docs: created `.ai/` folder.
- docs: created `.ai/change-log.md` (this file).
- docs: created `.ai/development-plan.md` with phases 0–8; Phase 0 marked done, Phase 1 set as current. The plan expands the former 5-step roadmap and adds separate phases for Reading plan (5), Share cards and My Year (7) and PWA and polish (8).
- docs: updated `CLAUDE.md` — added "AI workspace (`.ai/`)" rules section (change log, plan usage, documentation wording) and replaced the "Roadmap" section with a pointer to `.ai/development-plan.md`.
