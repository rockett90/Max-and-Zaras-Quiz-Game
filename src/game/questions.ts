/**
 * Interim question source: the 2025 English banks, unchanged. M2 replaces this with
 * the validated YAML content pipeline; keep this module's surface small until then.
 */
import type { Rng } from '../engine/rng';
import literacy from '../../content/legacy/english_literacy.json';
import maths from '../../content/legacy/english_maths.json';
import type { Level } from './config';
import { normaliseAnswer } from './text';

export { normaliseAnswer };

export interface Question {
  age: number;
  level: number;
  question: string;
  answer: string;
}

const BANKS: readonly (readonly Question[])[] = [literacy, maths];

/** The legacy banks stop at age 10; 11-year-olds get the age-10 questions until M10. */
const LEGACY_MAX_AGE = 10;

export function pickQuestion(age: number, level: Level, rng: Rng): Question | undefined {
  const bank = rng.pick(BANKS);
  const bankAge = Math.min(age, LEGACY_MAX_AGE);
  const matches = bank.filter((q) => q.age === bankAge && q.level === level);
  return matches.length > 0 ? rng.pick(matches) : undefined;
}

export function isCorrect(question: Question, given: string): boolean {
  return normaliseAnswer(given) === normaliseAnswer(question.answer);
}
