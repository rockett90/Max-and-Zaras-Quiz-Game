# Max and Zara's Quiz Game — decision log

Append-only. Newest entry first. Never edit or delete an entry; supersede it with a
new one ("DEC-007 supersedes DEC-003 …"). Grep the index, then read single entries.

## Index

- DEC-001 · 2026-10-18 · M1 Foundations — Vite + TS rebuild, Cloudflare hosting, speed tuning

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
