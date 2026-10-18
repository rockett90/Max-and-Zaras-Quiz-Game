# Max and Zara's Quiz Game — decision log

Append-only. Newest entry first. Never edit or delete an entry; supersede it with a
new one ("DEC-007 supersedes DEC-003 …"). Grep the index, then read single entries.

## Index

- DEC-004 · 2026-10-18 · M3 Maths generators — symbol-only sums per age × level, 50/50 with bank numeracy, choice for ages 4–5
- DEC-003 · 2026-10-18 · M6 Game feel — streak scoring, stars, parallax, box tints, particles; own RNG for effects
- DEC-002 · 2026-10-18 · M2 Question schema — YAML bank, validator, drafts excluded from production
- DEC-001 · 2026-10-18 · M1 Foundations — Vite + TS rebuild, Cloudflare hosting, speed tuning

---

## DEC-004 · 2026-10-18 · M3 Procedural maths generators

**Built:** `src/game/arithmetic.ts`, holding a curriculum table for every age 4–11 ×
level 1–3 after the UK bands. Its recipes cover add, sub, times tables, exact
division, missing number, order of operations, negatives and squares.
`generateSum` returns structured `{op, operands, answer, prompt, working}`, and
`generateQuestion` wraps that as a `Question`. `pickQuestion` gained a
`generatedShare` parameter, default `GENERATED_SHARE = 0.5`.
`tests/arithmetic.test.ts` holds its own limits table, independent of the
curriculum, and checks each cell's op set, answer range and operand range over 500
seeds. It also evaluates every prompt and working line with the answer filled in,
and checks exact division and same-seed replay. Committed as bb44de3. Verify
green: 132 tests, build.

**Decided:**
- Symbols only (`7 + 5 = ?`, `? − 3 = 4`, explanation `7 + 5 = 12`), so one
  generator serves all five languages. The missing number is `?`, not `__`, which
  REQ-CONT-002 reserves for choice questions.
- Half of numeracy picks are generated (Adam). Numeracy is always offered while the
  share is above 0, so a production build with an all-draft bank still has sums.
- Ages ≤5 (`CHOICE_MAX_AGE`) get multiple choice: the answer plus two near misses
  within ±2, never negative (Adam). Older ages type the answer. Negative answers
  also accept the typographic minus.
- Generated questions are `status: reviewed`, because the code is the reviewed
  source.
- Rejected: word problems in the generator. They stay hand-written in YAML (M10).

**Deviations:** none from the approved plan.

**Follow-ups:**
- Romanian (and some other European languages) writes ÷ as `:` and × as `·`.
  Add a per-language symbol map when es/ro content arrives (M11).
- Age 4 L3 can produce trivial sums like `1 − 1`. Retune after play-testing.
- Older ages still draw thin bank numeracy half the time (e.g. `6, __, 10` at
  age 10). M10 content fixes that, or raise the share.

---

## DEC-003 · 2026-10-18 · M6 Game feel

**Built:** `src/game/scoring.ts` (pure): level × 10 points, streak ×1.5 from 3 in a
row and ×2 from 5, stars from accuracy (★ any right; ★★ ≥60% with ≥4 answered;
★★★ ≥85% with ≥6). HUD streak pill; results screen with animated stars and a tally.
`src/engine/parallax.ts` + `src/game/scenery.ts`: background.png mirror-tiled and
split at y=645 when drawn (water 0.2×, sand 1× with water keyed out), two
code-drawn reef silhouettes (0.3×, 0.45×), light beams breathing on `World.elapsed`.
`src/game/boxArt.ts`: three tinted copies of box1 made at load (wood, sea-green with
a code-drawn shell, amber-gold with a shimmer) and 1–3 star pips instead of numbers.
`src/engine/particles.ts` + `src/game/effects.ts`: box splinters and bubbles, bubble
trail, landing puff, sparkles and "+N", plankton. Adam play-tested side-by-side
against the M1 build (33e2441) and signed it off. Verify green: 78 tests, build.

**Decided:**
- Box variants are tints and overlays in code, not new drawings (Adam's choice); no
  asset file is edited, keeping the personal-art invariant.
- Effects run on a separate RNG per round, never the round RNG. If they shared it,
  the number of bursts would change which boxes and questions follow, breaking the
  reproducible Daily Challenge. Effects still advance only in `update(dt)`.
- Scoring is pure and out of `main.ts` so M8's score-plausibility ceiling can be
  derived from the same rules.
- Reduced motion scales particles to 35% but always shows the "+N" (information).
- A perfect 3 of 3 earns only ★ (the ★★ minimum is 4 answered). Kept; revisit when
  the children play.

**Deviations:** a second, fainter reef layer was added in 6b for depth (plan had one).

**Dead-ends:**
- Single-pass reef paths (quadratic mounds, pointed kelp) read as spires; rebuilt as
  overlapping half-ellipses and round-tipped blades in one `Path2D` so overlaps fill once.
- Drawing tiled copies at fractional x left a hairline seam; copies now overlap 1 px.
- Multiply alone left level 2 murky and stars vanished on a screen-brightened gold;
  multiply + a light screen pass, cut back with `destination-in`, fixed both.
- New `landed` event hit `main.ts`'s catch-all `else endRound()`; event handling now
  names `timeUp` explicitly. Exhaustive event checks belong in any new handler.
- The built-in browser pane throttles rAF to ~2 fps, so the game clock looks slow
  there. Not a game bug (no long animation frames measured).

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
