/**
 * The tap-in-order answer for ordering questions: tap tiles from the pool to fill
 * the numbered slots left to right; tap a filled slot to put its tile back. Pool
 * tiles keep their places (a placed one just fades), so nothing jumps under a
 * child's finger. `TapOrder` is the pure model; `OrderingPicker` draws it.
 */
import type { Rng } from '../engine/rng';
import { normaliseAnswer } from '../game/text';

/** Shuffles until the order differs from the answer, so the question never arrives solved. */
export function shuffleUnsolved(items: readonly string[], rng: Rng): string[] {
  const solved = items.join('\n');
  let shuffled = rng.shuffle([...items]);
  for (let tries = 0; tries < 10 && shuffled.join('\n') === solved; tries++) shuffled = rng.shuffle([...items]);
  return shuffled;
}

export class TapOrder {
  /** Pool index held by each slot. */
  readonly slots: (number | undefined)[];

  constructor(readonly pool: readonly string[]) {
    this.slots = pool.map(() => undefined);
  }

  isPlaced(poolIndex: number): boolean {
    return this.slots.includes(poolIndex);
  }

  /** Puts a pool tile in the first empty slot. False if it was already placed or the slots are full. */
  place(poolIndex: number): boolean {
    const empty = this.slots.indexOf(undefined);
    if (empty < 0 || this.isPlaced(poolIndex) || poolIndex < 0 || poolIndex >= this.pool.length) return false;
    this.slots[empty] = poolIndex;
    return true;
  }

  /** Empties a slot, returning its tile to the pool. */
  remove(slot: number): void {
    this.slots[slot] = undefined;
  }

  /** Empties the right-most filled slot (Backspace). */
  removeLast(): void {
    for (let s = this.slots.length - 1; s >= 0; s--) {
      if (this.slots[s] !== undefined) {
        this.slots[s] = undefined;
        return;
      }
    }
  }

  get full(): boolean {
    return !this.slots.includes(undefined);
  }

  /** The items in slot order, or undefined until every slot is filled. */
  get order(): string[] | undefined {
    if (!this.full) return undefined;
    return this.slots.map((p) => this.pool[p as number] as string);
  }
}

export class OrderingPicker {
  readonly element: HTMLElement;
  private readonly model: TapOrder;
  private readonly slotButtons: HTMLButtonElement[];
  private readonly tileButtons: HTMLButtonElement[];
  private enabled = true;

  constructor(
    items: readonly string[],
    rng: Rng,
    private readonly onChange: (full: boolean) => void,
  ) {
    this.model = new TapOrder(shuffleUnsolved(items, rng));
    this.element = document.createElement('div');
    this.element.className = 'ordering';
    const slotRow = document.createElement('div');
    slotRow.className = 'ordering__slots';
    const poolRow = document.createElement('div');
    poolRow.className = 'ordering__pool';

    this.slotButtons = this.model.slots.map((_, s) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'ordering__slot';
      b.dataset['n'] = String(s + 1);
      b.addEventListener('click', () => {
        if (!this.enabled) return;
        this.model.remove(s);
        this.draw();
      });
      return b;
    });
    this.tileButtons = this.model.pool.map((item, p) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'card__option ordering__tile';
      const badge = document.createElement('span');
      badge.className = 'card__key';
      badge.textContent = String(p + 1);
      badge.ariaHidden = 'true';
      b.append(badge, item);
      b.addEventListener('click', () => this.pick(p));
      return b;
    });
    slotRow.append(...this.slotButtons);
    poolRow.append(...this.tileButtons);
    this.element.append(slotRow, poolRow);
    this.draw();
  }

  /** The tiles in the order they are shown. */
  get items(): readonly string[] {
    return this.model.pool;
  }

  get order(): string[] | undefined {
    return this.model.order;
  }

  /** Places pool tile `p` (also what keys 1–6 do). */
  pick(p: number): void {
    if (this.enabled && this.model.place(p)) this.draw();
  }

  removeLast(): void {
    if (!this.enabled) return;
    this.model.removeLast();
    this.draw();
  }

  focus(): void {
    this.tileButtons[0]?.focus();
  }

  disable(): void {
    this.enabled = false;
    for (const b of [...this.slotButtons, ...this.tileButtons]) b.disabled = true;
  }

  /** Marks each slot right or wrong against the correct order. */
  reveal(answer: readonly string[]): void {
    const order = this.model.slots.map((p) => (p === undefined ? undefined : this.model.pool[p]));
    this.slotButtons.forEach((b, s) => {
      const placed = order[s];
      const expected = answer[s];
      b.dataset['result'] = placed !== undefined && expected !== undefined && normaliseAnswer(placed) === normaliseAnswer(expected) ? 'good' : 'bad';
    });
  }

  private draw(): void {
    this.slotButtons.forEach((b, s) => {
      const p = this.model.slots[s];
      b.textContent = p === undefined ? '' : (this.model.pool[p] ?? '');
      b.toggleAttribute('data-filled', p !== undefined);
      b.ariaLabel = p === undefined ? `Place ${s + 1}, empty` : `Place ${s + 1}: ${b.textContent}. Tap to take it back.`;
    });
    this.tileButtons.forEach((b, p) => {
      const placed = this.model.isPlaced(p);
      b.toggleAttribute('data-placed', placed);
      b.ariaDisabled = String(placed);
    });
    this.onChange(this.model.full);
  }
}
