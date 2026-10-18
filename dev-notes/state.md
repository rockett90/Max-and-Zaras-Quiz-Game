# Max and Zara's Quiz Game — state

Milestone: M1 Foundations (done condition met; awaiting Adam's play-test and /wrap)
Next: Adam re-tests the faster speeds; on /wrap, start M2 (schema must include explain, choices-required-for-blanks, strictAccents)
Milestones since review: 0

Tier: 3 System
Updated: 2026-10-18

## Done condition

The existing gameplay (move, jump, shoot boxes, answer a question, 2-minute round,
results) runs from `pnpm dev` with the per-frame image reloads, refresh-rate-dependent
speed and splice-in-loop bugs fixed, and `pnpm verify` is green.

## Last session

- Replaced the vanilla prototype with Vite + TypeScript: `src/engine/` (fixed-step
  loop, seeded RNG, preloader, keyboard, letterbox fit) and `src/game/` (pure World
  simulation, renderer, legacy question picker). Legacy banks moved to `content/legacy/`.
- Gameplay fixes: preloaded assets, game-time timer that pauses for questions and
  hidden tabs, Enter submits, answer box focused, right/wrong feedback, accent-
  insensitive marking, tap-to-continue splash, Play again without a page reload,
  age 11 added (uses age-10 legacy questions).
- Verify green: typecheck, lint, 28 tests (incl. REQ-PLAY-001 at 30–240 Hz), build.
  Browser-tested a full round end to end at desktop and phone sizes.
- After Adam's play-test: speeds raised ~45% (config.ts). Plan updated: per-question
  timer (REQ-PLAY-002), blanks must be choice (REQ-CONT-002), accent feedback
  (REQ-ANS-001), learning loop in M4, new M14 bilingual mode, M6 moved after M2.

## Open questions

- None blocking M2. Hosting decided: Cloudflare Pages + Functions + D1 (project.md §5).
  games.teamrockett.co.uk currently has no DNS record; the old game is offline.

## Live gotchas

- pnpm 11 re-runs a deps check on every nested `pnpm <script>`; nested calls raced
  on `node_modules/.pnpm/lock.yaml` (EPERM). `verify` calls the tools directly.
- TypeScript is pinned `~6.0.3`: typescript-eslint 8.x does not support TS 7 yet.
- Measure the fixed `#viewport` box, never `window.innerWidth`: on mobile the unscaled
  1024px stage widens the layout viewport (seen as innerWidth 1024 on a 375 screen).
- Legacy banks are ~40% duplicates and barely scale with age; clean, don't port, in M2.
- box1/box2/box3.png are byte-identical; level shows only by number until M6.
