import { circleHitsRect, rectsOverlap, type Rect } from '../engine/collision';
import type { Rng } from '../engine/rng';
import { BOXES, BUBBLE, CRAB, GROUND_Y, OBSTACLES, ROUND_SECONDS, SCROLL_SPEED, WORLD_WIDTH, type Level } from './config';

export type ObstacleKind = 'rock' | 'seaweed';

export interface Crab extends Rect {
  vy: number;
  airborne: boolean;
}

export interface Obstacle extends Rect {
  kind: ObstacleKind;
}

export interface Box extends Rect {
  level: Level;
}

export interface Bubble {
  x: number;
  y: number;
  radius: number;
}

/** What the player asked for during one step. */
export interface Intent {
  moveRight: boolean;
  jump: boolean;
  fire: boolean;
}

export type WorldEvent = { type: 'jumped' } | { type: 'fired' } | { type: 'boxHit'; level: Level } | { type: 'timeUp' };

/**
 * The whole simulation. Advances only through `update(dt)` on game time, so pausing
 * (question open, tab hidden) is just not calling it.
 */
export class World {
  readonly crab: Crab = { x: CRAB.x, y: GROUND_Y, width: CRAB.width, height: CRAB.height, vy: 0, airborne: false };
  obstacles: Obstacle[] = [];
  boxes: Box[] = [];
  bubbles: Bubble[] = [];
  timeLeft = ROUND_SECONDS;
  /** Total distance scrolled, for parallax backgrounds. */
  distance = 0;
  finished = false;

  constructor(private readonly rng: Rng) {}

  update(dt: number, intent: Intent): WorldEvent[] {
    if (this.finished) return [];
    const events: WorldEvent[] = [];

    this.timeLeft = Math.max(0, this.timeLeft - dt);
    if (this.timeLeft === 0) {
      this.finished = true;
      return [{ type: 'timeUp' }];
    }

    if (intent.jump && !this.crab.airborne) {
      this.crab.airborne = true;
      this.crab.vy = -CRAB.jumpSpeed;
      events.push({ type: 'jumped' });
    }
    if (intent.fire) {
      this.bubbles.push({ x: this.crab.x + BUBBLE.offsetX, y: this.crab.y + BUBBLE.offsetY, radius: BUBBLE.radius });
      events.push({ type: 'fired' });
    }

    this.updateCrab(dt);

    const blocked = this.obstacles.some((ob) => rectsOverlap(this.crab, ob));
    if (intent.moveRight && !blocked) {
      const dx = SCROLL_SPEED * dt;
      this.distance += dx;
      for (const ob of this.obstacles) ob.x -= dx;
      for (const box of this.boxes) box.x -= dx;
      this.spawn(dt);
    }
    this.obstacles = this.obstacles.filter((ob) => ob.x + ob.width > 0);
    this.boxes = this.boxes.filter((box) => box.x + box.width > 0);

    this.updateBubbles(dt, events);
    return events;
  }

  private updateCrab(dt: number): void {
    const crab = this.crab;
    if (!crab.airborne) return;
    crab.vy += CRAB.gravity * dt;
    crab.y += crab.vy * dt;
    if (crab.y >= GROUND_Y) {
      crab.y = GROUND_Y;
      crab.vy = 0;
      crab.airborne = false;
    }
  }

  private spawn(dt: number): void {
    const rightmostObstacle = Math.max(-Infinity, ...this.obstacles.map((ob) => ob.x));
    if (WORLD_WIDTH - rightmostObstacle > OBSTACLES.minGap && this.rng.chance(OBSTACLES.spawnPerSecond * dt)) {
      const kind: ObstacleKind = this.rng.chance(0.5) ? 'rock' : 'seaweed';
      const spec = OBSTACLES[kind];
      this.obstacles.push({ kind, x: WORLD_WIDTH, y: spec.y, width: spec.width, height: spec.height });
    }

    if (this.boxes.length < BOXES.maxOnScreen && this.rng.chance(BOXES.spawnPerSecond * dt)) {
      const rightmostEdge = Math.max(0, ...this.boxes.map((box) => box.x + box.width));
      if (this.boxes.length === 0 || WORLD_WIDTH - rightmostEdge >= BOXES.minGap) {
        const level = this.rng.int(1, 3) as Level;
        this.boxes.push({
          level,
          x: WORLD_WIDTH,
          y: BOXES.topY + (level - 1) * BOXES.levelDrop,
          width: BOXES.size,
          height: BOXES.size,
        });
      }
    }
  }

  private updateBubbles(dt: number, events: WorldEvent[]): void {
    const survivors: Bubble[] = [];
    for (const bubble of this.bubbles) {
      bubble.y -= BUBBLE.speed * dt;
      const hit = this.boxes.findIndex((box) => circleHitsRect(bubble.x, bubble.y, bubble.radius, box));
      if (hit >= 0) {
        const [box] = this.boxes.splice(hit, 1);
        if (box) events.push({ type: 'boxHit', level: box.level });
        continue;
      }
      if (bubble.y + bubble.radius > 0) survivors.push(bubble);
    }
    this.bubbles = survivors;
  }
}
