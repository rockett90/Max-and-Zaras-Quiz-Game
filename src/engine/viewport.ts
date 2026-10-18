/**
 * Letterboxed scaling. The game works in a fixed logical resolution; the stage
 * element (canvas plus DOM overlays) is scaled as one unit to fit any window.
 */

export interface Fit {
  scale: number;
  offsetX: number;
  offsetY: number;
}

export function computeFit(viewWidth: number, viewHeight: number, logicalWidth: number, logicalHeight: number): Fit {
  const scale = Math.min(viewWidth / logicalWidth, viewHeight / logicalHeight);
  return {
    scale,
    offsetX: (viewWidth - logicalWidth * scale) / 2,
    offsetY: (viewHeight - logicalHeight * scale) / 2,
  };
}

/** Highest backing-store multiplier we bother with; beyond this the art itself is the limit. */
const MAX_PIXEL_RATIO = 3;

/**
 * Keeps `stage` fitted inside `container` and `canvas` sharp at the current scale.
 *
 * `container` must be a fixed, overflow-hidden box covering the screen. Measuring the
 * window instead goes wrong on mobile: the unscaled stage widens the layout viewport
 * before the transform applies, so `innerWidth` reports the stage's width.
 * Returns a cleanup function.
 */
export function fitStage(
  container: HTMLElement,
  stage: HTMLElement,
  canvas: HTMLCanvasElement,
  logicalWidth: number,
  logicalHeight: number,
): () => void {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas not supported');
  stage.style.width = `${logicalWidth}px`;
  stage.style.height = `${logicalHeight}px`;
  stage.style.transformOrigin = '0 0';
  canvas.style.width = `${logicalWidth}px`;
  canvas.style.height = `${logicalHeight}px`;

  const apply = (): void => {
    const fit = computeFit(container.clientWidth, container.clientHeight, logicalWidth, logicalHeight);
    stage.style.transform = `translate(${fit.offsetX}px, ${fit.offsetY}px) scale(${fit.scale})`;
    const ratio = Math.min(fit.scale * window.devicePixelRatio, MAX_PIXEL_RATIO);
    canvas.width = Math.round(logicalWidth * ratio);
    canvas.height = Math.round(logicalHeight * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.imageSmoothingQuality = 'high';
  };

  apply();
  // Fires on window resizes, rotation and mobile toolbars showing/hiding.
  const observer = new ResizeObserver(apply);
  observer.observe(container);
  return () => observer.disconnect();
}
