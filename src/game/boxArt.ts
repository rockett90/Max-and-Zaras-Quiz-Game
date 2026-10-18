import type { Level } from './config';
import type { Box } from './world';

/**
 * One look per box level, made at load from the single hand-drawn box (box1.png,
 * which is never edited): plain wood, sea-green with a shell, and gold with a
 * passing shimmer. Star pips replace the number so non-readers can tell them apart.
 */

/** Pixel size of each prepared box, enough for a 75 px box on a 2.5× screen. */
const ART_SIZE = 192;

/** Multiply sets the hue and keeps the drawn lines; screen lifts it back to bright. */
const TINTS: Record<Level, { multiply: string; screen: string } | undefined> = {
  1: undefined,
  2: { multiply: 'rgb(130, 235, 220)', screen: 'rgba(40, 150, 150, 0.35)' },
  3: { multiply: 'rgb(255, 178, 40)', screen: 'rgba(200, 120, 0, 0.18)' },
};

/** Seconds between shimmer sweeps across a level-3 box, and how long one takes. */
const SHIMMER_EVERY = 2.4;
const SHIMMER_TAKES = 0.7;

export type BoxArt = Record<Level, HTMLCanvasElement>;

export function buildBoxArt(box: HTMLImageElement): BoxArt {
  return { 1: variant(box, 1), 2: variant(box, 2), 3: variant(box, 3) };
}

export function drawBox(ctx: CanvasRenderingContext2D, art: BoxArt, box: Box, time: number): void {
  ctx.drawImage(art[box.level], box.x, box.y, box.width, box.height);
  if (box.level === 3) drawShimmer(ctx, box, time);
  drawPips(ctx, box);
}

/**
 * Where the shimmer band is across the box, from 0 (off the left) to 1 (off the
 * right), or undefined between sweeps.
 */
export function shimmerProgress(time: number): number | undefined {
  const t = time % SHIMMER_EVERY;
  return t < SHIMMER_TAKES ? t / SHIMMER_TAKES : undefined;
}

function variant(source: HTMLImageElement, level: Level): HTMLCanvasElement {
  const art = document.createElement('canvas');
  art.width = ART_SIZE;
  art.height = ART_SIZE;
  const ctx = art.getContext('2d');
  if (!ctx) throw new Error('2D canvas not supported');
  ctx.drawImage(source, 0, 0, ART_SIZE, ART_SIZE);

  const tint = TINTS[level];
  if (tint) {
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = tint.multiply;
    ctx.fillRect(0, 0, ART_SIZE, ART_SIZE);
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = tint.screen;
    ctx.fillRect(0, 0, ART_SIZE, ART_SIZE);
    // Both fills also painted the transparent margin; cut back to the box's outline.
    ctx.globalCompositeOperation = 'destination-in';
    ctx.drawImage(source, 0, 0, ART_SIZE, ART_SIZE);
    ctx.globalCompositeOperation = 'source-over';
  }
  if (level === 2) shell(ctx, ART_SIZE * 0.25, ART_SIZE * 0.77, ART_SIZE * 0.13);
  return art;
}

/** A scallop shell: a fan of ribs above a small hinge, centred on (x, y). */
function shell(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.lineJoin = 'round';
  ctx.lineWidth = r * 0.12;
  ctx.strokeStyle = '#7a3b2e';
  ctx.fillStyle = '#ffd9c7';

  ctx.beginPath();
  ctx.moveTo(0, r * 0.55);
  const ribs = 5;
  for (let i = 0; i <= ribs; i++) {
    const a = Math.PI + (i / ribs) * Math.PI;
    const bulge = Math.PI / ribs / 2;
    ctx.quadraticCurveTo(
      Math.cos(a - bulge) * r * 1.15,
      Math.sin(a - bulge) * r * 1.15 + r * 0.1,
      Math.cos(a) * r,
      Math.sin(a) * r + r * 0.1,
    );
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  for (let i = 1; i < ribs; i++) {
    const a = Math.PI + (i / ribs) * Math.PI;
    ctx.moveTo(0, r * 0.55);
    ctx.lineTo(Math.cos(a) * r * 0.85, Math.sin(a) * r * 0.85 + r * 0.1);
  }
  ctx.stroke();

  ctx.beginPath();
  ctx.roundRect(-r * 0.3, r * 0.45, r * 0.6, r * 0.3, r * 0.08);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawShimmer(ctx: CanvasRenderingContext2D, box: Box, time: number): void {
  const progress = shimmerProgress(time);
  if (progress === undefined) return;
  const band = box.width * 0.45;
  const cx = box.x - band + progress * (box.width + band * 2);
  ctx.save();
  ctx.beginPath();
  ctx.rect(box.x, box.y, box.width, box.height);
  ctx.clip();
  ctx.globalCompositeOperation = 'lighter';
  const gradient = ctx.createLinearGradient(cx - band, box.y, cx + band, box.y + box.height);
  gradient.addColorStop(0, 'rgba(255, 245, 200, 0)');
  gradient.addColorStop(0.5, 'rgba(255, 245, 200, 0.55)');
  gradient.addColorStop(1, 'rgba(255, 245, 200, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(box.x, box.y, box.width, box.height);
  ctx.restore();
}

/** One to three gold stars across the middle of the box. */
function drawPips(ctx: CanvasRenderingContext2D, box: Box): void {
  const radius = box.width * 0.135;
  const spacing = radius * 2.1;
  const cy = box.y + box.height / 2;
  const first = box.x + box.width / 2 - ((box.level - 1) * spacing) / 2;
  ctx.save();
  ctx.fillStyle = '#ffd23f';
  ctx.strokeStyle = '#5a3a00';
  ctx.lineWidth = radius * 0.28;
  ctx.lineJoin = 'round';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
  ctx.shadowOffsetY = 2;
  ctx.shadowBlur = 3;
  for (let i = 0; i < box.level; i++) {
    star(ctx, first + i * spacing, cy, radius);
    ctx.stroke();
    ctx.fill();
  }
  ctx.restore();
}

function star(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number): void {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const d = i % 2 === 0 ? r : r * 0.48;
    ctx.lineTo(cx + Math.cos(a) * d, cy + Math.sin(a) * d);
  }
  ctx.closePath();
}
