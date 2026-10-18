/**
 * Horizontal parallax: a layer scrolls at `factor` × the camera's distance and
 * repeats every `period` pixels. Pure maths here; drawing stays with the caller.
 */

/** How far the layer has scrolled left, wrapped into [0, period). */
export function layerOffset(distance: number, factor: number, period: number): number {
  const offset = (distance * factor) % period;
  return offset < 0 ? offset + period : offset;
}

/**
 * Left edges at which to draw one period-wide copy of a layer so that copies cover
 * [0, viewWidth). The first copy starts at or just left of 0.
 */
export function tileOrigins(offset: number, period: number, viewWidth: number): number[] {
  const origins: number[] = [];
  for (let x = 0 - offset; x < viewWidth; x += period) origins.push(x);
  return origins;
}

/**
 * A copy of `image` followed by its mirror image, so it tiles with no seam at any
 * width. The result is twice as wide.
 */
export function mirrorTile(image: CanvasImageSource, width: number, height: number): HTMLCanvasElement {
  const tile = document.createElement('canvas');
  tile.width = width * 2;
  tile.height = height;
  const ctx = tile.getContext('2d');
  if (!ctx) throw new Error('2D canvas not supported');
  ctx.drawImage(image, 0, 0, width, height);
  ctx.translate(width * 2, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(image, 0, 0, width, height);
  return tile;
}
