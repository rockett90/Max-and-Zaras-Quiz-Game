import type { Rng } from './rng';

/**
 * Short-lived cosmetic particles. Game-agnostic: each particle carries a `look`
 * the game's renderer interprets. Advances only through `update(dt)`, so effects
 * freeze with the game. Give it its own Rng, never the round's, so effects can't
 * change what the gameplay draws next.
 */

export type Range = readonly [min: number, max: number];

export interface Particle<L> {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Seconds lived so far, and in total. */
  age: number;
  life: number;
  size: number;
  rotation: number;
  spin: number;
  /** px/s² downward; negative floats up. */
  gravity: number;
  /** Fraction of velocity lost per second. */
  drag: number;
  look: L;
}

export interface Burst<L> {
  x: number;
  y: number;
  count: number;
  /** Radians, 0 = right, -π/2 = up. */
  angle: Range;
  speed: Range;
  life: Range;
  size: Range;
  spin?: Range;
  gravity?: number;
  drag?: number;
  /** Start scattered within this many px of (x, y). */
  spread?: number;
  look: L;
}

export class Particles<L> {
  items: Particle<L>[] = [];

  constructor(
    private readonly rng: Rng,
    /** Oldest particles are dropped beyond this. */
    readonly max = 400,
  ) {}

  burst(burst: Burst<L>): void {
    const pick = (range: Range): number => range[0] + this.rng.next() * (range[1] - range[0]);
    const spread = burst.spread ?? 0;
    for (let i = 0; i < burst.count; i++) {
      const angle = pick(burst.angle);
      const speed = pick(burst.speed);
      this.items.push({
        x: burst.x + (this.rng.next() * 2 - 1) * spread,
        y: burst.y + (this.rng.next() * 2 - 1) * spread,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        age: 0,
        life: pick(burst.life),
        size: pick(burst.size),
        rotation: this.rng.next() * Math.PI * 2,
        spin: burst.spin ? pick(burst.spin) : 0,
        gravity: burst.gravity ?? 0,
        drag: burst.drag ?? 0,
        look: burst.look,
      });
    }
    if (this.items.length > this.max) this.items.splice(0, this.items.length - this.max);
  }

  update(dt: number): void {
    for (const p of this.items) {
      p.age += dt;
      const keep = Math.max(0, 1 - p.drag * dt);
      p.vx *= keep;
      p.vy = p.vy * keep + p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rotation += p.spin * dt;
    }
    this.items = this.items.filter((p) => p.age < p.life);
  }

  /** Shift every particle, e.g. to keep them fixed to a scrolling world. */
  shift(dx: number): void {
    for (const p of this.items) p.x += dx;
  }
}

/** 0 at birth, 1 at death. */
export function ageFraction(p: Particle<unknown>): number {
  return Math.min(1, p.age / p.life);
}
