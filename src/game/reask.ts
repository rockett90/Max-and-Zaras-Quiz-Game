import type { Level } from './config';
import type { Question } from './questionSchema';

/**
 * The in-round second chance (REQ-PLAY-004): a missed question comes back once,
 * after `REASK_AFTER` other questions, and every first-try miss is remembered for
 * the end-of-round review. Lives for one round only — nothing about a child's
 * answers persists (project.md out-of-scope).
 */

/** Other questions asked before a missed one comes back. */
export const REASK_AFTER = 2;

export interface Missed {
  question: Question;
  level: Level;
  /** Answered right on its second go. */
  recovered: boolean;
}

interface Pending {
  missed: Missed;
  /** Questions still to be asked before this one is due. */
  wait: number;
}

export class ReaskQueue {
  /** Every first-try miss this round, in the order they happened. */
  readonly missed: Missed[] = [];
  private pending: Pending[] = [];

  /** The question due for its second go, if any. Call before picking a fresh one. */
  due(): Missed | undefined {
    return this.pending.find((p) => p.wait <= 0)?.missed;
  }

  /**
   * Records an answered question. `retry` is the Missed entry when this was its
   * second go. Every answer counts as one "other question" for the rest waiting.
   */
  answered(question: Question, level: Level, right: boolean, retry?: Missed): void {
    for (const p of this.pending) p.wait--;
    if (retry) {
      this.pending = this.pending.filter((p) => p.missed !== retry);
      retry.recovered = right;
    } else if (!right) {
      const missed: Missed = { question, level, recovered: false };
      this.missed.push(missed);
      this.pending.push({ missed, wait: REASK_AFTER });
    }
  }
}
