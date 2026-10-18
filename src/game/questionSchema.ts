/**
 * The question schema and its validator (M2). Pure: takes already-parsed YAML
 * documents and returns typed questions plus every problem found, so it runs the
 * same in the Vite build plugin and in unit tests. The validator owns content
 * correctness — anything it lets through, the game trusts.
 *
 * Authoring format, one file per language × subject (content/questions/<lang>/<subject>.yaml):
 *
 *   language: en
 *   subject: literacy
 *   questions:
 *     - id: en-lit-rhyme-cat
 *       ages: 5-6          # or a single age: 5
 *       level: 2
 *       type: choice       # choice | true-false | typed | ordering
 *       prompt: Which word rhymes with cat?
 *       answer: hat
 *       choices: [hat, dog, sun]
 *       explain: Cat and hat both end in "at".
 *       status: reviewed   # draft | reviewed
 */
import { normaliseAnswer } from './text';

export const LANGUAGES = ['en', 'es', 'ro', 'fr', 'it'] as const;
export const SUBJECTS = ['literacy', 'numeracy', 'science'] as const;
export const QUESTION_TYPES = ['choice', 'true-false', 'typed', 'ordering'] as const;
export const STATUSES = ['draft', 'reviewed'] as const;

export const MIN_AGE = 4;
export const MAX_AGE = 11;
export const CHOICE_COUNT = { min: 2, max: 4 } as const;
export const ORDERING_COUNT = { min: 3, max: 6 } as const;
/** Typed answers shorter than this may legitimately appear in the prompt ("a", "is"). */
const LEAK_MIN_LENGTH = 3;

export type Language = (typeof LANGUAGES)[number];
export type Subject = (typeof SUBJECTS)[number];
export type QuestionType = (typeof QUESTION_TYPES)[number];
export type Status = (typeof STATUSES)[number];
export type QuestionLevel = 1 | 2 | 3;

interface QuestionBase {
  id: string;
  language: Language;
  subject: Subject;
  ages: { min: number; max: number };
  level: QuestionLevel;
  prompt: string;
  /** Shown after a wrong answer: why the right answer is right. */
  explain: string;
  status: Status;
}

export interface ChoiceQuestion extends QuestionBase {
  type: 'choice';
  answer: string;
  /** Includes the answer; the card shuffles them. */
  choices: string[];
}

export interface TrueFalseQuestion extends QuestionBase {
  type: 'true-false';
  answer: boolean;
}

export interface TypedQuestion extends QuestionBase {
  type: 'typed';
  answer: string;
  /** Other spellings that also score, e.g. "colour" / "color". */
  accept: string[];
  /** Accents must match exactly (REQ-ANS-001). */
  strictAccents: boolean;
}

export interface OrderingQuestion extends QuestionBase {
  type: 'ordering';
  /** The items in their correct order; the card shuffles them. */
  answer: string[];
}

export type Question = ChoiceQuestion | TrueFalseQuestion | TypedQuestion | OrderingQuestion;

export interface SourceFile {
  /** Path for messages only. */
  file: string;
  data: unknown;
}

export interface Issue {
  file: string;
  /** The question's id, or its index when the id is missing or broken. */
  where: string;
  message: string;
}

export interface ValidationResult {
  questions: Question[];
  issues: Issue[];
}

const ID_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const AGES_PATTERN = /^(\d+)\s*-\s*(\d+)$/;
const BLANK = '__';

const FILE_KEYS = new Set(['language', 'subject', 'questions']);
const BASE_KEYS = ['id', 'ages', 'level', 'type', 'prompt', 'answer', 'explain', 'status'];
const KEYS_BY_TYPE: Record<QuestionType, Set<string>> = {
  choice: new Set([...BASE_KEYS, 'choices']),
  'true-false': new Set(BASE_KEYS),
  typed: new Set([...BASE_KEYS, 'accept', 'strictAccents']),
  ordering: new Set(BASE_KEYS),
};

type Record_ = Record<string, unknown>;

