# Max and Zara's Quiz Game — state

Milestone: M6 Game feel (in progress, 6a–6d done)
Next: 6e side-by-side against the M1 build, then tune from Adam's play. Push/PR of `v2/m1-foundations` is on hold (Adam, 2026-10-18).
Milestones since review: 2

Tier: 3 System
Updated: 2026-10-18

## Done condition

M6 (from project.md): parallax, distinct box art per level, particles, streaks and
results stars are in, and a side-by-side play against the M1 build shows the
difference. Build order: M1 → M2 → M6 → M3 → M4 → …

M6 plan (approved 2026-10-18). Work inline; every step touches `render.ts`.
- [x] 6a `src/game/scoring.ts`: streak ×1.5 from 3, ×2 from 5; stars ★ any right,
  ★★ ≥60% and ≥4 answered, ★★★ ≥85% and ≥6. HUD streak pill, results stars.
- [x] 6b `src/engine/parallax.ts` + `src/game/scenery.ts`: background mirror-tiled
  and split at y=645 (water 0.2×, sand 1× with water pixels keyed out), code-drawn
  reefs at 0.3× and 0.45×, light beams breathing on `world.elapsed`. File untouched.
- [x] 6c `src/game/boxArt.ts`: box1 copies tinted at load (multiply + screen, cut
  back to the outline): wood / sea-green with a code-drawn shell / amber-gold with a
  shimmer sweep. 1–3 star pips replace the number. Render takes one `Art` bundle.
- [x] 6d `src/engine/particles.ts` + `src/game/effects.ts`, with their own RNG per
  round (never the round RNG; Daily Challenge). Splinters/bubbles on box hit,
  bubble trail, landing puff, sparkles and "+N" on a right answer, plankton.
  Reduced motion scales them to 35%. World now emits `landed` and the box hit's x/y;
  main.ts ends the round only on `timeUp` (was a catch-all `else`).
- [ ] 6e M1 build (`33e2441`, temp worktree) on a second port for side-by-side; tune.
M6 out of scope: new image/audio files, screen shake, crab frames, question card
(M4), menus (M5), deleting duplicate box2/box3.png.

## Last session

- M2 closed (DEC-002). The schema and validator are in `src/game/questionSchema.ts`.
  `build/questionsPlugin.ts` builds `content/questions/**.yaml` into
  `virtual:questions`. The English bank has 125 literacy + 44 numeracy questions,
  all `draft`. `content/legacy/` is deleted (still in git history).
- Verify green at wrap: typecheck, lint, 61 tests, build.

## Open questions

- 6a play-check: a perfect 3 of 3 gets only ★ (the ★★ minimum is 4 answered).
  Adam to judge whether that feels harsh at age 4.
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
