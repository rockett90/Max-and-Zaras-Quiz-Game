/**
 * Gameplay tuning, in per-second units. Values reproduce the 2025 prototype's feel,
 * which ran at an assumed 60 frames per second (e.g. 3 px/frame scroll = 180 px/s).
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
  gravity: 1080, // px/s²
  jumpSpeed: 960, // px/s upward
};

export const SCROLL_SPEED = 180; // px/s

export const BUBBLE = {
  radius: 8,
  speed: 300, // px/s upward
  /** Launch point relative to the crab's top-left (its raised left claw). */
  offsetX: CRAB.width / 4.5,
  offsetY: CRAB.height * 0.5,
};

export const OBSTACLES = {
  rock: { width: 85, height: 58, y: GROUND_Y },
  seaweed: { width: 76, height: 150, y: GROUND_Y - 60 },
  spawnPerSecond: 0.6,
  minGap: 250, // px between the rightmost obstacle's left edge and the spawn point
};

export const BOXES = {
  size: 75,
  topY: GROUND_Y - 350,
  levelDrop: 20, // higher levels float slightly lower
  spawnPerSecond: 0.3,
  maxOnScreen: 3,
  minGap: 100,
};

export const POINTS_PER_LEVEL = 10;

export type Level = 1 | 2 | 3;
