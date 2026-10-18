import { POINTS_PER_LEVEL, type Level } from './config';

/**
 * Round scoring: points per level, a streak multiplier for consecutive right
 * answers, and the end-of-round star rating. Pure, so the leaderboard's score
 * plausibility check (M8) can derive its ceiling from the same rules.
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

export interface AnswerResult {
  points: number;
  multiplier: number;
  /** Streak after this answer; 0 when it was wrong. */
  streak: number;
}

export class RoundScore {
  score = 0;
  streak = 0;
  bestStreak = 0;
  answered = 0;
  correct = 0;

  /** Multiplier the next right answer would earn. */
  get nextMultiplier(): number {
    return streakMultiplier(this.streak + 1);
  }

  answer(level: Level, right: boolean): AnswerResult {
    this.answered++;
    if (!right) {
      this.streak = 0;
      return { points: 0, multiplier: 1, streak: 0 };
    }
    this.correct++;
    this.streak++;
    this.bestStreak = Math.max(this.bestStreak, this.streak);
    const multiplier = streakMultiplier(this.streak);
    const points = Math.round(level * POINTS_PER_LEVEL * multiplier);
    this.score += points;
    return { points, multiplier, streak: this.streak };
  }

  get stars(): Stars {
    return starsFor(this.correct, this.answered);
  }
}
