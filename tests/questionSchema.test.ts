import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { stringify } from 'yaml';
import { buildQuestions, CONTENT_DIR, loadSourceFiles } from '../build/questionsPlugin';
import { validateBank } from '../src/game/questionSchema';

type Raw = Record<string, unknown>;

const good: Raw = {
  id: 'en-lit-rhyme-cat',
  ages: '5-6',
  level: 2,
  type: 'choice',
  prompt: 'Which word rhymes with cat?',
  answer: 'hat',
  choices: ['hat', 'dog', 'sun'],
  explain: 'Cat and hat both end in "at".',
  status: 'reviewed',
};

/** A one-file bank. The JSON round trip drops `undefined` keys, as YAML would never have them. */
function bank(...questions: Raw[]) {
  const data = JSON.parse(JSON.stringify({ language: 'en', subject: 'literacy', questions })) as unknown;
  return [{ file: 'en/literacy.yaml', data }];
}

/** The messages for a bank holding just this question. */
function problems(question: Raw): string[] {
  return validateBank(bank(question)).issues.map((i) => i.message);
}

describe('question validator', () => {
  it('passes the real content bank', () => {
    const { issues, questions } = validateBank(loadSourceFiles(CONTENT_DIR));
    expect(issues).toEqual([]);
    expect(questions.length).toBeGreaterThan(0);
  });

  it('accepts a good question and fills in language, subject and age range', () => {
    const { questions, issues } = validateBank(bank(good));
    expect(issues).toEqual([]);
    expect(questions[0]).toMatchObject({ language: 'en', subject: 'literacy', ages: { min: 5, max: 6 } });
  });

  it('accepts one of each type', () => {
    const { issues } = validateBank(
      bank(
        good,
        { ...good, id: 'tf', type: 'true-false', prompt: 'Cat rhymes with hat.', answer: true, choices: undefined },
        { ...good, id: 'typed', type: 'typed', prompt: 'Write the plural of mouse.', answer: 'mice', choices: undefined, strictAccents: false },
        { ...good, id: 'order', type: 'ordering', prompt: 'Put in order.', answer: ['one', 'two', 'three'], choices: undefined },
      ),
    );
    expect(issues).toEqual([]);
  });

  it('rejects a duplicate id and a duplicate prompt', () => {
    const { issues } = validateBank(bank(good, { ...good, prompt: 'Something else?' }, { ...good, id: 'other-id', prompt: '  which word RHYMES with cat? ' }));
    expect(issues.map((i) => i.message)).toEqual([expect.stringMatching(/duplicate id/), expect.stringMatching(/duplicate question/)]);
  });

  it('allows a repeated prompt over different choices, but not the same choices reordered', () => {
    const spelling = { ...good, prompt: 'Which is the right spelling?', answer: 'tree', choices: ['tree', 'tre', 'trea'] };
    const { issues } = validateBank(
      bank(spelling, { ...spelling, id: 'other', answer: 'book', choices: ['book', 'buk', 'bouk'] }, { ...spelling, id: 'reordered', choices: ['trea', 'tree', 'tre'] }),
    );
    expect(issues.map((i) => i.where)).toEqual(['reordered']);
  });

  it('rejects a blank that is not multiple choice (REQ-CONT-002)', () => {
    expect(problems({ ...good, type: 'typed', prompt: 'The cat sat on the __.', answer: 'mat', choices: undefined })).toEqual([expect.stringMatching(/blank/)]);
  });

  it('rejects a missing explain', () => {
    expect(problems({ ...good, explain: '  ' })).toEqual(['missing explain']);
  });

  it('rejects a missing or unknown review status', () => {
    expect(problems({ ...good, status: 'approved' })).toEqual([expect.stringMatching(/status/)]);
    expect(problems({ ...good, status: undefined })).toEqual([expect.stringMatching(/status/)]);
  });

  it.each([3, 12, '7-5', '4-12', 'five', 5.5])('rejects ages %j', (ages) => {
    expect(problems({ ...good, ages })).toEqual([expect.stringMatching(/ages/)]);
  });

  it('accepts a single age', () => {
    expect(problems({ ...good, ages: 11 })).toEqual([]);
  });

  it.each([0, 4, '2', undefined])('rejects level %j', (level) => {
    expect(problems({ ...good, level })).toEqual([expect.stringMatching(/level/)]);
  });

  it('rejects an answer missing from its choices, repeated choices and bad counts', () => {
    expect(problems({ ...good, answer: 'mat' })).toEqual([expect.stringMatching(/not one of the choices/)]);
    expect(problems({ ...good, choices: ['hat', 'Hat', 'dog'] })).toEqual([expect.stringMatching(/repeat/)]);
    expect(problems({ ...good, choices: ['hat'] })).toEqual([expect.stringMatching(/2–4 choices/)]);
  });

  it('rejects a typed prompt that gives its answer away (legacy "Spell the word")', () => {
    expect(problems({ ...good, type: 'typed', prompt: "Spell the word 'cat'.", answer: 'cat', choices: undefined })).toEqual([expect.stringMatching(/own answer/)]);
    // Short answers may appear naturally in a prompt.
    expect(problems({ ...good, type: 'typed', prompt: 'What is a baby cat called?', answer: 'kitten', accept: ['a'], choices: undefined })).toEqual([]);
  });

  it('rejects unknown fields so typos do not pass silently', () => {
    expect(problems({ ...good, explian: 'typo' })).toEqual([expect.stringMatching(/unknown field "explian"/)]);
    expect(problems({ ...good, type: 'true-false', answer: true })).toEqual([expect.stringMatching(/unknown field "choices"/)]);
  });

  it('rejects a true-false answer that is not a boolean', () => {
    expect(problems({ ...good, type: 'true-false', answer: 'yes', choices: undefined })).toEqual([expect.stringMatching(/true or false/)]);
  });

  it('rejects a bad file header', () => {
    const { issues } = validateBank([{ file: 'x.yaml', data: { language: 'de', subject: 'literacy', questions: [] } }]);
    expect(issues.map((i) => i.message)).toEqual([expect.stringMatching(/language/)]);
  });
});

describe('question build', () => {
  let dir = '';
  afterEach(() => {
    if (dir) rmSync(dir, { recursive: true, force: true });
  });

  function writeBank(...questions: Raw[]): string {
    dir = mkdtempSync(join(tmpdir(), 'quiz-questions-'));
    writeFileSync(join(dir, 'literacy.yaml'), stringify({ language: 'en', subject: 'literacy', questions }));
    return dir;
  }

  it('drops drafts from production builds only (REQ-CONT-001)', () => {
    const d = writeBank(good, { ...good, id: 'draft-one', prompt: 'Draft?', status: 'draft' });
    expect(buildQuestions(d, true).map((q) => q.id)).toEqual(['en-lit-rhyme-cat']);
    expect(buildQuestions(d, false)).toHaveLength(2);
  });

  it('fails the build on any invalid question', () => {
    const d = writeBank({ ...good, level: 4 });
    expect(() => buildQuestions(d, true)).toThrow(/level must be 1, 2 or 3/);
  });
});
