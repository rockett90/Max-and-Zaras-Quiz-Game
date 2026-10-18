import type { ImageSet } from '../engine/assets';
import { drawBox, type BoxArt } from './boxArt';
import { WORLD_WIDTH } from './config';
import { drawScenery, type Scenery } from './scenery';
import type { RoundScore } from './scoring';
import type { World } from './world';

export type ImageKey = 'background' | 'crab' | 'rock' | 'seaweed' | 'box' | 'bubble';

const HUD_FONT = 'bold 34px "Trebuchet MS", "Segoe UI", sans-serif';

/** Everything drawn, loaded or prepared once before play. */
export interface Art {
  images: ImageSet<ImageKey>;
  scenery: Scenery;
  boxes: BoxArt;
}

export function renderWorld(ctx: CanvasRenderingContext2D, world: World, round: RoundScore, art: Art): void {
  const { images } = art;
  drawScenery(ctx, art.scenery, world.distance, world.elapsed);

  for (const ob of world.obstacles) {
    ctx.drawImage(images[ob.kind], ob.x, ob.y, ob.width, ob.height);
  }

  for (const box of world.boxes) drawBox(ctx, art.boxes, box, world.elapsed);

  const { crab } = world;
  ctx.drawImage(images.crab, crab.x, crab.y, crab.width, crab.height);

  for (const b of world.bubbles) {
    ctx.drawImage(images.bubble, b.x - b.radius, b.y - b.radius, b.radius * 2, b.radius * 2);
  }

  drawHud(ctx, world, round);
}

function drawHud(ctx: CanvasRenderingContext2D, world: World, round: RoundScore): void {
  pill(ctx, 12, 12, `Score: ${round.score}`, 'left');
  pill(ctx, WORLD_WIDTH - 12, 12, `Time: ${Math.ceil(world.timeLeft)}`, 'right');
  if (round.streak >= 2) {
    const boost = round.nextMultiplier > 1 ? `  next ×${round.nextMultiplier}` : '';
    pill(ctx, WORLD_WIDTH / 2, 12, `${round.streak} in a row!${boost}`, 'center', STREAK_FILL);
  }
}

const STREAK_FILL = 'rgba(255,214,102,0.92)';

function pill(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  text: string,
  align: 'left' | 'right' | 'center',
  fill = 'rgba(255,255,255,0.85)',
): void {
  ctx.save();
  ctx.font = HUD_FONT;
  const padX = 14;
  const height = 50;
  const width = ctx.measureText(text).width + padX * 2;
  const left = align === 'left' ? x : align === 'right' ? x - width : x - width / 2;
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.roundRect(left, y, width, height, 12);
  ctx.fill();
  ctx.fillStyle = '#123';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, left + padX, y + height / 2 + 1);
  ctx.restore();
}
