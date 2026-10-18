import { describe, expect, it } from 'vitest';
import { Rng } from '../src/engine/rng';
import { BOXES, BUBBLE, CRAB, GROUND_Y, ROUND_SECONDS } from '../src/game/config';
import { World, type Intent, type WorldEvent } from '../src/game/world';

const DT = 1 / 60;
const idle: Intent = { moveRight: false, jump: false, fire: false };
const swim: Intent = { moveRight: true, jump: false, fire: false };

function run(world: World, seconds: number, intent: Intent = idle): WorldEvent[] {
  const events: WorldEvent[] = [];
  for (let i = 0; i < Math.round(seconds / DT); i++) events.push(...world.update(DT, intent));
  return events;
}

describe('World', () => {
  it('counts the round down on game time and ends exactly once', () => {
    const world = new World(new Rng(1));
    const events = run(world, ROUND_SECONDS + 5);
    expect(events.filter((e) => e.type === 'timeUp')).toHaveLength(1);
    expect(world.finished).toBe(true);
    expect(world.timeLeft).toBe(0);
  });

  it('jumps once per press and lands back on the ground', () => {
    const world = new World(new Rng(1));
    expect(world.update(DT, { ...idle, jump: true })).toContainEqual({ type: 'jumped' });
    expect(world.update(DT, { ...idle, jump: true })).not.toContainEqual({ type: 'jumped' }); // mid-air
    let peak = GROUND_Y;
    const events: WorldEvent[] = [];
    for (let i = 0; i < 180; i++) {
      events.push(...world.update(DT, idle));
      peak = Math.min(peak, world.crab.y);
    }
    expect(peak).toBeLessThan(GROUND_Y - 300);
    expect(events.filter((e) => e.type === 'landed')).toHaveLength(1);
    expect(world.crab.y).toBe(GROUND_Y);
    expect(world.crab.airborne).toBe(false);
  });

  it('scrolls nothing and spawns nothing while standing still', () => {
    const world = new World(new Rng(1));
    run(world, 10);
    expect(world.obstacles).toHaveLength(0);
    expect(world.boxes).toHaveLength(0);
    expect(world.distance).toBe(0);
  });

  it('spawns and removes off-screen items while swimming, never exceeding the box cap', () => {
    const world = new World(new Rng(7));
    let maxBoxes = 0;
    let sawObstacle = false;
    for (let i = 0; i < 60 * 60; i++) {
      // jump constantly so obstacles rarely block progress
      world.update(DT, { moveRight: true, jump: true, fire: false });
      maxBoxes = Math.max(maxBoxes, world.boxes.length);
      sawObstacle ||= world.obstacles.length > 0;
      for (const ob of world.obstacles) expect(ob.x + ob.width).toBeGreaterThan(0);
      for (const box of world.boxes) expect(box.x + box.width).toBeGreaterThan(0);
    }
    expect(sawObstacle).toBe(true);
    expect(maxBoxes).toBeGreaterThan(0);
    expect(maxBoxes).toBeLessThanOrEqual(BOXES.maxOnScreen);
  });

  it('is blocked by an obstacle until the crab jumps clear', () => {
    const world = new World(new Rng(1));
    world.obstacles.push({ kind: 'rock', x: CRAB.x + 10, y: GROUND_Y, width: 85, height: 58 });
    run(world, 1, swim);
    expect(world.distance).toBe(0);
  });

  it('pops a box with a bubble and reports its level', () => {
    const world = new World(new Rng(1));
    const bx = CRAB.x + BUBBLE.offsetX - BOXES.size / 2;
    world.boxes.push({ level: 3, x: bx, y: 300, width: BOXES.size, height: BOXES.size });
    world.boxes.push({ level: 1, x: bx + 400, y: 300, width: BOXES.size, height: BOXES.size });
    const events = [...world.update(DT, { ...idle, fire: true }), ...run(world, 2)];
    expect(events.filter((e) => e.type === 'boxHit')).toEqual([
      { type: 'boxHit', level: 3, x: bx + BOXES.size / 2, y: 300 + BOXES.size / 2 },
    ]);
    expect(world.boxes.map((b) => b.level)).toEqual([1]);
    expect(world.bubbles).toHaveLength(0);
  });

  it('removes every bubble that leaves the top, even several at once', () => {
    const world = new World(new Rng(1));
    for (let i = 0; i < 5; i++) world.update(DT, { ...idle, fire: true });
    expect(world.bubbles).toHaveLength(5);
    run(world, 4);
    expect(world.bubbles).toHaveLength(0);
  });

  it('replays identically from the same seed', () => {
    const a = new World(new Rng(42));
    const b = new World(new Rng(42));
    const intent: Intent = { moveRight: true, jump: true, fire: false };
    run(a, 30, intent);
    run(b, 30, intent);
    expect(a.boxes).toEqual(b.boxes);
    expect(a.obstacles).toEqual(b.obstacles);
  });
});
