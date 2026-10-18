# Max and Zara's Quiz Game — state

Milestone: M4 Question card (not started)
Next: In a fresh session, plan M4 (plan-first): a real card for choice, true/false, typed and ordering answers, per-question timer with speed bonus (REQ-PLAY-002), explanations, second chance, end-of-round review, read-aloud
Milestones since review: 4

Tier: 3 System
Updated: 2026-10-18

## Done condition

M4 (from project.md): a playable round that exercises every answer type.
Build order: M1 → M2 → M6 → M3 → M4 → M5 → M7 → …

## Last session

- M3 Procedural maths generators closed (DEC-004, commit bb44de3).
  `src/game/arithmetic.ts` holds the curriculum table for age 4–11 × level 1–3.
  Sums use symbols only, so they need no translation. Ages ≤5 get multiple choice
  with near misses, older ages type the answer. `pickQuestion` makes 50% of
  numeracy picks generated (`GENERATED_SHARE`), and 100% when the bank has no
  numeracy.
- Verify green at wrap: typecheck, lint, 132 tests, build.
- Branch `v2/m1-foundations` holds the M1, M2, M6 and M3 commits. It is still
  unpushed with no PR. Adam put that on hold on 2026-10-18; ask before pushing.

## Open questions

- Question review deferred by Adam: all 169 bank questions are still `draft`, so a
  production build ships only generated sums. Review before any preview deploy is
  played (M13 at the latest).
- For credits by M13: which assets did Adam's son draw?
- After a play-test, retune the curriculum table, and pair it with the limits in
  `tests/arithmetic.test.ts`. Age 4 L3 can give `1 − 1`.

## Live gotchas

- TypeScript pinned `~6.0.3` (typescript-eslint 8.x); `verify` calls tools directly
  (nested pnpm scripts race on Windows). See DEC-001 dead-ends.
- Use the Write/Edit tools for markdown or files with backticks; bash heredocs
  mangled them.
- Vite 8 warns about extensionless imports under `configLoader: 'native'`. It's
  harmless for now, and adding `.ts` extensions fixes it if it ever becomes the default.
- Dev builds keep drafts and production drops them, so "works in `pnpm dev`" does
  not prove a production build has any bank questions.
- Gameplay randomness uses the round RNG only. Cosmetic code (effects, scenery) has
  its own RNG, or Daily Challenge rounds stop being reproducible.
- Handle `WorldEvent`s by naming each type; a catch-all `else` ends the round on
  any new event.
- The built-in browser pane throttles to about 2 fps, so the game clock looks slow
  there. Judge speed in a real browser. To check question picking quickly, import
  `/src/game/questions.ts` in the page console instead of shooting boxes.
- Generated choice questions show their options in the prompt until M4's card
  exists (`cardText`). Ordering questions are still excluded from play.
