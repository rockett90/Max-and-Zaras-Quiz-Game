# Max and Zara's Quiz Game — decision log

Append-only. Newest entry first. Never edit or delete an entry; supersede it with a
new one ("DEC-007 supersedes DEC-003 …"). Grep the index, then read single entries.

## Index

- DEC-002 · 2026-10-18 · M2 Question schema — YAML bank, validator, drafts excluded from production
- DEC-001 · 2026-10-18 · M1 Foundations — Vite + TS rebuild, Cloudflare hosting, speed tuning

---

## DEC-002 · 2026-10-18 · M2 Question schema + validator

**Built:** Question schema and validator (`src/game/questionSchema.ts`): id,
language, subject, ages 4–11, level 1–3, type (choice / true-false / typed /
ordering), prompt, answer, choices, `explain`, `strictAccents`, status. Vite plugin
`build/questionsPlugin.ts` turns `content/questions/**.yaml` into
`virtual:questions`; an invalid question fails the build. Legacy JSON banks cleaned
(not ported) into `content/questions/en/`: 125 literacy + 44 numeracy, all `draft`.
`src/game/questions.ts` reads the virtual module through an interim adapter for the
one-text-box card. `content/legacy/` deleted (it stays in git history). Verify green:
typecheck, lint, 61 tests, build.

**Decided:**
- REQ-CONT-001 is met by *excluding* drafts from production builds, not failing the
  build on them, so in-progress content never blocks a release. Dev keeps drafts.
  Rejected failing the build: one unreviewed question would stop every deploy.
- Legacy cleaning: ~400 disguised sums dropped (M3 generates arithmetic); "Spell the
  word 'x'" rewritten as pick-the-spelling and now rejected by the validator; `c_t`
  gaps made multiple choice with a clue; letter sounds dropped until read-aloud (M4).
- `pickQuestion` falls back to nearest level, then nearest age — legacy coverage
  stops around age 9 until M10.

**Deviations:** M2 closed with the 169 questions still `draft` — Adam chose to defer
the review. A production build therefore ships no questions; review is due before
any public deploy (M13 at the latest, sooner if a preview deploy is played).

**Dead-ends:** none new.

---

## DEC-001 · 2026-10-18 · M1 Foundations

**Built:** Vite + TypeScript project replacing the 2025 vanilla prototype.
`src/engine/` (fixed-step loop, seeded mulberry32 RNG, image/audio preloader,
buffered keyboard, letterboxed stage fit) and `src/game/` (pure `World` simulation
emitting events, canvas renderer with HUD, interim picker over the legacy banks in
`content/legacy/`). DOM screens for splash, age select (4–11), question card and
results. `pnpm verify` = tsc, eslint, 28 Vitest tests, vite build. Played a full
round in the browser at desktop and phone sizes.

**Decided:**
- Hosting: Cloudflare Pages + Pages Functions (`/api/*`) + D1 on
  games.teamrockett.co.uk (DNS already on Cloudflare). Rejected a Node VPS (upkeep
  for tiny traffic) and a separate API subdomain (CORS, second deploy).
- Logical 1024×768 stage scaled as one unit (canvas + DOM overlays together), so
  menus and the game never drift apart. Rejected separately scaled DOM.
- Speeds raised ~45% after Adam's play-test (scroll 260 px/s, bubble 520 px/s,
  gravity 1800, jump 1150); confirmed "feels ok".
- Plan changes from the play-test: age-scaled per-question timer with speed bonus
  (REQ-PLAY-002), blanks must be multiple choice (REQ-CONT-002), accent-insensitive
  marking with accent feedback (REQ-ANS-001), learning loop in M4, new M14
  bilingual mode, build order M1→M2→M6→M3→… Creature collection and two-player
  mode deferred to v2.1.

**Deviations:** Accent-insensitive marking, Enter-to-submit, answer feedback and age
11 landed in M1 rather than M4 because they were one-line fixes to the interim card.

**Dead-ends:**
- TypeScript 7.0 — typescript-eslint 8.x peer range stops below 6.1; pinned `~6.0.3`.
- `verify` as nested `pnpm typecheck && pnpm lint …` — pnpm 11's per-script deps
  check raced on `node_modules/.pnpm/lock.yaml` (EPERM on Windows). Tools called
  directly instead.
- Fitting the stage to `window.innerWidth` — on mobile the unscaled 1024px stage
  widened the layout viewport (innerWidth 1024 on a 375 screen). Now measures a
  fixed, clipped `#viewport` box via ResizeObserver.
- Bash heredocs containing backticks or nested quotes broke twice; use the Write
  tool for multi-line files and Edit for markdown with backticks.
