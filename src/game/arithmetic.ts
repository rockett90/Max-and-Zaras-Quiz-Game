/**
 * Generated arithmetic (M3). Sums are made in code rather than authored, so they
 * never repeat and scale with age; the hand-written numeracy bank keeps counting,
 * shapes and patterns.
 *
 * Prompts and working use symbols only ("7 + 5 = ?"), so one generator serves every
 * language. All randomness comes from the round RNG passed in, so a Daily Challenge
 * seed replays the same sums.
 */
import type { Rng } from '../engine/rng';
import type { Level } from './config';
import type { Language, Question } from './questionSchema';

export type Op = 'add' | 'sub' | 'mul' | 'div' | 'missing-add' | 'missing-sub' | 'order' | 'square';

export interface Sum {
  op: Op;
  /** Every number shown in the prompt. */
  operands: number[];
  answer: number;
  prompt: string;
  /** The worked line shown after a miss. */
  working: string;
}

type Range = readonly [min: number, max: number];
type Recipe = (rng: Rng) => Sum;

/** Up to this age the sums are multiple choice: typing is hard for pre-readers. */
export const CHOICE_MAX_AGE = 5;

const MINUS = '−';

/** A number as shown; a negative one after an operator goes in brackets: 5 − (−3). */
function show(n: number, first = true): string {
  if (n >= 0) return String(n);
  return first ? `${MINUS}${-n}` : `(${MINUS}${-n})`;
}

function span(min: number, max: number): number[] {
  return Array.from({ length: max - min + 1 }, (_, i) => min + i);
}

function simple(op: Op, x: number, sign: string, y: number, answer: number): Sum {
  const expr = `${show(x)} ${sign} ${show(y, false)}`;
  return { op, operands: [x, y], answer, prompt: `${expr} = ?`, working: `${expr} = ${show(answer)}` };
}

/** a + b, with the total capped. */
function add(a: Range, b: Range, maxSum = Infinity): Recipe {
  return (rng) => {
    const x = rng.int(a[0], Math.min(a[1], maxSum - b[0]));
    const y = rng.int(b[0], Math.min(b[1], maxSum - x));
    return simple('add', x, '+', y, x + y);
  };
}

/** a − b, never below zero. */
function sub(a: Range, b: Range): Recipe {
  return (rng) => {
    const x = rng.int(Math.max(a[0], b[0]), a[1]);
    const y = rng.int(b[0], Math.min(b[1], x));
    return simple('sub', x, MINUS, y, x - y);
  };
}

/** a + b or a − b where either may be negative, and so may the answer. */
function signed(a: Range, b: Range, ops: readonly ('add' | 'sub')[]): Recipe {
  return (rng) => {
    const x = rng.int(a[0], a[1]);
    const y = rng.int(b[0], b[1]);
    return rng.pick(ops) === 'add' ? simple('add', x, '+', y, x + y) : simple('sub', x, MINUS, y, x - y);
  };
}

/** A times-table fact, the table number on either side. */
function times(tables: readonly number[], by: Range): Recipe {
  return (rng) => {
    const t = rng.pick(tables);
    const n = rng.int(by[0], by[1]);
    const [x, y] = rng.chance(0.5) ? [t, n] : [n, t];
    return simple('mul', x, '×', y, x * y);
  };
}

function mul(a: Range, b: Range): Recipe {
  return (rng) => {
    const x = rng.int(a[0], a[1]);
    const y = rng.int(b[0], b[1]);
    return simple('mul', x, '×', y, x * y);
  };
}

/** Always exact: the dividend is built from divisor × quotient. */
function divide(divisors: readonly number[], quotient: Range): Recipe {
  return (rng) => {
    const d = rng.pick(divisors);
    const q = rng.int(quotient[0], quotient[1]);
    const sum = simple('div', d * q, '÷', d, q);
    return { ...sum, working: `${sum.working}  (${d} × ${q} = ${d * q})` };
  };
}

/** ? + b = c or a + ? = c, total at most max. */
function missingAdd(max: number): Recipe {
  return (rng) => {
    const x = rng.int(1, max - 1);
    const y = rng.int(1, max - x);
    const hideFirst = rng.chance(0.5);
    const [shown, answer] = hideFirst ? [y, x] : [x, y];
    const prompt = hideFirst ? `? + ${y} = ${x + y}` : `${x} + ? = ${x + y}`;
    return { op: 'missing-add', operands: [shown, x + y], answer, prompt, working: `${x} + ${y} = ${x + y}` };
  };
}

/** ? − b = c or a − ? = c, start at most max. */
function missingSub(max: number): Recipe {
  return (rng) => {
    const x = rng.int(2, max);
    const y = rng.int(1, x - 1);
    const hideFirst = rng.chance(0.5);
    const [shown, answer] = hideFirst ? [y, x] : [x, y];
    const prompt = hideFirst ? `? ${MINUS} ${y} = ${x - y}` : `${x} ${MINUS} ? = ${x - y}`;
    return { op: 'missing-sub', operands: [shown, x - y], answer, prompt, working: `${x} ${MINUS} ${y} = ${x - y}` };
  };
}

