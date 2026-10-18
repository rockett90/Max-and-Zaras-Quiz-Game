# Max and Zara's Quiz Game — state

Milestone: M3 Procedural maths generators (not started)
Next: In a fresh session, plan M3 (plan-first): arithmetic generators per age 4–11 × level 1–3, seeded through `src/engine/rng.ts`, wired into `pickQuestion`
Milestones since review: 3

Tier: 3 System
Updated: 2026-10-18

## Done condition

M3 (from project.md): tests prove every generator's output range by age and level.
Build order: M1 → M2 → M6 → M3 → M4 → M5 → M7 → …

## Last session

- M6 Game feel closed (DEC-003): streak scoring and stars (`src/game/scoring.ts`),
  parallax scenery, tinted box per level, particles and effects. Adam signed it off
  after a side-by-side against M1. The M1 worktree is removed.
- Verify green at wrap: typecheck, lint, 78 tests, build.
- Branch `v2/m1-foundations` holds M1, M2 and M6 commits and is still unpushed with
  no PR. Adam put that on hold on 2026-10-18; ask before pushing.

## Open questions

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
- Gameplay randomness uses the round RNG only. Cosmetic code (effects, scenery) has
  its own RNG, or Daily Challenge rounds stop being reproducible.
- Handle `WorldEvent`s by naming each type; a catch-all `else` ends the round on
  any new event.
- The built-in browser pane throttles to about 2 fps, so the game clock looks slow
  there. Judge speed in a real browser.
