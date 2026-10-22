import { describe, expect, it } from 'vitest';
import { Rng } from '../src/engine/rng';
import type { Question, TypedQuestion } from '../src/game/questionSchema';
import { answerText, mark, normaliseAnswer, pickQuestion } from '../src/game/questions';

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

  it('skips questions already asked this round until the age has none left', () => {
    const bank = [q('a', [6, 6], 2), q('b', [6, 6], 2), q('level-off', [6, 6], 3), q('age-off', [7, 8], 2)];
    const rng = new Rng(2);
    const asked = new Set<string>();
    const picks = Array.from({ length: 3 }, () => {
      const id = pickQuestion(6, 2, rng, bank, 0, asked)?.id ?? '';
      asked.add(id);
      return id;
    });
    // Both exact matches first, then a fresh question a level away before any repeat.
    expect(new Set(picks.slice(0, 2))).toEqual(new Set(['a', 'b']));
    expect(picks[2]).toBe('level-off');
    // A question for another age is never preferred over a repeat; repeats start at the nearest level.
    asked.add('level-off');
    for (let i = 0; i < 20; i++) expect(['a', 'b']).toContain(pickQuestion(6, 2, rng, bank, 0, asked)?.id);
  });

  it('redraws a generated sum that was already asked', () => {
    // Age 4 level 1 has 10 sums: six plain draws repeat in about 85% of rounds.
    let roundsWithRepeat = 0;
    for (let seed = 1; seed <= 200; seed++) {
      const rng = new Rng(seed);
      const asked = new Set<string>();
      let repeated = false;
      for (let i = 0; i < 6; i++) {
        const id = pickQuestion(4, 1, rng, [], 1, asked)?.id ?? '';
        repeated ||= asked.has(id);
        asked.add(id);
      }
      if (repeated) roundsWithRepeat++;
    }
    expect(roundsWithRepeat).toBeLessThan(20);
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
    const type = (text: string) => ({ type: 'typed', text }) as const;
    expect(mark(typed, type(' AÑO '))).toEqual({ right: true });
    expect(mark(typed, type('Year'))).toEqual({ right: true });
    expect(mark(typed, type('ana'))).toEqual({ right: false });
    const strict: TypedQuestion = { ...typed, strictAccents: true };
    expect(mark(strict, type('Año'))).toEqual({ right: true });
    expect(mark(strict, type('ano'))).toEqual({ right: false });
  });

  it('scores a typed answer with missing accents but shows the accented spelling', () => {
    const typed: TypedQuestion = { ...q('t', [4, 4], 1), answer: 'año', accept: [] };
    expect(mark(typed, { type: 'typed', text: 'ano' })).toEqual({ right: true, spelling: 'año' });
    expect(mark(typed, { type: 'typed', text: 'äño' })).toEqual({ right: true, spelling: 'año' });
  });

  it('marks choice, true-false and ordering answers from their own cards', () => {
    const choice: Question = { ...base, id: 'c', ages: { min: 4, max: 4 }, level: 1, type: 'choice', prompt: 'Rhymes with cat?', answer: 'hat', choices: ['hat', 'dog'] };
    expect(mark(choice, { type: 'choice', choice: 'hat' }).right).toBe(true);
    expect(mark(choice, { type: 'choice', choice: 'dog' }).right).toBe(false);

    const tf: Question = { ...base, id: 'tf', ages: { min: 4, max: 4 }, level: 1, type: 'true-false', prompt: 'K is a vowel.', answer: false };
    expect(mark(tf, { type: 'true-false', value: false }).right).toBe(true);
    expect(mark(tf, { type: 'true-false', value: true }).right).toBe(false);
    expect(answerText(tf)).toBe('False');

    const order: Question = { ...base, id: 'o', ages: { min: 4, max: 4 }, level: 1, type: 'ordering', prompt: 'Order.', answer: ['ant', 'bee', 'cow'] };
    expect(mark(order, { type: 'ordering', order: ['ant', 'bee', 'cow'] }).right).toBe(true);
    expect(mark(order, { type: 'ordering', order: ['bee', 'ant', 'cow'] }).right).toBe(false);
    expect(mark(order, { type: 'ordering', order: ['ant', 'bee'] }).right).toBe(false);
  });

  it('marks an answer from the wrong kind of card as wrong', () => {
    const tf: Question = { ...base, id: 'tf', ages: { min: 4, max: 4 }, level: 1, type: 'true-false', prompt: 'K is a vowel.', answer: false };
    expect(mark(tf, { type: 'typed', text: 'false' }).right).toBe(false);
    expect(mark(q('t', [4, 4], 1), { type: 'choice', choice: 'x' }).right).toBe(false);
  });
});
