import { describe, expect, it } from 'vitest';
import type { Question } from '../src/game/questionSchema';
import { REASK_AFTER, ReaskQueue } from '../src/game/reask';

function q(id: string): Question {
  return { id, language: 'en', subject: 'literacy', ages: { min: 5, max: 5 }, level: 1, type: 'true-false', prompt: id, answer: true, explain: '.', status: 'reviewed' };
}

describe('ReaskQueue', () => {
  it('brings a miss back after two other questions', () => {
    expect(REASK_AFTER).toBe(2);
    const queue = new ReaskQueue();
    queue.answered(q('a'), 2, false);
    expect(queue.due()).toBeUndefined();
    queue.answered(q('b'), 1, true);
    expect(queue.due()).toBeUndefined();
    queue.answered(q('c'), 1, true);
    expect(queue.due()?.question.id).toBe('a');
    expect(queue.due()?.level).toBe(2);
  });

  it('asks it only once, and records whether the second go was right', () => {
    const queue = new ReaskQueue();
    queue.answered(q('a'), 1, false);
    queue.answered(q('b'), 1, true);
    queue.answered(q('c'), 1, true);
    const due = queue.due();
    if (!due) throw new Error('expected a due question');
    queue.answered(due.question, due.level, true, due);
    expect(queue.due()).toBeUndefined();
    expect(queue.missed).toEqual([{ question: q('a'), level: 1, recovered: true }]);
  });

  it('never re-asks a miss on the second go', () => {
    const queue = new ReaskQueue();
    queue.answered(q('a'), 1, false);
    queue.answered(q('b'), 1, true);
    queue.answered(q('c'), 1, true);
    const due = queue.due();
    if (!due) throw new Error('expected a due question');
    queue.answered(due.question, due.level, false, due);
    for (const id of ['d', 'e', 'f']) queue.answered(q(id), 1, true);
    expect(queue.due()).toBeUndefined();
    expect(queue.missed).toHaveLength(1);
    expect(queue.missed[0]?.recovered).toBe(false);
  });

  it('counts a second go as one of the questions others wait for', () => {
    const queue = new ReaskQueue();
    queue.answered(q('a'), 1, false); // a waits 2
    queue.answered(q('b'), 1, false); // a 1, b waits 2
    queue.answered(q('c'), 1, true); // a 0, b 1
    const a = queue.due();
    expect(a?.question.id).toBe('a');
    if (!a) return;
    queue.answered(a.question, a.level, true, a); // b 0
    expect(queue.due()?.question.id).toBe('b');
  });

  it('keeps misses that never got their second go for the review', () => {
    const queue = new ReaskQueue();
    queue.answered(q('a'), 1, false);
    expect(queue.missed.map((m) => [m.question.id, m.recovered])).toEqual([['a', false]]);
  });
});
