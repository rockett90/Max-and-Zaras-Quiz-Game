/**
 * The question card: plain DOM over the paused game. Builds the answer controls for
 * each question type, runs the per-question timer on game time (fed through
 * `tick`), and hands back an Answer — or nothing when time runs out. Marking and
 * scoring stay with the caller; the card only shows the result it is told.
 */
import type { Rng } from '../engine/rng';
import { mark, type Answer, type Question } from '../game/questions';

/** Under this share of the time left, the bar turns to its warning colour. */
const WARN_SHARE = 0.25;

export interface Submission {
  /** Undefined when the time ran out. */
  answer: Answer | undefined;
  /** Game-time seconds taken. */
  seconds: number;
}

function button(className: string, label: string, key?: string): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = className;
  if (key) {
    const badge = document.createElement('span');
    badge.className = 'card__key';
    badge.textContent = key;
    badge.ariaHidden = 'true';
    b.append(badge);
  }
  b.append(label);
  return b;
}

export class QuestionCard {
  private readonly level: HTMLElement;
  private readonly timer: HTMLElement;
  private readonly timerFill: HTMLElement;
  private readonly text: HTMLElement;
  private readonly answers: HTMLElement;
  private readonly feedback: HTMLElement;

  private question: Question | undefined;
  private limit = 0;
  private seconds = 0;
  private locked = true;
  /** Option buttons with the Answer each gives, for keys and the reveal. */
  private options: { button: HTMLButtonElement; answer: Answer; key: string }[] = [];
  private input: HTMLInputElement | undefined;

  constructor(
    form: HTMLFormElement,
    private readonly onSubmit: (submission: Submission) => void,
  ) {
    const part = (selector: string): HTMLElement => {
      const found = form.querySelector<HTMLElement>(selector);
      if (!found) throw new Error(`Card is missing ${selector}`);
      return found;
    };
    this.level = part('.card__level');
    this.timer = part('.card__timer');
    this.timerFill = part('.card__timer-fill');
    this.text = part('.card__text');
    this.answers = part('.card__answers');
    this.feedback = part('.card__feedback');

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (this.input && this.input.value.trim() !== '') this.submit({ type: 'typed', text: this.input.value });
    });
    window.addEventListener('keydown', (e) => {
      if (this.locked || e.target instanceof HTMLInputElement) return;
      const option = this.options.find((o) => o.key === e.key.toLowerCase() || o.key === e.key);
      if (option) {
        e.preventDefault();
        this.submit(option.answer);
      }
    });
  }

  /** Shows a question with `limit` seconds on its clock. `rng` shuffles the options. */
  open(question: Question, header: string, limit: number, rng: Rng): void {
    this.question = question;
    this.limit = limit;
    this.seconds = 0;
    this.locked = false;
    this.level.textContent = header;
    this.text.textContent = question.prompt;
    this.feedback.textContent = '';
    delete this.feedback.dataset['result'];
    this.answers.replaceChildren();
    this.answers.dataset['type'] = question.type;
    this.options = [];
    this.input = undefined;

    switch (question.type) {
      case 'choice':
        rng.shuffle([...question.choices]).forEach((choice, i) => this.addOption(choice, { type: 'choice', choice }, String(i + 1)));
        break;
      case 'true-false':
        this.addOption('True', { type: 'true-false', value: true }, 't');
        this.addOption('False', { type: 'true-false', value: false }, 'f');
        break;
      case 'typed': {
        const input = document.createElement('input');
        input.className = 'card__input';
        input.type = 'text';
        input.autocomplete = 'off';
        input.spellcheck = false;
        input.setAttribute('autocapitalize', 'off');
        input.ariaLabel = 'Your answer';
        const check = button('btn', 'Check');
        check.type = 'submit';
        this.answers.append(input, check);
        this.input = input;
        break;
      }
      case 'ordering':
        // Ordering's tap-in-order card arrives in M4 4c; the picker excludes it until then.
        throw new Error('Ordering questions have no card yet');
    }
    this.drawTimer();
  }

  /** Focus the first control once the card is visible. */
  focus(): void {
    (this.input ?? this.options[0]?.button)?.focus();
  }

  /** Advances the question clock by `dt` game-time seconds; times out at the limit. */
  tick(dt: number): void {
    if (this.locked) return;
    this.seconds = Math.min(this.seconds + dt, this.limit);
    this.drawTimer();
    if (this.seconds >= this.limit) this.lock(undefined);
  }

  /** Shows the marked result: the right option in green, a wrong pick in red. */
  showResult(message: string, right: boolean, given: Answer | undefined): void {
    this.feedback.textContent = message;
    this.feedback.dataset['result'] = right ? 'good' : 'bad';
    const question = this.question;
    if (!question) return;
    for (const option of this.options) {
      if (mark(question, option.answer).right) option.button.dataset['result'] = 'good';
      else if (option.answer === given) option.button.dataset['result'] = 'bad';
    }
    if (this.input) this.input.dataset['result'] = right ? 'good' : 'bad';
  }

  private addOption(label: string, answer: Answer, key: string): void {
    const b = button('card__option', label, key.toUpperCase());
    b.addEventListener('click', () => this.submit(answer));
    this.answers.append(b);
    this.options.push({ button: b, answer, key });
  }

  private submit(answer: Answer): void {
    if (!this.locked) this.lock(answer);
  }

  private lock(answer: Answer | undefined): void {
    this.locked = true;
    for (const option of this.options) option.button.disabled = true;
    if (this.input) this.input.disabled = true;
    this.answers.querySelector<HTMLButtonElement>('button[type=submit]')?.setAttribute('disabled', '');
    this.onSubmit({ answer, seconds: this.seconds });
  }

  private drawTimer(): void {
    const left = this.limit > 0 ? 1 - this.seconds / this.limit : 0;
    this.timerFill.style.transform = `scaleX(${left})`;
    this.timer.toggleAttribute('data-warn', left <= WARN_SHARE);
    this.timer.setAttribute('aria-valuenow', String(Math.ceil(this.limit - this.seconds)));
  }
}
