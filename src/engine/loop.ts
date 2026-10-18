/**
 * Fixed-timestep game loop.
 *
 * Game logic advances in constant `step`-second slices regardless of the display's
 * refresh rate, so a 144 Hz monitor plays at the same speed as a 60 Hz one.
 * Rendering happens once per animation frame.
 */

export const DEFAULT_STEP = 1 / 60;

/** Longest real-time gap we will catch up on; beyond this (tab switch, debugger) we drop time. */
export const MAX_FRAME_TIME = 0.25;

/** Pure accumulator, kept separate from requestAnimationFrame so it can be unit tested. */
export class FixedStepper {
  private accumulator = 0;

  constructor(
    readonly step: number = DEFAULT_STEP,
    private readonly maxFrameTime: number = MAX_FRAME_TIME,
  ) {}

  /** Feed real elapsed seconds; calls `update(step)` zero or more times. Returns steps taken. */
  advance(elapsed: number, update: (dt: number) => void): number {
    this.accumulator += Math.min(Math.max(elapsed, 0), this.maxFrameTime);
    let steps = 0;
    while (this.accumulator >= this.step) {
      update(this.step);
      this.accumulator -= this.step;
      steps++;
    }
    return steps;
  }

  reset(): void {
    this.accumulator = 0;
  }
}

export interface LoopHandle {
  stop(): void;
}

export function startLoop(update: (dt: number) => void, render: () => void, step = DEFAULT_STEP): LoopHandle {
  const stepper = new FixedStepper(step);
  let last = performance.now();
  let frame = 0;
  let running = true;

  const tick = (now: number): void => {
    if (!running) return;
    stepper.advance((now - last) / 1000, update);
    last = now;
    render();
    frame = requestAnimationFrame(tick);
  };
  frame = requestAnimationFrame(tick);

  return {
    stop() {
      running = false;
      cancelAnimationFrame(frame);
    },
  };
}
