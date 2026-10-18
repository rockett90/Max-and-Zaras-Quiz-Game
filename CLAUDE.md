# Max and Zara's Quiz Game

An underwater side-scroller educational quiz game for children aged 4–11. A crab
shoots bubbles at boxes; each box opens a literacy, numeracy or science question
pitched to the child's age. Multilingual (en, es, ro, fr, it), desktop and tablet,
with online leaderboards. Built by Adam for his children; meant to be good enough
for others.

## Start here

- **`dev-notes/state.md`** — read first, every session. Current milestone, what
  last session changed, the next action.
- `dev-notes/project.md` — objective, binding out-of-scope list, milestones,
  architecture and the decisions that set the shape.
- `dev-notes/memory.md` *(if present)* — gotchas not to repeat, key links.
- `dev-notes/log.md` *(if present)* — append-only decision log. Grep its index,
  read single entries; never read whole.

## Verify

```
verify: pnpm verify
```

Typecheck, lint, unit tests and production build (question-bank validation joins
from M2). Stops at the first failure.

## Invariants

1. **No personal data about children leaves the device.** Leaderboard identity is a
   generated nickname from fixed word lists — never free text, real names, email or
   tracking identifiers.
2. **Game logic runs on game time, never wall-clock or frame count.** Everything in
   `src/game/` advances only through the fixed-timestep `update(dt)` so speed is the
   same on 60 Hz and 144 Hz screens and pauses for free.
3. **The art is personal.** Adam's son drew some assets; the crab/logo was
   commissioned. Never replace, recolour or regenerate them without asking.

## Commands

- `pnpm dev` — Vite dev server on http://localhost:5173
- `pnpm test` — Vitest once; `pnpm test:watch` to watch

## Conventions

- pnpm, TypeScript strict, Vite, Vitest, ESLint flat config. No UI framework: canvas
  for the game world, plain DOM for menus and the question card.
- `src/engine/` is game-agnostic (loop, assets, input, viewport, rng); `src/game/` is
  this game. Engine code must not import from `src/game/`.
- Logical playfield is 1024×768, letterboxed to fit any screen.
- Randomness goes through the seeded RNG in `src/engine/rng.ts` (Daily Challenge
  depends on reproducible rounds).
- `content/legacy/` holds the original English JSON banks until M2 migrates them.
- Adam drives commits: stage and offer, never commit or push unprompted.
