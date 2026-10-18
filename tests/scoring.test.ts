import { describe, expect, it } from 'vitest';
import { RoundScore, starsFor, streakMultiplier } from '../src/game/scoring';

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
    expect(round.answer(2, false)).toEqual({ points: 0, multiplier: 1, streak: 0 });
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
});
