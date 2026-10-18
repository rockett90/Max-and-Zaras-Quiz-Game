import { POINTS_PER_LEVEL, type Level } from './config';

/**
 * Round scoring: points per level, a streak multiplier for consecutive right
 * answers, a speed bonus, half points for a question's second chance, and the
 * end-of-round star rating. Pure, so the leaderboard's score plausibility check
 * (M8) can derive its ceiling from the same rules.
 */

/** Highest tier first. `from` counts the answer being scored. */
export const STREAK_TIERS = [
  { from: 5, multiplier: 2 },
  { from: 3, multiplier: 1.5 },
] as const;

/** Star thresholds, highest first. One star needs only a single right answer. */
export const STAR_TIERS = [
  { stars: 3, minAccuracy: 0.85, minAnswered: 6 },
  { stars: 2, minAccuracy: 0.6, minAnswered: 4 },
] as const;

/** Seconds per question by age, youngest band first (REQ-PLAY-002). */
export const TIME_LIMITS = [
  { maxAge: 5, seconds: 20 },
  { maxAge: 7, seconds: 15 },
  { maxAge: Infinity, seconds: 10 },
] as const;

/** Speed bonus as a share of the level points, and the head start that earns all of it (REQ-PLAY-003). */
export const SPEED_BONUS = { share: 0.5, fullUntil: 0.25 } as const;

/** A second chance is worth this share of the level points, with no speed bonus (REQ-PLAY-004). */
export const RETRY_SHARE = 0.5;

export type Stars = 0 | 1 | 2 | 3;

/** Multiplier for a right answer that brings the streak to `streak`. */
export function streakMultiplier(streak: number): number {
  return STREAK_TIERS.find((tier) => streak >= tier.from)?.multiplier ?? 1;
}

export function starsFor(correct: number, answered: number): Stars {
  if (correct === 0) return 0;
  const accuracy = correct / answered;
  const tier = STAR_TIERS.find((t) => answered >= t.minAnswered && accuracy >= t.minAccuracy);
  return tier?.stars ?? 1;
}

/** The question time limit for a child of this age, in seconds. */
export function timeLimitFor(age: number): number {
  return TIME_LIMITS.find((band) => age <= band.maxAge)?.seconds ?? 10;
}

/**
 * Bonus points for answering `level` in `seconds` of a `limit`-second question: the
 * full bonus within the first quarter, falling linearly to none at the limit.
 */
export function speedBonus(level: Level, seconds: number, limit: number): number {
  const full = level * POINTS_PER_LEVEL * SPEED_BONUS.share;
  const start = limit * SPEED_BONUS.fullUntil;
  const fraction = seconds <= start ? 1 : Math.max(0, (limit - seconds) / (limit - start));
  return Math.round(full * fraction);
}

export interface AnswerTiming {
  /** Game-time seconds the child took, not counting read-aloud. */
  seconds: number;
  limit: number;
}

export interface AnswerOptions {
  /** Earns a speed bonus when given and the answer is right. */
  timing?: AnswerTiming;
  /** The question's second chance: half points, no speed bonus, not counted again for stars. */
  retry?: boolean;
}

export interface AnswerResult {
  /** Everything this answer added to the score, speed bonus included. */
  points: number;
  multiplier: number;
  speedBonus: number;
  /** Streak after this answer; 0 when it was wrong. */
  streak: number;
}

export class RoundScore {
  score = 0;
  streak = 0;
  bestStreak = 0;
  /** First attempts only, so a second chance never changes the star rating. */
  answered = 0;
  correct = 0;

  /** Multiplier the next right answer would earn. */
  get nextMultiplier(): number {
    return streakMultiplier(this.streak + 1);
  }

  answer(level: Level, right: boolean, { timing, retry = false }: AnswerOptions = {}): AnswerResult {
    if (!retry) this.answered++;
    if (!right) {
      this.streak = 0;
      return { points: 0, multiplier: 1, speedBonus: 0, streak: 0 };
    }
    if (!retry) this.correct++;
    this.streak++;
    this.bestStreak = Math.max(this.bestStreak, this.streak);
    const multiplier = streakMultiplier(this.streak);
    const base = level * POINTS_PER_LEVEL * (retry ? RETRY_SHARE : 1);
    const bonus = timing && !retry ? speedBonus(level, timing.seconds, timing.limit) : 0;
    const points = Math.round(base * multiplier) + bonus;
    this.score += points;
    return { points, multiplier, speedBonus: bonus, streak: this.streak };
  }

  get stars(): Stars {
    return starsFor(this.correct, this.answered);
  }
}
