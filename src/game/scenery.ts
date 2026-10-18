import { layerOffset, mirrorTile, tileOrigins } from '../engine/parallax';
import { Rng } from '../engine/rng';
import { WORLD_HEIGHT, WORLD_WIDTH } from './config';

/**
 * The parallax backdrop. background.png is split when it is drawn, never edited:
 * the water scrolls slowly, the sand moves with the crab, and a reef silhouette
 * drawn in code sits between them. Light beams shimmer over the water on game time.
 */

/** Scroll speed of each layer as a fraction of the crab's. */
export const PARALLAX = { water: 0.2, beams: 0.2, farReef: 0.3, reef: 0.45, sand: 1 } as const;

/** Just above the highest sand hump in background.png (y ≈ 653). */
const SAND_TOP = 645;
/** Hidden behind the sand, so the reef has no visible bottom edge. */
const REEF_BASE = 705;
const REEF_PERIOD = 1700;
const REEF_FILL = 'rgba(6, 34, 92, 0.42)';
const FAR_REEF_FILL = 'rgba(30, 90, 170, 0.38)';
const BEAM_COUNT = 6;
/** Fixed, and separate from the round's RNG so scenery never shifts gameplay. */
const SCENERY_SEED = 0x5ea_bed;

/** True for the blue water pixels between the sand humps. */
export function isWaterPixel(r: number, _g: number, b: number): boolean {
  return b - r > 60;
}

interface Beam {
  x: number;
  width: number;
  lean: number;
  phase: number;
  rate: number;
}

export interface Scenery {
  water: HTMLCanvasElement;
  sand: HTMLCanvasElement;
  farReef: Path2D;
  reef: Path2D;
  beams: Beam[];
}

export function buildScenery(background: HTMLImageElement): Scenery {
  const rng = new Rng(SCENERY_SEED);
  const tile = mirrorTile(background, WORLD_WIDTH, WORLD_HEIGHT);
  return {
    water: waterLayer(tile),
    sand: sandLayer(tile),
    farReef: reefPath(rng, 0.7),
    reef: reefPath(rng, 1),
    beams: makeBeams(rng, tile.width),
  };
}

export function drawScenery(ctx: CanvasRenderingContext2D, scenery: Scenery, distance: number, time: number): void {
  drawTiled(ctx, scenery.water, layerOffset(distance, PARALLAX.water, scenery.water.width), 0);
  drawBeams(ctx, scenery.beams, layerOffset(distance, PARALLAX.beams, scenery.water.width), scenery.water.width, time);
  drawReef(ctx, scenery.farReef, FAR_REEF_FILL, layerOffset(distance, PARALLAX.farReef, REEF_PERIOD));
  drawReef(ctx, scenery.reef, REEF_FILL, layerOffset(distance, PARALLAX.reef, REEF_PERIOD));
  drawTiled(ctx, scenery.sand, layerOffset(distance, PARALLAX.sand, scenery.sand.width), SAND_TOP);
}

/** Copies overlap by a pixel so no hairline shows where they meet at fractional x. */
function drawTiled(ctx: CanvasRenderingContext2D, layer: HTMLCanvasElement, offset: number, y: number): void {
  for (const x of tileOrigins(offset, layer.width, WORLD_WIDTH)) {
    ctx.drawImage(layer, x, y, layer.width + 1, layer.height);
  }
}

function drawReef(ctx: CanvasRenderingContext2D, reef: Path2D, fill: string, offset: number): void {
  ctx.fillStyle = fill;
  for (const x of tileOrigins(offset, REEF_PERIOD, WORLD_WIDTH)) {
    ctx.save();
    ctx.translate(x, 0);
    ctx.fill(reef);
    ctx.restore();
  }
}

/** The background with the sand replaced by water, continued straight down. */
function waterLayer(tile: HTMLCanvasElement): HTMLCanvasElement {
  const layer = canvas(tile.width, WORLD_HEIGHT);
  const ctx = context(layer);
  ctx.drawImage(tile, 0, 0, tile.width, SAND_TOP, 0, 0, tile.width, SAND_TOP);
  ctx.drawImage(tile, 0, SAND_TOP - 1, tile.width, 1, 0, SAND_TOP, tile.width, WORLD_HEIGHT - SAND_TOP);
  return layer;
}

