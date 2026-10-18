import { describe, expect, it } from 'vitest';
import { RoundScore, speedBonus, starsFor, streakMultiplier, timeLimitFor } from '../src/game/scoring';

describe('streakMultiplier', () => {
  it('is 1 below three in a row, 1.5 at three and four, 2 from five', () => {
    expect([1, 2, 3, 4, 5, 9].map(streakMultiplier)).toEqual([1, 1, 1.5, 1.5, 2, 2]);
  });
});

describe('starsFor', () => {
  it('gives no stars without a right answer', () => {
    expect(starsFor(0, 0)).toBe(0);
    expect(starsFor(0, 5)).toBe(0);
  });

  it('gives one star for any right answer', () => {
    expect(starsFor(1, 1)).toBe(1);
    expect(starsFor(1, 10)).toBe(1);
  });

  it('needs enough answers as well as accuracy for two and three stars', () => {
    expect(starsFor(3, 3)).toBe(1); // perfect but too few
    expect(starsFor(3, 4)).toBe(2); // 75%
    expect(starsFor(3, 5)).toBe(2); // 60% exactly
    expect(starsFor(5, 5)).toBe(2); // perfect, but under six answered
    expect(starsFor(6, 7)).toBe(3); // 86%
    expect(starsFor(5, 6)).toBe(2); // 83%
  });
});

describe('RoundScore', () => {
  it('scores level × 10 with the streak multiplier, rounded', () => {
    const round = new RoundScore();
    const points = [1, 1, 1, 1, 1, 3].map((level) => round.answer(level as 1 | 3, true).points);
    expect(points).toEqual([10, 10, 15, 15, 20, 60]);
    expect(round.score).toBe(130);
    expect(round.bestStreak).toBe(6);
  });

  it('resets the streak on a wrong answer but keeps the best', () => {
    const round = new RoundScore();
    for (let i = 0; i < 4; i++) round.answer(2, true);
    expect(round.answer(2, false)).toEqual({ points: 0, multiplier: 1, speedBonus: 0, streak: 0 });
    expect(round.answer(2, true).points).toBe(20);
    expect(round.bestStreak).toBe(4);
    expect([round.correct, round.answered]).toEqual([5, 6]);
  });

  it('reports the multiplier the next right answer would earn', () => {
    const round = new RoundScore();
    round.answer(1, true);
    expect(round.nextMultiplier).toBe(1);
    round.answer(1, true);
    expect(round.nextMultiplier).toBe(1.5);
  });

  it('adds the speed bonus after the streak multiplier', () => {
    const round = new RoundScore();
    round.answer(2, true);
    round.answer(2, true);
    // Third in a row: 20 × 1.5 = 30, plus the full bonus of 10.
    expect(round.answer(2, true, { timing: { seconds: 1, limit: 10 } })).toEqual({ points: 40, multiplier: 1.5, speedBonus: 10, streak: 3 });
  });

  it('gives a second chance half points, no speed bonus, and leaves the stars alone', () => {
    const round = new RoundScore();
    round.answer(2, false);
    const retry = round.answer(2, true, { retry: true, timing: { seconds: 0, limit: 10 } });
    expect(retry).toEqual({ points: 10, multiplier: 1, speedBonus: 0, streak: 1 });
    expect([round.correct, round.answered]).toEqual([0, 1]);
    round.answer(2, false, { retry: true });
    expect(round.answered).toBe(1);
  });
});

describe('timeLimitFor', () => {
  it('gives 20 s at 4–5, 15 s at 6–7 and 10 s at 8–11', () => {
    expect([4, 5, 6, 7, 8, 11].map(timeLimitFor)).toEqual([20, 20, 15, 15, 10, 10]);
  });
});

describe('speedBonus', () => {
  it('is half the level points in the first quarter of the limit', () => {
    expect(speedBonus(1, 0, 20)).toBe(5);
    expect(speedBonus(3, 5, 20)).toBe(15);
  });

  it('falls linearly to nothing at the limit', () => {
    expect(speedBonus(2, 12.5, 20)).toBe(5); // halfway through the sliding part
    expect(speedBonus(2, 20, 20)).toBe(0);
    expect(speedBonus(2, 25, 20)).toBe(0);
  });
});
