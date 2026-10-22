# Max and Zara's Quiz Game — state

Milestone: M15 Games monorepo (not started)
Next: Run /phase-gate (due), then plan M15 (plan-first): merge v2/m1-foundations to main, rename the repo games, git mv the game to games/<path>/, pnpm workspace, Astro hub at /, one Pages build
Milestones since review: 5

Tier: 3 System
Updated: 2026-10-22

## Done condition

M15 (from project.md): verify green across the workspace; a preview deploy serves
the hub at `/` and the game at its path; `git log --follow` traces moved files.
Build order: M1 → M2 → M6 → M3 → M4 → M15 → M5 → M7 → …

## Last session

- M4 Question card closed (DEC-005). It has cards for choice, true/false, typed and
  ordering, a game-time timer with speed bonus, a second go, the end-of-round review
  and read-aloud. A play-test of every answer type passed in the browser pane.
- The play-test found questions repeating within a round. `pickQuestion` now takes
  `asked` (ids asked this round, kept in `main.ts`) and skips them until the age's
  pool is used up. Generated sums redraw up to 5 times.
- Verify green at wrap: typecheck, lint, 153 tests, build.
- Branch `v2/m1-foundations` tracks origin, 18 commits ahead, with no PR. The M4
  close-out is staged but not committed. M15 merges it to main; ask before pushing.

## Open questions

- Game path on games.teamrockett.co.uk: `/quiz/` or `/max-and-zara/`? It also sets
  the workspace folder and `/api/<slug>/`. M15 needs the answer before it starts.
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
- Dev builds keep drafts and production drops them, so "works in `pnpm dev`" does
  not prove a production build has any bank questions.
- Gameplay randomness uses the round RNG only. Cosmetic code (effects, scenery) has
  its own RNG, or Daily Challenge rounds stop being reproducible.
- Handle `WorldEvent`s by naming each type; a catch-all `else` ends the round on
  any new event.
- The built-in browser pane runs at about 1.5 fps. To play-test there, run
  `window.requestAnimationFrame = (cb) => setTimeout(() => cb(performance.now()), 16)`
  in the page console. Keep `javascript_tool` calls under 45 s; longer ones time
  out and may run twice.
- Dev-only `?type=choice|true-false|typed|ordering` asks one type. True/false
  exists only at level 2, so only two-star boxes ask it. The crab must jump
  (Space) over seaweed and rocks, or it stops dead.
