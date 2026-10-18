import { describe, expect, it } from 'vitest';
import { FixedStepper, MAX_FRAME_TIME } from '../src/engine/loop';

/** Simulate `seconds` of real time delivered at `hz` animation frames per second. */
function stepsAt(hz: number, seconds: number): number {
  const stepper = new FixedStepper(1 / 60);
  let steps = 0;
  for (let i = 0; i < Math.round(hz * seconds); i++) steps += stepper.advance(1 / hz, () => undefined);
  return steps;
}

describe('FixedStepper', () => {
  // REQ-PLAY-001: game time is independent of display refresh rate.
  it.each([30, 60, 75, 120, 144, 240])('runs 600 steps in 10 s at %i Hz', (hz) => {
    expect(Math.abs(stepsAt(hz, 10) - 600)).toBeLessThanOrEqual(1);
  });

  it('passes the fixed step size to update', () => {
    const seen: number[] = [];
    new FixedStepper(1 / 60).advance(0.05, (dt) => seen.push(dt));
    expect(seen).toEqual([1 / 60, 1 / 60, 1 / 60]);
  });

  it('drops time beyond the max frame (tab switch) instead of fast-forwarding', () => {
    const stepper = new FixedStepper(1 / 60);
    const steps = stepper.advance(30, () => undefined);
    expect(steps).toBe(Math.floor(MAX_FRAME_TIME * 60));
  });

  it('ignores negative elapsed time', () => {
    expect(new FixedStepper().advance(-1, () => undefined)).toBe(0);
  });
});
