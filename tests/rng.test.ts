import { describe, expect, it } from 'vitest';
import { Rng } from '../src/engine/rng';

describe('Rng', () => {
  it('is reproducible from a seed', () => {
    const a = new Rng(1234);
    const b = new Rng(1234);
    const seqA = Array.from({ length: 50 }, () => a.next());
    const seqB = Array.from({ length: 50 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it('differs between seeds', () => {
    expect(new Rng(1).next()).not.toBe(new Rng(2).next());
  });

  it('keeps int() within inclusive bounds and hits both ends', () => {
    const rng = new Rng(99);
    const seen = new Set<number>();
    for (let i = 0; i < 2000; i++) {
      const n = rng.int(1, 3);
      expect(n).toBeGreaterThanOrEqual(1);
      expect(n).toBeLessThanOrEqual(3);
      seen.add(n);
    }
    expect([...seen].sort()).toEqual([1, 2, 3]);
  });

  it('refuses to pick from an empty list', () => {
    expect(() => new Rng(1).pick([])).toThrow();
  });

  it('shuffles reproducibly without losing items', () => {
    const a = new Rng(9).shuffle([1, 2, 3, 4, 5, 6]);
    expect(new Rng(9).shuffle([1, 2, 3, 4, 5, 6])).toEqual(a);
    expect([...a].sort()).toEqual([1, 2, 3, 4, 5, 6]);
    expect(a).not.toEqual([1, 2, 3, 4, 5, 6]);
  });
});
