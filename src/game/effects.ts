import { ageFraction, Particles, type Burst, type Particle } from '../engine/particles';
import type { Rng } from '../engine/rng';
import { WORLD_HEIGHT, WORLD_WIDTH, type Level } from './config';
import type { World, WorldEvent } from './world';

/**
 * Cosmetic effects: splinters and bubbles when a box pops, a bubble trail, a sand
 * puff on landing, sparkles and a "+N" when an answer is right, and drifting
 * plankton. Driven by its own RNG and by game time, so it never touches gameplay
 * and freezes while a question is open.
 */

type Look =
  | { kind: 'splinter'; color: string }
  | { kind: 'bubble' }
  | { kind: 'sand' }
  | { kind: 'sparkle' }
  | { kind: 'text'; text: string; color: string };

const SPLINTER_COLOR: Record<Level, string> = { 1: '#8a6a48', 2: '#3f8f84', 3: '#e0a422' };
const PLANKTON_COUNT = 36;
/** Trail bubbles per second behind each fired bubble. */
const TRAIL_RATE = 22;
const FULL_TURN = [0, Math.PI * 2] as const;
const UPWARDS = [-Math.PI, 0] as const;

interface Speck {
  x: number;
  y: number;
  size: number;
  /** Parallax factor; nearer specks are bigger and faster. */
  depth: number;
  phase: number;
}

export class Effects {
  private readonly particles: Particles<Look>;
  private readonly plankton: Speck[];
  /** 1 normally, smaller under prefers-reduced-motion. */
  private readonly amount: number;
  private lastDistance = 0;

  constructor(
    private readonly rng: Rng,
    reducedMotion: boolean,
  ) {
    this.amount = reducedMotion ? 0.35 : 1;
    this.particles = new Particles(rng);
    this.plankton = Array.from({ length: Math.round(PLANKTON_COUNT * this.amount) }, () => {
      const depth = 0.3 + rng.next() * 0.5;
      return {
        x: rng.next() * WORLD_WIDTH,
        y: 60 + rng.next() * 560,
        size: 1 + depth * 2.5,
        depth,
        phase: rng.next() * 10,
      };
    });
  }

  handle(event: WorldEvent): void {
    if (event.type === 'landed') {
      const puff = {
        y: event.y - 4,
        count: 7,
        speed: [40, 130],
        life: [0.35, 0.7],
        size: [3, 6],
        gravity: 140,
        drag: 2.5,
        spread: 8,
        look: { kind: 'sand' },
      } as const;
      this.burst({ ...puff, x: event.x - 30, angle: [-Math.PI, -Math.PI * 0.8] });
      this.burst({ ...puff, x: event.x + 30, angle: [-Math.PI * 0.2, 0] });
    } else if (event.type === 'boxHit') {
      const at = { x: event.x, y: event.y };
      this.burst({
        ...at,
        count: 14,
        angle: FULL_TURN,
        speed: [120, 320],
        life: [0.6, 1],
        size: [6, 12],
        spin: [-12, 12],
        gravity: 520,
        drag: 1,
        look: { kind: 'splinter', color: SPLINTER_COLOR[event.level] },
      });
      this.burst({
        ...at,
        count: 10,
        angle: UPWARDS,
        speed: [30, 120],
        life: [0.6, 1.1],
        size: [2, 5],
        gravity: -60,
        drag: 1.5,
        spread: 20,
        look: { kind: 'bubble' },
      });
    }
  }

  /** A right answer: sparkles and a rising "+N" where the box was. */
  celebrate(x: number, y: number, points: number, streak: number): void {
    this.burst({
      x,
      y,
      count: 12,
      angle: FULL_TURN,
      speed: [60, 220],
      life: [0.5, 0.9],
      size: [5, 10],
      spin: [-4, 4],
      drag: 2.5,
      look: { kind: 'sparkle' },
    });
    const color = streak >= 3 ? '#ffd23f' : '#ffffff';
    // Always shown, even under reduced motion: it is information, not decoration.
    this.particles.burst({
      x,
      y: y - 20,
      count: 1,
      angle: [-Math.PI / 2, -Math.PI / 2],
      speed: [70, 70],
      life: [1.3, 1.3],
      size: [44, 44],
      drag: 0.8,
      look: { kind: 'text', text: `+${points}`, color },
    });
  }

