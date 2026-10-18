# Max and Zara's Quiz Game — state

Milestone: M6 Game feel (not started)
Next: Adam pushes `v2/m1-foundations` and opens one PR for M1+M2 → main; then, in a fresh session, plan M6 (parallax, distinct box art per level, particles, streaks, results stars)
Milestones since review: 2

Tier: 3 System
Updated: 2026-10-18

## Done condition

M6 (from project.md): parallax, distinct box art per level, particles, streaks and
results stars are in, and a side-by-side play against the M1 build shows the
difference. Build order: M1 → M2 → M6 → M3 → M4 → …

## Last session

- M2 closed (DEC-002). The schema and validator are in `src/game/questionSchema.ts`.
  `build/questionsPlugin.ts` builds `content/questions/**.yaml` into
  `virtual:questions`. The English bank has 125 literacy + 44 numeracy questions,
  all `draft`. `content/legacy/` is deleted (still in git history).
- Committed locally: 680ea1d, de29ee1, 79a9fca. Not pushed and no PR yet. Adam
  held off on both.
- Verify green at wrap: typecheck, lint, 61 tests, build.

## Open questions

- M6 box art: box1/2/3.png are byte-identical. Distinct per-level art touches the
  personal-art invariant, so ask Adam whether he or his son will draw the variants,
  or whether a tint/overlay on the existing box is acceptable.
- Question review deferred by Adam: all 169 questions are still `draft`, so a
  production build ships none. Review before any preview deploy is played (M13 at
  the latest).
- For credits by M13: which assets did Adam's son draw?

## Live gotchas

- TypeScript pinned `~6.0.3` (typescript-eslint 8.x); `verify` calls tools directly
  (nested pnpm scripts race on Windows). See DEC-001 dead-ends.
- Use the Write/Edit tools for markdown or files with backticks; bash heredocs
  mangled them.
- Vite 8 warns about extensionless imports under `configLoader: 'native'`. It's
  harmless for now, and adding `.ts` extensions fixes it if it ever becomes the default.
- Dev builds keep drafts and production drops them, so "works in `pnpm dev`" does
  not prove a production build has any questions.
