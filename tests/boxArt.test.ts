import { describe, expect, it } from 'vitest';
import { shimmerProgress } from '../src/game/boxArt';

describe('shimmerProgress', () => {
  it('sweeps 0→1 at the start of each cycle and rests in between', () => {
    expect(shimmerProgress(0)).toBe(0);
    expect(shimmerProgress(0.35)).toBeCloseTo(0.5);
    expect(shimmerProgress(1.5)).toBeUndefined();
    expect(shimmerProgress(2.4 + 0.35)).toBeCloseTo(0.5);
  });
});
