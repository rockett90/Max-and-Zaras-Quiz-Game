# Max and Zara's Quiz Game v2

**Tier:** 3 System · **Started:** 2026-10-18 · **Status:** in progress

Tier 3 because the work spans well over 8 sittings, and three hard escalators fire:
an online leaderboard for children (public API, persistent data, UK Children's Code),
a question schema that contributors and translators write against, and the
architecture choices below.

## 1. Objective

Turn the 2025 prototype (a ChatGPT-assisted vanilla JS canvas game with two
English JSON banks) into a proper educational game for ages 4–11 that children
want to replay. Keep the underwater crab side-scroller and the family's art. Ask
age-appropriate literacy, numeracy and science questions in English, Spanish,
Romanian, French and Italian, on desktop and tablet, with online leaderboards so
kids challenge themselves and each other.

## 2. Scope

TypeScript + Vite static frontend; touch and keyboard; scales to any screen;
translated UI in all five languages; local profiles and personal bests; a small
leaderboard server (API + SQLite); a Daily Challenge; three subjects × ages 4–11 ×
three levels × five languages; game feel (parallax, particles, streak bonus,
end-of-round stars). Learning loop (added 2026-10-18): an explanation on every wrong
answer, missed questions return once later in the same round, and an end-of-round
review of what was missed. Bilingual mode: questions shown in two languages, plus
translation questions between a child's languages.

**Out of scope — binding:**
- Accounts, logins, email, real names, free-text nicknames, chat, friends lists
- Teacher or classroom dashboards; progress reports for parents
- An adaptive learning engine — the child picks age; the game does not model mastery.
  The in-round second chance is the limit: nothing about performance persists
- App-store native apps, offline/PWA install, ads or monetisation
- Languages beyond the five; curricula other than the UK age bands
- Power-ups, worlds, unlockable crabs — candidates for v2.1 once M13 ships
- Sea Creature Collection and two-player same-device mode — proposed 2026-10-18,
  deferred by Adam to v2.1
- Recorded voice-over — browser speech synthesis only

## 3. Milestones

| # | Milestone | Done when | Status |
|---|-----------|-----------|--------|
| M1 | Foundations: Vite + TS, fixed-timestep loop, asset preloader, scaling canvas, `pnpm verify` | Current gameplay runs with flicker, frame-rate speed and list-splice bugs fixed; verify green | done 2026-10-18 (DEC-001) |
| M2 | Question schema + validator; YAML→JSON build; cleaned English banks migrated | Validator passes the cleaned bank and rejects seeded bad entries | done 2026-10-18 (DEC-002) |
| M3 | Procedural maths generators per age/level | Tests prove every generator's output range by age and level | done 2026-10-18 (DEC-004) |
| M4 | Question card: choice, true/false, typed, ordering; per-question timer with speed bonus; explanations, second chance, end-of-round review; read-aloud | Playable round exercising every answer type | |
| M5 | Menus + touch: language → nickname → age → subjects → play; translated UI strings | Full flow on a tablet-sized viewport, touch only | |
| M6 | Game feel: parallax, distinct box art per level, particles, streaks, results stars | Side-by-side play against the M1 build | done 2026-10-18 (DEC-003) |
| M7 | Local profiles and personal bests | Scores persist across reloads per profile | |
| M8 | Leaderboard API: Pages Functions + D1, rate limits, score plausibility, name word lists | API tests pass locally (wrangler) and on a preview deploy | |
| M9 | Leaderboard client, Daily Challenge, privacy page | Two devices see each other's scores; offline play still works | |
| M10 | English content: literacy + science, ages 4–11, levels 1–3 | Every age/subject/level combination meets its minimum count | |
| M11 | Spanish + Romanian content, native-reviewed | Validator reports 0 unreviewed questions live | |
| M12 | French + Italian content, native-reviewed | As M11 | |
| M14 | Bilingual mode: dual-language question display and translation questions for en↔es, en↔ro | Playable bilingual round for each pair; validator checks translation pairs | |
| M13 | Release: games.teamrockett.co.uk live (old /Quiz_Game path redirects), README, contributor guide | Release check passes on desktop and tablet | |

**Build order** (IDs are frozen; order changed 2026-10-18 so play-testing with the
kids is fun earlier): M1 → M2 → M6 → M3 → M4 → M5 → M7 → M8 → M9 → M10 → M11 →
M14 → M12 → M13.

Content (M10–M12) is the long pole; minimum 20 hand-written questions per age ×
subject × level. Native-speaker review is the bottleneck, not drafting.

## 4. Requirements

- REQ-PRIV-001 — No personal data is collected or transmitted; leaderboard names are
  generated from fixed per-language word lists. *(verify: API rejects any name not
  constructible from the lists; code review of every network call)*
- REQ-FAIR-001 — Leaderboards are partitioned by age so no child ranks against a
  different age; boards reset weekly. *(verify: API tests)*
- REQ-CONT-001 — A question marked unreviewed never reaches a production build.
  *(verify: validator fails the build)*
- REQ-PLAY-001 — Game speed is identical at any display refresh rate.
  *(verify: unit test stepping the world at 30, 60 and 144 Hz)*
- REQ-PLAY-002 — Each question has a time limit scaled by age: 20 s for ages 4–5,
  15 s for 6–7, 10 s for 8–11, shown as a shrinking bar. Faster correct answers earn
  a speed bonus; timing out counts as a miss and shows the answer. Rationale: a
  fixed 10 s fails pre-readers on every question. *(verify: unit tests on the
  limit and bonus functions; play-test with each age)*
- REQ-CONT-002 — Any question containing a blank (`__`) must be multiple choice;
  several words can fit a blank, so a typed answer cannot be marked fairly.
  *(verify: validator rejects it)*
- REQ-ANS-001 — Typed answers are marked ignoring case, spacing and accents. A
  correct answer with missing or wrong accents scores, but the feedback shows the
  accented spelling (e.g. año vs ano). Questions flagged `strictAccents` require
  them exactly. *(verify: unit tests)*

## 5. Architecture & decisions

- **Levels map to UK assessment bands.** 1 = working towards, 2 = expected standard,
  3 = greater depth for that age (Reception–Year 6). Ages are the child-facing choice
  because they are country-neutral.
- **Questions authored in YAML, built to JSON**, with an age *range* per question so
  good questions are not duplicated across ages, and an `explain` line used on wrong
  answers. The validator owns correctness.
- **Literacy is native per language; numeracy and science are translated;
  arithmetic is generated** in code so it never repeats. Rejected: translating
  English literacy (phonics and spelling do not translate).
- **No framework.** Canvas world + plain DOM menus. Rejected React/Phaser: the game
  is small, a framework would dwarf it, and plain DOM is easier to keep tidy here.
- **Fixed-timestep engine** (`src/engine/`) separated from game rules (`src/game/`),
  with a seeded RNG so a Daily Challenge round is reproducible for everyone.
- **Hosting is Cloudflare** (decided 2026-10-18; teamrockett.co.uk DNS is already on
  Cloudflare). The game is a Cloudflare Pages site built from the GitHub repo on
  every push to `main`, on the custom domain games.teamrockett.co.uk. The
  leaderboard is a Pages Function at `/api/*` on the same domain (same origin, so no
  CORS) backed by a Cloudflare D1 (SQLite) database. Pull requests get automatic
  preview URLs. Rejected: a VPS running Node (a server to patch and back up, for a
  few requests a day) and a separate API subdomain (adds CORS and a second deploy).
  Free tier covers expected traffic.

Delegation: content drafting per language (M10–M12) runs in parallel sessions once
the M2 schema is frozen; engine and gameplay work stays inline.

## 6. Risks

| Risk | Likelihood × impact | Mitigation |
|---|---|---|
| Native-speaker review stalls language milestones | H×H | Review flag per question; unreviewed never ships; English first so the game is complete without them |
| Children's privacy (UK Children's Code) | M×H | No personal data, generated names only, no tracking cookies, plain-English privacy page |
| Leaderboard cheating | H×M | Server-issued round tokens, per-round score ceilings, rate limits; good-enough for a family game |
| No speech voice for Romanian on some devices | M×L | Feature-detect; hide read-aloud; questions remain readable |
| Hand-drawn vs polished art clash | L×M | Style new UI around the son's drawings rather than over them |

## 7. Open questions

1. Which assets did Adam's son draw? (The rock with starfish is clearly his.) Needed
   for credits by M13.
