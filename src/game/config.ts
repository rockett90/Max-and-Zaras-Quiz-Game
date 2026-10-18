/**
 * Gameplay tuning, in per-second units. Started from the 2025 prototype's feel
 * (3 px/frame at 60 fps = 180 px/s scroll), then sped up ~45% after Adam's M1
 * play-test found it slow.
 */

export const WORLD_WIDTH = 1024;
export const WORLD_HEIGHT = 768;

/** Top edge of the crab and rocks when resting on the seabed. */
export const GROUND_Y = 665;

export const ROUND_SECONDS = 120;

export const CRAB = {
  x: 100,
  width: 120,
  height: 86,
  gravity: 1800, // px/s²  (snappier: ~1.3 s in the air, was ~1.8 s)
  jumpSpeed: 1150, // px/s upward  (peak ~370 px, clears seaweed easily)
};

export const SCROLL_SPEED = 260; // px/s

export const BUBBLE = {
  radius: 8,
  speed: 520, // px/s upward
  /** Launch point relative to the crab's top-left (its raised left claw). */
  offsetX: CRAB.width / 4.5,
  offsetY: CRAB.height * 0.5,
};

export const OBSTACLES = {
  rock: { width: 85, height: 58, y: GROUND_Y },
  seaweed: { width: 76, height: 150, y: GROUND_Y - 60 },
  spawnPerSecond: 0.85,
  minGap: 250, // px between the rightmost obstacle's left edge and the spawn point
};

export const BOXES = {
  size: 75,
  topY: GROUND_Y - 350,
  levelDrop: 20, // higher levels float slightly lower
  spawnPerSecond: 0.45,
  maxOnScreen: 3,
  minGap: 100,
};

export const POINTS_PER_LEVEL = 10;

export type Level = 1 | 2 | 3;
