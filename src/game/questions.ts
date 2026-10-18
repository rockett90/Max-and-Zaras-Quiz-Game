/**
 * Picks and marks questions from the validated bank (`virtual:questions`, built from
 * content/questions/ by build/questionsPlugin.ts), mixed with generated arithmetic
 * (./arithmetic.ts).
 *
 * Marking takes an `Answer` shaped by the card that collected it (src/ui/card.ts).
 */
import bank from 'virtual:questions';
import type { Rng } from '../engine/rng';
import { generateQuestion } from './arithmetic';
import type { Level } from './config';
import type { Question } from './questionSchema';
import { normaliseAnswer } from './text';

export { normaliseAnswer };
export type { Question };

/** Every bank question; each type has a card to show it on. */
export const PLAYABLE: readonly Question[] = bank;

/** Age gaps outweigh level gaps when the bank has nothing exact. */
const AGE_WEIGHT = 10;

function distance(q: Question, age: number, level: Level): number {
  const ageGap = age < q.ages.min ? q.ages.min - age : age > q.ages.max ? age - q.ages.max : 0;
  return ageGap * AGE_WEIGHT + Math.abs(q.level - level);
}

/** Share of numeracy picks that are a generated sum rather than from the bank. */
export const GENERATED_SHARE = 0.5;

/**
 * A question for this age and level. Picks a subject first so a large literacy bank
 * does not crowd out numeracy, then the closest match: exact when there is one,
 * otherwise the nearest level, then the nearest age. The fallback keeps every age
 * playable while content for ages 8–11 is thin (filled in M10).
 *
 * Numeracy is always on offer while `generatedShare` is above zero: a share of its
 * picks are generated sums, and all of them are when the bank has no numeracy (a
 * production build before review).
 */
export function pickQuestion(age: number, level: Level, rng: Rng, questions: readonly Question[] = PLAYABLE, generatedShare = GENERATED_SHARE): Question | undefined {
  const subjects = new Set(questions.map((q) => q.subject));
  if (generatedShare > 0) subjects.add('numeracy');
  if (subjects.size === 0) return undefined;
  const subject = rng.pick([...subjects].sort());
  const inSubject = questions.filter((q) => q.subject === subject);
  if (subject === 'numeracy' && generatedShare > 0 && (inSubject.length === 0 || rng.chance(generatedShare))) {
    return generateQuestion(age, level, rng);
  }
  const best = Math.min(...inSubject.map((q) => distance(q, age, level)));
  return rng.pick(inSubject.filter((q) => distance(q, age, level) === best));
}

/** The correct answer as written, for feedback after a miss. */
export function answerText(question: Question): string {
  switch (question.type) {
    case 'true-false':
      return question.answer ? 'True' : 'False';
    case 'ordering':
      return question.answer.join(', ');
    default:
      return question.answer;
  }
}

/** What the child gave, in the shape of the card that collected it. */
export type Answer =
  | { type: 'choice'; choice: string }
  | { type: 'true-false'; value: boolean }
  | { type: 'typed'; text: string }
  | { type: 'ordering'; order: readonly string[] };

export interface Mark {
  right: boolean;
  /**
   * The accented spelling, when a right typed answer differed from it only by
   * accents (REQ-ANS-001): it scores, and the feedback shows how it is written.
   */
  spelling?: string;
}

/** Like normaliseAnswer but keeps accents. */
function normaliseStrict(text: string): string {
  return text.normalize('NFC').toLowerCase().replace(/\s+/g, ' ').trim();
}

/** Marks an answer. One from a different kind of card is simply wrong. */
export function mark(question: Question, answer: Answer): Mark {
  switch (question.type) {
    case 'choice':
      return { right: answer.type === 'choice' && normaliseAnswer(answer.choice) === normaliseAnswer(question.answer) };
    case 'true-false':
      return { right: answer.type === 'true-false' && answer.value === question.answer };
    case 'ordering': {
      const order = answer.type === 'ordering' ? answer.order.map(normaliseAnswer) : [];
      const expected = question.answer.map(normaliseAnswer);
      return { right: order.length === expected.length && order.every((item, i) => item === expected[i]) };
    }
    case 'typed': {
      if (answer.type !== 'typed') return { right: false };
      const accepted = [question.answer, ...question.accept];
      const exact = normaliseStrict(answer.text);
      if (accepted.some((a) => normaliseStrict(a) === exact)) return { right: true };
      if (question.strictAccents) return { right: false };
      const loose = normaliseAnswer(answer.text);
      const spelling = accepted.find((a) => normaliseAnswer(a) === loose);
      return spelling === undefined ? { right: false } : { right: true, spelling };
    }
  }
}
