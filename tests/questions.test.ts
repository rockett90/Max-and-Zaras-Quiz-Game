import { describe, expect, it } from 'vitest';
import { Rng } from '../src/engine/rng';
import { isCorrect, normaliseAnswer, pickQuestion } from '../src/game/questions';

describe('questions (legacy banks)', () => {
  it('finds a question for every age 4–11 and level', () => {
    const rng = new Rng(5);
    for (let age = 4; age <= 11; age++) {
      for (const level of [1, 2, 3] as const) {
        const q = pickQuestion(age, level, rng);
        expect(q, `age ${age} level ${level}`).toBeDefined();
        expect(q?.level).toBe(level);
      }
    }
  });

  it('marks answers ignoring case, accents and spacing', () => {
    expect(normaliseAnswer('  Și  Ñu ')).toBe('si nu');
    const q = { age: 4, level: 1, question: 'First letter of apple?', answer: 'A' };
    expect(isCorrect(q, 'a')).toBe(true);
    expect(isCorrect(q, ' A ')).toBe(true);
    expect(isCorrect(q, 'b')).toBe(false);
  });
});