function isRecord(value: unknown): value is Record_ {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isText(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '';
}

function isTextList(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(isText);
}

function includes<T extends string>(list: readonly T[], value: unknown): value is T {
  return typeof value === 'string' && (list as readonly string[]).includes(value);
}

function hasDuplicates(items: readonly string[]): boolean {
  return new Set(items.map(normaliseAnswer)).size !== items.length;
}

/**
 * Two questions are the same when their prompts match and, for choice and ordering,
 * so do their options: "Which is the right spelling?" over different words is fine.
 * Typed and true-false keep the prompt alone, as one prompt cannot have two answers.
 */
function sameQuestionKey(q: Question): string {
  const options = q.type === 'choice' ? q.choices : q.type === 'ordering' ? q.answer : [];
  return [q.prompt, ...[...options].sort()].map(normaliseAnswer).join('|');
}

function parseAges(value: unknown): { min: number; max: number } | undefined {
  let min: number;
  let max: number;
  if (typeof value === 'number') {
    min = max = value;
  } else if (typeof value === 'string' && AGES_PATTERN.test(value)) {
    const [, a, b] = AGES_PATTERN.exec(value) ?? [];
    min = Number(a);
    max = Number(b);
  } else {
    return undefined;
  }
  const valid = Number.isInteger(min) && Number.isInteger(max) && MIN_AGE <= min && min <= max && max <= MAX_AGE;
  return valid ? { min, max } : undefined;
}

/** True when `answer` appears as a whole word or phrase in `prompt` — the legacy "Spell 'cat'" fault. */
function promptGivesAway(prompt: string, answer: string): boolean {
  const needle = normaliseAnswer(answer);
  if (needle.length < LEAK_MIN_LENGTH) return false;
  const words = ` ${normaliseAnswer(prompt).replace(/[^\p{L}\p{N}]+/gu, ' ')} `;
  return words.includes(` ${needle} `);
}

function validateQuestion(raw: unknown, index: number, language: Language, subject: Subject, report: (where: string, message: string) => void): Question | undefined {
  if (!isRecord(raw)) {
    report(`#${index + 1}`, 'question must be a mapping');
    return undefined;
  }
  const where = isText(raw.id) ? raw.id : `#${index + 1}`;
  const problems: string[] = [];

  if (!isText(raw.id)) problems.push('missing id');
  else if (!ID_PATTERN.test(raw.id)) problems.push(`id "${raw.id}" must be lower-case words joined by hyphens`);

  const ages = parseAges(raw.ages);
  if (!ages) problems.push(`ages must be a single age or "min-max" within ${MIN_AGE}–${MAX_AGE}, got ${JSON.stringify(raw.ages)}`);

  if (raw.level !== 1 && raw.level !== 2 && raw.level !== 3) problems.push(`level must be 1, 2 or 3, got ${JSON.stringify(raw.level)}`);
  if (!isText(raw.prompt)) problems.push('missing prompt');
  if (!isText(raw.explain)) problems.push('missing explain');
  if (!includes(STATUSES, raw.status)) problems.push(`status must be one of ${STATUSES.join(', ')}`);

  if (!includes(QUESTION_TYPES, raw.type)) {
    problems.push(`type must be one of ${QUESTION_TYPES.join(', ')}`);
    problems.forEach((p) => report(where, p));
    return undefined;
  }
  const type = raw.type;

  for (const key of Object.keys(raw)) {
    if (!KEYS_BY_TYPE[type].has(key)) problems.push(`unknown field "${key}" for a ${type} question`);
  }

  const prompt = isText(raw.prompt) ? raw.prompt : '';
  if (prompt.includes(BLANK) && type !== 'choice') {
    problems.push(`a prompt with a blank (${BLANK}) must be a choice question (REQ-CONT-002)`);
  }

  switch (type) {
    case 'choice': {
      if (!isText(raw.answer)) problems.push('missing answer');
      if (!isTextList(raw.choices)) {
        problems.push('choices must be a list of text');
      } else {
        const n = raw.choices.length;
        if (n < CHOICE_COUNT.min || n > CHOICE_COUNT.max) problems.push(`needs ${CHOICE_COUNT.min}–${CHOICE_COUNT.max} choices, got ${n}`);
        if (hasDuplicates(raw.choices)) problems.push('choices repeat');
        if (isText(raw.answer)) {
          const answer = normaliseAnswer(raw.answer);
          if (!raw.choices.some((c) => normaliseAnswer(c) === answer)) problems.push(`answer "${raw.answer}" is not one of the choices`);
        }
      }
      break;
    }
    case 'true-false':
      if (typeof raw.answer !== 'boolean') problems.push('answer must be true or false');
      break;
    case 'typed': {
      if (!isText(raw.answer)) problems.push('missing answer');
      if (raw.accept !== undefined && !isTextList(raw.accept)) problems.push('accept must be a list of text');
      if (raw.strictAccents !== undefined && typeof raw.strictAccents !== 'boolean') problems.push('strictAccents must be true or false');
      const answers = [raw.answer, ...(Array.isArray(raw.accept) ? raw.accept : [])].filter(isText);
      if (answers.some((a) => promptGivesAway(prompt, a))) problems.push('the prompt contains its own answer');
      break;
    }
    case 'ordering': {
      if (!isTextList(raw.answer)) {
        problems.push('answer must be the items in their correct order');
      } else {
        const n = raw.answer.length;
        if (n < ORDERING_COUNT.min || n > ORDERING_COUNT.max) problems.push(`needs ${ORDERING_COUNT.min}–${ORDERING_COUNT.max} items, got ${n}`);
        if (hasDuplicates(raw.answer)) problems.push('items repeat');
      }
      break;
    }
  }

  if (problems.length > 0) {
    problems.forEach((p) => report(where, p));
    return undefined;
  }

  // Every field below was checked above; the casts only narrow what TypeScript can't follow.
  const base: QuestionBase = {
    id: raw.id as string,
    language,
    subject,
    ages: ages as { min: number; max: number },
    level: raw.level as QuestionLevel,
    prompt,
    explain: raw.explain as string,
    status: raw.status as Status,
  };
  switch (type) {
    case 'choice':
      return { ...base, type, answer: raw.answer as string, choices: raw.choices as string[] };
    case 'true-false':
      return { ...base, type, answer: raw.answer as boolean };
    case 'typed':
      return {
        ...base,
        type,
        answer: raw.answer as string,
        accept: (raw.accept as string[] | undefined) ?? [],
        strictAccents: (raw.strictAccents as boolean | undefined) ?? false,
      };
    case 'ordering':
      return { ...base, type, answer: raw.answer as string[] };
  }
}

/** Validate every content file together, so ids and prompts are checked for repeats across files. */
export function validateBank(files: readonly SourceFile[]): ValidationResult {
  const questions: Question[] = [];
  const issues: Issue[] = [];
  const idSeen = new Map<string, string>();
  const promptSeen = new Map<string, string>();

  for (const source of files) {
    const report = (where: string, message: string): void => {
      issues.push({ file: source.file, where, message });
    };
    const doc = source.data;
    if (!isRecord(doc)) {
      report('file', 'file must be a mapping with language, subject and questions');
      continue;
    }
    for (const key of Object.keys(doc)) {
      if (!FILE_KEYS.has(key)) report('file', `unknown field "${key}"`);
    }
    if (!includes(LANGUAGES, doc.language)) report('file', `language must be one of ${LANGUAGES.join(', ')}`);
    if (!includes(SUBJECTS, doc.subject)) report('file', `subject must be one of ${SUBJECTS.join(', ')}`);
    if (!Array.isArray(doc.questions)) report('file', 'questions must be a list');
    if (!includes(LANGUAGES, doc.language) || !includes(SUBJECTS, doc.subject) || !Array.isArray(doc.questions)) continue;

    const { language, subject } = doc;
    doc.questions.forEach((raw, index) => {
      const q = validateQuestion(raw, index, language, subject, report);
      if (!q) return;

      const firstFile = idSeen.get(q.id);
      if (firstFile !== undefined) {
        report(q.id, `duplicate id (first used in ${firstFile})`);
        return;
      }
      idSeen.set(q.id, source.file);

      const promptKey = `${language}|${sameQuestionKey(q)}`;
      const firstId = promptSeen.get(promptKey);
      if (firstId !== undefined) {
        report(q.id, `duplicate question (same as ${firstId}); widen that question's ages instead`);
        return;
      }
      promptSeen.set(promptKey, q.id);

      questions.push(q);
    });
  }
  return { questions, issues };
}

export function formatIssues(issues: readonly Issue[]): string {
  return issues.map((i) => `${i.file} [${i.where}] ${i.message}`).join('\n');
}
