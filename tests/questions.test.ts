import { describe, expect, it } from 'vitest';
import { Rng } from '../src/engine/rng';
import type { Question, TypedQuestion } from '../src/game/questionSchema';
import { answerText, cardText, isCorrect, normaliseAnswer, pickQuestion } from '../src/game/questions';

const base = { language: 'en', subject: 'literacy', explain: 'Because.', status: 'reviewed' } as const;

function q(id: string, ages: [number, number], level: 1 | 2 | 3, subject: 'literacy' | 'numeracy' = 'literacy'): TypedQuestion {
  return { ...base, subject, id, ages: { min: ages[0], max: ages[1] }, level, type: 'typed', prompt: id, answer: 'x', accept: [], strictAccents: false };
}

describe('pickQuestion', () => {
  it('finds a question for every age 4–11 and level from the real bank', () => {
    const rng = new Rng(5);
    for (let age = 4; age <= 11; age++) {
      for (const level of [1, 2, 3] as const) {
        expect(pickQuestion(age, level, rng), `age ${age} level ${level}`).toBeDefined();
      }
    }
  });

  it('prefers an exact match, then the nearest level, then the nearest age', () => {
    const bank = [q('exact', [5, 6], 2), q('level-off', [5, 6], 3), q('age-off', [7, 8], 2)];
    const rng = new Rng(1);
    for (let i = 0; i < 20; i++) expect(pickQuestion(6, 2, rng, bank, 0)?.id).toBe('exact');
    expect(pickQuestion(6, 1, rng, [q('l3', [6, 6], 3), q('l2', [6, 6], 2)], 0)?.id).toBe('l2');
    expect(pickQuestion(10, 2, rng, [q('age-7', [4, 7], 2), q('age-9', [8, 9], 1)], 0)?.id).toBe('age-9');
  });

  it('gives each subject a fair share however big its bank', () => {
    const bank = [...Array.from({ length: 50 }, (_, i) => q(`lit-${i}`, [4, 11], 1)), q('num', [4, 11], 1, 'numeracy')];
    const rng = new Rng(3);
    const numeracy = Array.from({ length: 400 }, () => pickQuestion(6, 1, rng, bank)).filter((p) => p?.subject === 'numeracy').length;
    expect(numeracy).toBeGreaterThan(150);
    expect(numeracy).toBeLessThan(250);
  });

  it('still offers generated sums from an empty bank (a production build before review)', () => {
    const rng = new Rng(1);
    for (let i = 0; i < 20; i++) expect(pickQuestion(6, 1, rng, [])?.id).toMatch(/^gen-/);
    expect(pickQuestion(6, 1, rng, [], 0)).toBeUndefined();
  });

  it('mixes generated sums with bank numeracy at the set share', () => {
    const bank = [q('num', [4, 11], 1, 'numeracy')];
    const rng = new Rng(4);
    const picks = Array.from({ length: 400 }, () => pickQuestion(6, 1, rng, bank, 0.5));
    const generated = picks.filter((p) => p?.id.startsWith('gen-')).length;
    expect(generated).toBeGreaterThan(150);
    expect(generated).toBeLessThan(250);
    expect(picks.every((p) => p?.subject === 'numeracy')).toBe(true);
  });
});

describe('marking', () => {
  it('normalises case, accents and spacing', () => {
    expect(normaliseAnswer('  Și  Ñu ')).toBe('si nu');
  });

  it('marks typed answers with alternatives, and strict accents when flagged', () => {
    const typed: TypedQuestion = { ...q('t', [4, 4], 1), answer: 'año', accept: ['year'] };
    expect(isCorrect(typed, ' ANO ')).toBe(true);
    expect(isCorrect(typed, 'Year')).toBe(true);
    expect(isCorrect(typed, 'ana')).toBe(false);
    const strict: TypedQuestion = { ...typed, strictAccents: true };
    expect(isCorrect(strict, 'Año')).toBe(true);
    expect(isCorrect(strict, 'ano')).toBe(false);
  });

  it('marks choice, true-false and ordering answers typed into the card', () => {
    const choice: Question = { ...base, id: 'c', ages: { min: 4, max: 4 }, level: 1, type: 'choice', prompt: 'Rhymes with cat?', answer: 'hat', choices: ['hat', 'dog'] };
    expect(isCorrect(choice, 'Hat')).toBe(true);
    expect(isCorrect(choice, 'dog')).toBe(false);

    const tf: Question = { ...base, id: 'tf', ages: { min: 4, max: 4 }, level: 1, type: 'true-false', prompt: 'K is a vowel.', answer: false };
    expect(isCorrect(tf, 'false')).toBe(true);
    expect(isCorrect(tf, 'No')).toBe(true);
    expect(isCorrect(tf, 'true')).toBe(false);
    expect(answerText(tf)).toBe('false');

    const order: Question = { ...base, id: 'o', ages: { min: 4, max: 4 }, level: 1, type: 'ordering', prompt: 'Order.', answer: ['ant', 'bee', 'cow'] };
    expect(isCorrect(order, 'Ant, bee ,cow')).toBe(true);
    expect(isCorrect(order, 'bee, ant, cow')).toBe(false);
  });

  it('shows every choice on the card, shuffled', () => {
    const choice: Question = { ...base, id: 'c', ages: { min: 4, max: 4 }, level: 1, type: 'choice', prompt: 'Pick.', answer: 'a', choices: ['a', 'b', 'c', 'd'] };
    const texts = new Set(Array.from({ length: 20 }, (_, i) => cardText(choice, new Rng(i))));
    expect(texts.size).toBeGreaterThan(1);
    for (const t of texts) expect([...t.matchAll(/[abcd]\b/g)]).toHaveLength(4);
  });
});
