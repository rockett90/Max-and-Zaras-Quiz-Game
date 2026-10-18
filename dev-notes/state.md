# Max and Zara's Quiz Game — state

Milestone: M2 Question schema + validator — closed (DEC-002), awaiting commit + PR
Next: Adam commits the M2 close and opens one PR for M1+M2 (`v2/m1-foundations` → main); then a fresh session starts M6 Game feel
Milestones since review: 1

Tier: 3 System
Updated: 2026-10-18

## Done condition

English questions live in YAML under `content/`, a build step turns them into JSON
the game loads, and `pnpm verify` runs a validator that passes the cleaned English
bank and rejects seeded bad entries (duplicate, blank without choices, missing
`explain`, unreviewed, bad age range or level).

## Last session

- M2 schema + validator + plugin committed (680ea1d). `build/questionsPlugin.ts`
  serves YAML as `virtual:questions`; production drops drafts, dev keeps them.
- Legacy bank cleaned into `content/questions/en/`: 125 literacy + 44 numeracy, all
  `draft`. ~400 disguised sums dropped (M3 generates); "Spell x" rewritten as
  pick-the-spelling; ambiguous `c_t` gaps made choice with a clue; letter sounds
  dropped until read-aloud. Coverage stops around age 9 (legacy never went higher);
  `pickQuestion` falls back to nearest level then nearest age until M10.
- `src/game/questions.ts` now reads `virtual:questions` through an interim adapter
  for the one-text-box card: choices shown in the prompt (shuffled, new
  `Rng.shuffle`), true/false typed, ordering held back until M4; a miss shows
  `explain`. Duplicate check now keys on prompt + options. 61 tests, verify green,
  play-checked in the dev server. Committed (de29ee1).
- Decision to log at M2 close: REQ-CONT-001 is met by *excluding* drafts from
  production builds, not failing the build on them, so in-progress content never
  blocks a release. Invalid questions do fail the build.
- M1 closed (DEC-001): Vite + TS rebuild with `src/engine/` + `src/game/`, gameplay
  bugs fixed, speeds raised ~45% and signed off by Adam, hosting decided (Cloudflare
  Pages + Functions + D1). Committed and pushed on branch `v2/m1-foundations`
  (d474848, 5a30c83); no PR yet — Adam wants one PR at the end of M2.
- Verify green at close: typecheck, lint, 28 tests, build.

## M2 inputs (from project.md)

- Schema must carry: id, language, subject, age range (min/max within 4–11), level
  1–3, type (choice / true-false / typed / ordering), prompt, answer(s), choices,
  `explain`, `strictAccents` flag, review status.
- REQ-CONT-001 unreviewed never ships · REQ-CONT-002 any `__` blank must be choice ·
  REQ-ANS-001 accent-insensitive marking (already in `src/game/questions.ts`).
- Clean, don't port, `content/legacy/`: ~40% duplicates, 53 "Spell the word 'x'"
  questions that show their answer, difficulty barely rises with age, ÷ appears.
- Arithmetic generation is M3 — keep hand-written maths to word problems/reasoning.
- `src/game/questions.ts` is the interim picker; M2 replaces its data source but
  the question card UI stays as-is until M4.

## Open questions

- None blocking. For credits by M13: which assets did Adam's son draw?
- Question review deferred: all 169 English questions are `draft`, so a production
  build ships none. Review before any preview deploy is played (M13 at the latest).

## Live gotchas

- TypeScript pinned `~6.0.3` (typescript-eslint 8.x); `verify` calls tools directly
  (nested pnpm scripts race on Windows). See DEC-001 dead-ends.
- Use the Write/Edit tools for markdown or files with backticks; bash heredocs
  mangled them.
- box1/box2/box3.png are byte-identical; level shows only by number until M6.
