import { describe, expect, it } from 'vitest';
import { Rng } from '../src/engine/rng';
import { shuffleUnsolved, TapOrder } from '../src/ui/ordering';

describe('shuffleUnsolved', () => {
  it('never hands over the items already in order', () => {
    const items = ['ant', 'bee', 'cow'];
    for (let seed = 0; seed < 200; seed++) {
      const shuffled = shuffleUnsolved(items, new Rng(seed));
      expect(shuffled).not.toEqual(items);
      expect([...shuffled].sort()).toEqual(items);
    }
  });
});

describe('TapOrder', () => {
  it('fills slots left to right and reports the order once full', () => {
    const tap = new TapOrder(['cow', 'ant', 'bee']);
    expect(tap.place(1)).toBe(true);
    expect(tap.place(2)).toBe(true);
    expect(tap.order).toBeUndefined();
    expect(tap.place(0)).toBe(true);
    expect(tap.order).toEqual(['ant', 'bee', 'cow']);
  });

  it('will not place a tile twice or out of range', () => {
    const tap = new TapOrder(['a', 'b']);
    tap.place(0);
    expect(tap.place(0)).toBe(false);
    expect(tap.place(5)).toBe(false);
    expect(tap.slots).toEqual([0, undefined]);
  });

  it('refills the gap a removed tile leaves before later slots', () => {
    const tap = new TapOrder(['a', 'b', 'c']);
    tap.place(0);
    tap.place(1);
    tap.place(2);
    tap.remove(0);
    expect(tap.isPlaced(0)).toBe(false);
    tap.place(0);
    expect(tap.slots).toEqual([0, 1, 2]);
    tap.remove(1);
    tap.place(1);
    expect(tap.slots).toEqual([0, 1, 2]);
  });

  it('takes back the right-most tile on removeLast', () => {
    const tap = new TapOrder(['a', 'b', 'c']);
    tap.place(2);
    tap.place(0);
    tap.removeLast();
    expect(tap.slots).toEqual([2, undefined, undefined]);
    tap.removeLast();
    tap.removeLast();
    expect(tap.slots).toEqual([undefined, undefined, undefined]);
  });
});
