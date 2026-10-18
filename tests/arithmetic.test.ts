import { describe, expect, it } from 'vitest';
import { Rng } from '../src/engine/rng';
import { CHOICE_MAX_AGE, generateQuestion, generateSum, type Op } from '../src/game/arithmetic';
import { isCorrect } from '../src/game/questions';

const SEEDS = 500;

interface Limits {
  ops: Op[];
  /** Inclusive bounds on the answer. */
  answer: [number, number];
  /** Largest number shown in the prompt. */
  operand: number;
}

/**
 * The limits each age and level must keep, written independently of the curriculum
 * table in src/game/arithmetic.ts: retuning the table should mean deciding to change
 * these too.
 */
const LIMITS: Record<number, [Limits, Limits, Limits]> = {
  4: [
    { ops: ['add'], answer: [2, 5], operand: 4 },
    { ops: ['add'], answer: [2, 10], operand: 9 },
    { ops: ['add', 'sub'], answer: [0, 10], operand: 10 },
  ],
  5: [
    { ops: ['add', 'sub'], answer: [0, 10], operand: 10 },
    { ops: ['add', 'sub'], answer: [0, 20], operand: 20 },
    { ops: ['missing-add', 'missing-sub'], answer: [1, 20], operand: 20 },
  ],
  6: [
    { ops: ['add', 'sub'], answer: [0, 20], operand: 20 },
    { ops: ['add', 'sub', 'mul'], answer: [1, 100], operand: 99 },
    { ops: ['add', 'sub', 'missing-add', 'missing-sub'], answer: [0, 100], operand: 99 },
  ],
  7: [
    { ops: ['add', 'sub', 'mul'], answer: [0, 120], operand: 99 },
    { ops: ['mul', 'div'], answer: [1, 96], operand: 96 },
    { ops: ['add', 'sub'], answer: [0, 999], operand: 999 },
  ],
  8: [
    { ops: ['mul'], answer: [2, 100], operand: 10 },
    { ops: ['mul', 'div'], answer: [1, 144], operand: 144 },
    { ops: ['add', 'sub', 'mul'], answer: [0, 999], operand: 999 },
  ],
  9: [
    { ops: ['mul', 'div'], answer: [1, 144], operand: 144 },
    { ops: ['add', 'sub'], answer: [0, 9999], operand: 9999 },
    { ops: ['mul', 'div'], answer: [11, 891], operand: 891 },
  ],
  10: [
    { ops: ['add', 'sub', 'mul'], answer: [0, 9999], operand: 9999 },
    { ops: ['mul', 'div'], answer: [11, 9801], operand: 1188 },
    { ops: ['order', 'sub'], answer: [-29, 200], operand: 30 },
  ],
  11: [
    { ops: ['mul', 'div'], answer: [11, 9801], operand: 1188 },
    { ops: ['add', 'sub', 'order'], answer: [-40, 200], operand: 20 },
    { ops: ['square', 'mul'], answer: [4, 98901], operand: 999 },
  ],
};

const CELLS = Object.entries(LIMITS).flatMap(([age, levels]) => levels.map((limits, i) => ({ age: Number(age), level: (i + 1) as 1 | 2 | 3, limits })));

/** Only these cells teach negative numbers; everywhere else nothing goes below zero. */
const NEGATIVES = new Set(['10-3', '11-2']);