/** Order of operations: multiplication first, unless brackets say otherwise. */
function order(): Recipe {
  return (rng) => {
    const form = rng.int(0, 2);
    if (form === 0) {
      const [a, b, c] = [rng.int(1, 20), rng.int(2, 12), rng.int(2, 12)];
      const expr = `${a} + ${b} × ${c}`;
      return { op: 'order', operands: [a, b, c], answer: a + b * c, prompt: `${expr} = ?`, working: `${expr} = ${a} + ${b * c} = ${a + b * c}` };
    }
    if (form === 1) {
      const [a, b] = [rng.int(2, 12), rng.int(2, 12)];
      const c = rng.int(1, Math.min(20, a * b));
      const expr = `${a} × ${b} ${MINUS} ${c}`;
      return { op: 'order', operands: [a, b, c], answer: a * b - c, prompt: `${expr} = ?`, working: `${expr} = ${a * b} ${MINUS} ${c} = ${a * b - c}` };
    }
    const [a, b, c] = [rng.int(1, 10), rng.int(1, 10), rng.int(2, 10)];
    const expr = `(${a} + ${b}) × ${c}`;
    return { op: 'order', operands: [a, b, c], answer: (a + b) * c, prompt: `${expr} = ?`, working: `${expr} = ${a + b} × ${c} = ${(a + b) * c}` };
  };
}

function square(base: Range): Recipe {
  return (rng) => {
    const n = rng.int(base[0], base[1]);
    return { op: 'square', operands: [n], answer: n * n, prompt: `${n}² = ?`, working: `${n}² = ${n} × ${n} = ${n * n}` };
  };
}

/**
 * What each age gets at each level, after the UK bands (1 = working towards,
 * 2 = expected, 3 = greater depth; age 4 is Reception, 10–11 is Year 6). Retune
 * here after play-testing; tests/arithmetic.test.ts holds the limits it must keep.
 */
const CURRICULUM: Readonly<Record<number, readonly [Recipe[], Recipe[], Recipe[]]>> = {
  4: [
    [add([1, 4], [1, 4], 5)],
    [add([1, 9], [1, 9], 10)],
    [add([1, 9], [1, 9], 10), sub([1, 10], [1, 10])],
  ],
  5: [
    [add([1, 9], [1, 9], 10), sub([1, 10], [1, 10])],
    [add([1, 19], [1, 19], 20), sub([1, 20], [1, 20])],
    [missingAdd(20), missingSub(20)],
  ],
  6: [
    [add([1, 19], [1, 19], 20), sub([1, 20], [1, 20])],
    [add([10, 89], [1, 9]), sub([11, 99], [1, 9]), times([2, 5, 10], [1, 10])],
    [add([10, 89], [10, 89], 100), sub([20, 99], [10, 99]), missingAdd(50), missingSub(50)],
  ],
  7: [
    [add([10, 89], [10, 89], 100), sub([20, 99], [10, 99]), times([2, 5, 10], [1, 12])],
    [times([3, 4, 8], [1, 12]), divide([3, 4, 8], [1, 12])],
    [add([100, 899], [100, 899], 999), sub([200, 999], [100, 999])],
  ],
  8: [
    [times(span(2, 10), [1, 10])],
    [times(span(2, 12), [1, 12]), divide(span(2, 12), [1, 12])],
    [add([100, 899], [100, 899], 999), sub([200, 999], [100, 999]), mul([12, 99], [2, 9])],
  ],
  9: [
    [times(span(2, 12), [1, 12]), divide(span(2, 12), [1, 12])],
    [add([1000, 8999], [1000, 8999], 9999), sub([2000, 9999], [1000, 9999])],
    [mul([12, 99], [2, 9]), divide(span(2, 9), [11, 99])],
  ],
  10: [
    [add([1000, 8999], [1000, 8999], 9999), sub([2000, 9999], [1000, 9999]), mul([12, 99], [2, 9])],
    [mul([11, 99], [11, 99]), divide(span(2, 12), [11, 99])],
    [order(), signed([1, 20], [1, 30], ['sub'])],
  ],
  11: [
    [mul([11, 99], [11, 99]), divide(span(2, 12), [11, 99])],
    [signed([-20, 20], [-20, 20], ['add', 'sub']), order()],
    [square([2, 15]), mul([100, 999], [11, 99])],
  ],
};

/** A sum for this age and level; ages outside 4–11 get the nearest. */
export function generateSum(age: number, level: Level, rng: Rng): Sum {
  const clamped = Math.min(11, Math.max(4, Math.round(age)));
  const recipes = CURRICULUM[clamped]?.[level - 1];
  if (!recipes) throw new Error(`no arithmetic for age ${clamped} level ${level}`);
  return rng.pick(recipes)(rng);
}

/** Two wrong options within 2 of the answer, never negative. */
function nearMisses(answer: number, rng: Rng): string[] {
  const near = [answer - 2, answer - 1, answer + 1, answer + 2].filter((n) => n >= 0);
  return rng.shuffle(near).slice(0, 2).map(String);
}

/** A generated sum as a question: multiple choice for the youngest, typed after. */
export function generateQuestion(age: number, level: Level, rng: Rng, language: Language = 'en'): Question {
  const sum = generateSum(age, level, rng);
  const base = {
    id: `gen-${sum.op}-${sum.operands.map((n) => (n < 0 ? `m${-n}` : n)).join('-')}`,
    language,
    subject: 'numeracy',
    ages: { min: age, max: age },
    level,
    prompt: sum.prompt,
    explain: sum.working,
    // The generator is the reviewed source; there is nothing to review per sum.
    status: 'reviewed',
  } as const;
  const answer = String(sum.answer);
  if (age <= CHOICE_MAX_AGE) {
    return { ...base, type: 'choice', answer, choices: [answer, ...nearMisses(sum.answer, rng)] };
  }
  // Accept the typographic minus as well as the hyphen a keyboard types.
  const accept = sum.answer < 0 ? [show(sum.answer)] : [];
  return { ...base, type: 'typed', answer, accept, strictAccents: false };
}
