import { describe, expect, it } from 'vitest';
import { ageFraction, Particles, type Burst, type Particle } from '../src/engine/particles';
import { Rng } from '../src/engine/rng';

const DT = 1 / 60;
const puff: Burst<string> = {
  x: 100,
  y: 200,
  count: 10,
  angle: [-Math.PI, 0],
  speed: [50, 100],
  life: [0.5, 1],
  size: [2, 4],
  look: 'dust',
};

function only(particles: Particles<string>): Particle<string> {
  const [p] = particles.items;
  if (!p) throw new Error('no particle');
  return p;
}

function step(particles: Particles<string>, seconds: number): void {
  for (let i = 0; i < Math.round(seconds / DT); i++) particles.update(DT);
}

describe('Particles', () => {
  it('spawns a burst within its ranges', () => {
    const particles = new Particles<string>(new Rng(1));
    particles.burst(puff);
    expect(particles.items).toHaveLength(10);
    for (const p of particles.items) {
      expect(Math.hypot(p.vx, p.vy)).toBeGreaterThanOrEqual(50);
      expect(Math.hypot(p.vx, p.vy)).toBeLessThanOrEqual(100);
      expect(p.vy).toBeLessThanOrEqual(0); // upper half only
      expect(p.look).toBe('dust');
    }
  });

  it('is reproducible from its seed', () => {
    const a = new Particles<string>(new Rng(7));
    const b = new Particles<string>(new Rng(7));
    a.burst(puff);
    b.burst(puff);
    expect(a.items).toEqual(b.items);
  });

  it('moves only when updated and removes particles at the end of life', () => {
    const particles = new Particles<string>(new Rng(1));
    particles.burst({ ...puff, count: 1, angle: [0, 0], speed: [60, 60], life: [1, 1] });
    expect(particles.items[0]?.x).toBe(100);
    step(particles, 0.5);
    expect(particles.items[0]?.x).toBeCloseTo(130, 0);
    expect(ageFraction(only(particles))).toBeCloseTo(0.5);
    step(particles, 0.6);
    expect(particles.items).toHaveLength(0);
  });

  it('applies gravity and drag', () => {
    const particles = new Particles<string>(new Rng(1));
    particles.burst({ ...puff, count: 1, angle: [0, 0], speed: [100, 100], life: [5, 5], gravity: 100, drag: 1 });
    step(particles, 1);
    const p = only(particles);
    expect(p.vx).toBeLessThan(40); // ~100·e⁻¹
    expect(p.vy).toBeGreaterThan(50); // falling
  });

  it('drops the oldest particles beyond its cap', () => {
    const particles = new Particles<string>(new Rng(1), 15);
    particles.burst({ ...puff, look: 'old' });
    particles.burst({ ...puff, look: 'new' });
    expect(particles.items).toHaveLength(15);
    expect(particles.items.filter((p) => p.look === 'new')).toHaveLength(10);
  });
});