  update(dt: number, world: World): void {
    this.particles.shift(this.lastDistance - world.distance);
    this.lastDistance = world.distance;
    for (const bubble of world.bubbles) {
      if (this.rng.chance(TRAIL_RATE * this.amount * dt)) {
        this.particles.burst({
          x: bubble.x,
          y: bubble.y + bubble.radius,
          count: 1,
          angle: UPWARDS,
          speed: [5, 25],
          life: [0.35, 0.7],
          size: [1.5, 3],
          gravity: -30,
          drag: 1,
          spread: 4,
          look: { kind: 'bubble' },
        });
      }
    }
    this.particles.update(dt);
  }

  /** Behind the obstacles and crab. */
  drawPlankton(ctx: CanvasRenderingContext2D, world: World): void {
    ctx.save();
    ctx.fillStyle = 'rgba(225, 245, 255, 0.45)';
    for (const s of this.plankton) {
      const t = world.elapsed + s.phase;
      const x = wrap(s.x - world.distance * s.depth + Math.sin(t * 0.7) * 12, WORLD_WIDTH);
      const y = wrap(s.y - t * 6 * s.depth, WORLD_HEIGHT * 0.85);
      ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 1.3);
      ctx.beginPath();
      ctx.arc(x, y, s.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  /** In front of everything except the HUD. */
  drawParticles(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles.items) drawParticle(ctx, p);
  }

  private burst(burst: Burst<Look>): void {
    this.particles.burst({ ...burst, count: Math.max(1, Math.round(burst.count * this.amount)) });
  }
}

function drawParticle(ctx: CanvasRenderingContext2D, p: Particle<Look>): void {
  const f = ageFraction(p);
  const fade = (from: number): number => (f < from ? 1 : 1 - (f - from) / (1 - from));
  ctx.save();
  ctx.translate(p.x, p.y);
  const look = p.look;
  switch (look.kind) {
    case 'splinter':
      ctx.globalAlpha = fade(0.6);
      ctx.rotate(p.rotation);
      ctx.fillStyle = look.color;
      ctx.strokeStyle = 'rgba(40, 25, 10, 0.7)';
      ctx.lineWidth = 1;
      ctx.fillRect(-p.size / 2, -p.size * 0.18, p.size, p.size * 0.36);
      ctx.strokeRect(-p.size / 2, -p.size * 0.18, p.size, p.size * 0.36);
      break;
    case 'bubble':
      ctx.globalAlpha = 0.8 * fade(0.5);
      ctx.strokeStyle = '#e8f8ff';
      ctx.lineWidth = Math.max(1, p.size * 0.3);
      ctx.beginPath();
      ctx.arc(0, 0, p.size, 0, Math.PI * 2);
      ctx.stroke();
      break;
    case 'sand':
      ctx.globalAlpha = 0.75 * (1 - f);
      ctx.fillStyle = '#e8c27a';
      ctx.beginPath();
      ctx.arc(0, 0, p.size * (1 + f), 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'sparkle':
      ctx.globalAlpha = fade(0.4);
      ctx.rotate(p.rotation);
      ctx.fillStyle = '#fff3a0';
      sparkle(ctx, p.size * (1 - f * 0.6));
      break;
    case 'text':
      ctx.globalAlpha = fade(0.55);
      ctx.font = `bold ${p.size}px "Trebuchet MS", "Segoe UI", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineJoin = 'round';
      ctx.lineWidth = 6;
      ctx.strokeStyle = '#12304a';
      ctx.strokeText(look.text, 0, 0);
      ctx.fillStyle = look.color;
      ctx.fillText(look.text, 0, 0);
      break;
  }
  ctx.restore();
}

/** A four-pointed twinkle. */
function sparkle(ctx: CanvasRenderingContext2D, r: number): void {
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    const d = i % 2 === 0 ? r : r * 0.28;
    ctx.lineTo(Math.cos(a) * d, Math.sin(a) * d);
  }
  ctx.closePath();
  ctx.fill();
}

function wrap(value: number, size: number): number {
  return ((value % size) + size) % size;
}