describe('generateSum ranges', () => {
  it.each(CELLS)('age $age level $level stays within its limits', ({ age, level, limits }) => {
    const rng = new Rng(age * 10 + level);
    const seen = new Set<Op>();
    for (let i = 0; i < SEEDS; i++) {
      const sum = generateSum(age, level, rng);
      const where = `${sum.prompt} → ${sum.answer}`;
      seen.add(sum.op);
      expect(limits.ops, where).toContain(sum.op);
      expect(Number.isInteger(sum.answer), where).toBe(true);
      expect(sum.answer, where).toBeGreaterThanOrEqual(limits.answer[0]);
      expect(sum.answer, where).toBeLessThanOrEqual(limits.answer[1]);
      for (const n of sum.operands) {
        expect(Number.isInteger(n), where).toBe(true);
        expect(Math.abs(n), where).toBeLessThanOrEqual(limits.operand);
        if (!NEGATIVES.has(`${age}-${level}`)) expect(n, where).toBeGreaterThanOrEqual(0);
      }
    }
    // Every op the cell promises actually turns up.
    expect([...seen].sort()).toEqual([...limits.ops].sort());
  });

  it('only negative-number cells ever give a negative answer', () => {
    for (const { age, level } of CELLS) {
      if (NEGATIVES.has(`${age}-${level}`)) continue;
      const rng = new Rng(age + level);
      for (let i = 0; i < SEEDS; i++) expect(generateSum(age, level, rng).answer).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('generateSum arithmetic', () => {
  /** Evaluate the prompt's expression with the "?" filled in, as an independent check. */
  function evaluate(prompt: string, answer: number): boolean {
    const filled = prompt.replace('?', `(${answer})`).replace(/−/g, '-').replace(/×/g, '*').replace(/÷/g, '/').replace(/(\d+)²/g, '($1*$1)');
    const [left, right] = filled.split('=');
    // Only digits, operators, brackets and spaces reach here.
    expect(filled).toMatch(/^[\d\s+\-*/()=]+$/);
    return Number(new Function(`return ${left}`)()) === Number(new Function(`return ${right}`)());
  }

  it.each(CELLS)('age $age level $level: every answer makes the prompt true', ({ age, level }) => {
    const rng = new Rng(1000 + age * 10 + level);
    for (let i = 0; i < SEEDS; i++) {
      const sum = generateSum(age, level, rng);
      expect(evaluate(sum.prompt, sum.answer), `${sum.prompt} → ${sum.answer}`).toBe(true);
      expect(evaluate(sum.working.replace(/\s+\(.*\)$/, '').split('=').slice(-2).join('='), 0), sum.working).toBe(true);
    }
  });

  it('division always comes out exact', () => {
    for (const { age, level, limits } of CELLS) {
      if (!limits.ops.includes('div')) continue;
      const rng = new Rng(age * level);
      for (let i = 0; i < SEEDS; i++) {
        const sum = generateSum(age, level, rng);
        if (sum.op !== 'div') continue;
        const [dividend, divisor] = sum.operands as [number, number];
        expect(dividend % divisor).toBe(0);
        expect(dividend / divisor).toBe(sum.answer);
      }
    }
  });
});

describe('generateQuestion', () => {
  it('replays the same questions from the same seed (Daily Challenge)', () => {
    const run = (seed: number) => {
      const rng = new Rng(seed);
      return CELLS.map(({ age, level }) => generateQuestion(age, level, rng));
    };
    expect(run(42)).toEqual(run(42));
    expect(run(42)).not.toEqual(run(43));
  });

  it('is multiple choice with near misses for the youngest, typed after', () => {
    for (const { age, level } of CELLS) {
      const rng = new Rng(age + 7 * level);
      for (let i = 0; i < 100; i++) {
        const q = generateQuestion(age, level, rng);
        expect(q.subject).toBe('numeracy');
        expect(q.status).toBe('reviewed');
        expect(q.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
        if (age <= CHOICE_MAX_AGE) {
          if (q.type !== 'choice') throw new Error(`age ${age} got ${q.type}`);
          expect(q.choices).toHaveLength(3);
          expect(new Set(q.choices).size).toBe(3);
          expect(q.choices).toContain(q.answer);
          for (const c of q.choices) {
            expect(Number(c)).toBeGreaterThanOrEqual(0);
            expect(Math.abs(Number(c) - Number(q.answer))).toBeLessThanOrEqual(2);
          }
        } else {
          expect(q.type).toBe('typed');
        }
      }
    }
  });

  it('marks a negative answer typed with a hyphen or a minus sign', () => {
    const rng = new Rng(9);
    let q = generateQuestion(11, 2, rng);
    while (!q.answer.toString().startsWith('-')) q = generateQuestion(11, 2, rng);
    const n = q.answer.toString().slice(1);
    expect(isCorrect(q, `-${n}`)).toBe(true);
    expect(isCorrect(q, `−${n}`)).toBe(true);
    expect(isCorrect(q, n)).toBe(false);
  });
});
