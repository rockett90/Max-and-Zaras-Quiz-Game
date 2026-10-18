import { describe, expect, it } from 'vitest';
import { computeFit } from '../src/engine/viewport';

describe('computeFit', () => {
  it('letterboxes a wide window', () => {
    const fit = computeFit(1920, 1080, 1024, 768);
    expect(fit.scale).toBeCloseTo(1080 / 768);
    expect(fit.offsetY).toBe(0);
    expect(fit.offsetX).toBeCloseTo((1920 - 1024 * fit.scale) / 2);
  });

  it('pillarboxes a tall window (phone portrait)', () => {
    const fit = computeFit(390, 844, 1024, 768);
    expect(fit.scale).toBeCloseTo(390 / 1024);
    expect(fit.offsetX).toBe(0);
    expect(fit.offsetY).toBeGreaterThan(0);
  });

  it('is identity at the logical size', () => {
    expect(computeFit(1024, 768, 1024, 768)).toEqual({ scale: 1, offsetX: 0, offsetY: 0 });
  });
});
