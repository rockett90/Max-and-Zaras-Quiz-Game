/**
 * Picks and marks questions from the validated bank (`virtual:questions`, built from
 * content/questions/ by build/questionsPlugin.ts).
 *
 * The question card is a single text box until M4, so this module adapts the richer
 * question types to it: choice and true-false list their options in the prompt and
 * are marked as typed answers; ordering waits for M4's drag-and-drop card.
 */
import bank from 'virtual:questions';
import type { Rng } from '../engine/rng';
import type { Level } from './config';
import type { Question } from './questionSchema';
import { normaliseAnswer } from './text';

export { normaliseAnswer };
export type { Question };

const PLAYABLE: readonly Question[] = bank.filter((q) => q.type !== 'ordering');

/** Age gaps outweigh level gaps when the bank has nothing exact. */
const AGE_WEIGHT = 10;

function distance(q: Question, age: number, level: Level): number {
  const ageGap = age < q.ages.min ? q.ages.min - age : age > q.ages.max ? age - q.ages.max : 0;
  return ageGap * AGE_WEIGHT + Math.abs(q.level - level);
}

/**
 * A question for this age and level. Picks a subject first so a large literacy bank
 * does not crowd out numeracy, then the closest match: exact when there is one,
 * otherwise the nearest level, then the nearest age. The fallback keeps every age
 * playable while content for ages 8–11 is thin (filled in M10).
 */
export function pickQuestion(age: number, level: Level, rng: Rng, questions: readonly Question[] = PLAYABLE): Question | undefined {
  if (questions.length === 0) return undefined;
  const subjects = [...new Set(questions.map((q) => q.subject))].sort();
  const subject = rng.pick(subjects);
  const inSubject = questions.filter((q) => q.subject === subject);
  const best = Math.min(...inSubject.map((q) => distance(q, age, level)));
  return rng.pick(inSubject.filter((q) => distance(q, age, level) === best));
}

/** The prompt as shown on the interim text-box card, with the options shuffled in. */
export function cardText(question: Question, rng: Rng): string {
  switch (question.type) {
    case 'choice':
      return `${question.prompt}  (${rng.shuffle([...question.choices]).join(' / ')})`;
    case 'true-false':
      return `${question.prompt}  (true or false?)`;
    case 'typed':
      return question.prompt;
    case 'ordering':
      return `${question.prompt}  (${rng.shuffle([...question.answer]).join(', ')})`;
  }
}

/** The correct answer as written, for feedback after a miss. */
export function answerText(question: Question): string {
  switch (question.type) {
    case 'true-false':
      return question.answer ? 'true' : 'false';
    case 'ordering':
      return question.answer.join(', ');
    default:
      return question.answer;
  }
}

const TRUE_WORDS = new Set(['true', 't', 'yes', 'y']);
const FALSE_WORDS = new Set(['false', 'f', 'no', 'n']);

/** Like normaliseAnswer but keeps accents, for `strictAccents` questions. */
function normaliseStrict(text: string): string {
  return text.normalize('NFC').toLowerCase().replace(/\s+/g, ' ').trim();
}

export function isCorrect(question: Question, given: string): boolean {
  const g = normaliseAnswer(given);
  switch (question.type) {
    case 'choice':
      return g === normaliseAnswer(question.answer);
    case 'true-false':
      return (question.answer ? TRUE_WORDS : FALSE_WORDS).has(g);
    case 'typed': {
      const norm = question.strictAccents ? normaliseStrict : normaliseAnswer;
      const typed = norm(given);
      return [question.answer, ...question.accept].some((a) => norm(a) === typed);
    }
    case 'ordering':
      return g.split(/\s*,\s*/).join(',') === question.answer.map(normaliseAnswer).join(',');
  }
}