/** The sand band with the water between the humps made transparent. */
function sandLayer(tile: HTMLCanvasElement): HTMLCanvasElement {
  const height = WORLD_HEIGHT - SAND_TOP;
  const layer = canvas(tile.width, height);
  const ctx = context(layer);
  ctx.drawImage(tile, 0, SAND_TOP, tile.width, height, 0, 0, tile.width, height);
  const pixels = ctx.getImageData(0, 0, tile.width, height);
  const { data } = pixels;
  for (let i = 0; i < data.length; i += 4) {
    if (isWaterPixel(data[i] ?? 0, data[i + 1] ?? 0, data[i + 2] ?? 0)) data[i + 3] = 0;
  }
  ctx.putImageData(pixels, 0, 0);
  return layer;
}

/**
 * Clusters of rounded rocks with kelp across one period, scaled by `size` for
 * distance. One path, so overlapping shapes fill as a single silhouette. Every
 * shape stays inside the period, so copies placed side by side never overlap.
 */
function reefPath(rng: Rng, size: number): Path2D {
  const path = new Path2D();
  const between = (min: number, max: number): number => min + rng.next() * (max - min);
  let x = between(20, 120);
  while (x < REEF_PERIOD - 300 * size) {
    const width = between(110, 260) * size;
    const rocks = 2 + rng.int(0, 2);
    for (let i = 0; i < rocks; i++) {
      const rx = between(0.25, 0.4) * width;
      const cx = x + rx + (i / Math.max(1, rocks - 1)) * (width - rx * 2);
      path.ellipse(cx, REEF_BASE, rx, between(40, 115) * size, 0, Math.PI, 0);
      path.closePath();
    }
    const blades = rng.int(1, 3);
    for (let i = 0; i < blades; i++) {
      kelp(path, x + between(0.1, 0.9) * width, between(120, 240) * size, between(-35, 35) * size, 11 * size);
    }
    x += width + between(50, 240) * size;
  }
  return path;
}

/** A curving blade with a rounded tip, rooted at (x, REEF_BASE). */
function kelp(path: Path2D, x: number, height: number, sway: number, halfWidth: number): void {
  const tipX = x + sway;
  const tipY = REEF_BASE - height;
  const tip = halfWidth * 0.8;
  path.moveTo(x - halfWidth, REEF_BASE);
  path.bezierCurveTo(x - halfWidth - sway * 0.4, REEF_BASE - height * 0.4, tipX - tip, tipY + height * 0.3, tipX - tip, tipY);
  path.arc(tipX, tipY, tip, Math.PI, 0);
  path.bezierCurveTo(tipX + tip, tipY + height * 0.3, x + halfWidth - sway * 0.4, REEF_BASE - height * 0.4, x + halfWidth, REEF_BASE);
  path.closePath();
}

function makeBeams(rng: Rng, period: number): Beam[] {
  return Array.from({ length: BEAM_COUNT }, (_, i) => ({
    x: ((i + rng.next() * 0.6) * period) / BEAM_COUNT,
    width: 50 + rng.next() * 90,
    lean: 60 + rng.next() * 80,
    phase: rng.next() * Math.PI * 2,
    rate: 0.35 + rng.next() * 0.5,
  }));
}

/** Soft slanting shafts of light whose brightness breathes on game time. */
function drawBeams(ctx: CanvasRenderingContext2D, beams: Beam[], offset: number, period: number, time: number): void {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const beam of beams) {
    const alpha = 0.05 + 0.05 * Math.sin(time * beam.rate + beam.phase);
    if (alpha <= 0.005) continue;
    const gradient = ctx.createLinearGradient(0, 0, 0, SAND_TOP);
    gradient.addColorStop(0, `rgba(190, 240, 255, ${alpha})`);
    gradient.addColorStop(1, 'rgba(190, 240, 255, 0)');
    ctx.fillStyle = gradient;
    for (const copy of [0, period]) {
      const x = beam.x - offset + copy;
      if (x + beam.lean + beam.width < 0 || x > WORLD_WIDTH) continue;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + beam.width * 0.6, 0);
      ctx.lineTo(x + beam.lean + beam.width, SAND_TOP);
      ctx.lineTo(x + beam.lean, SAND_TOP);
      ctx.closePath();
      ctx.fill();
    }
  }
  ctx.restore();
}

function canvas(width: number, height: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = width;
  c.height = height;
  return c;
}

function context(c: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = c.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('2D canvas not supported');
  return ctx;
}
