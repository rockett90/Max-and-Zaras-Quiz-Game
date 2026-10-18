import { describe, expect, it } from 'vitest';
import { layerOffset, tileOrigins } from '../src/engine/parallax';
import { isWaterPixel } from '../src/game/scenery';

describe('layerOffset', () => {
  it('scales the distance by the factor and wraps at the period', () => {
    expect(layerOffset(0, 0.2, 2048)).toBe(0);
    expect(layerOffset(1000, 0.2, 2048)).toBeCloseTo(200);
    expect(layerOffset(2048 * 3 + 10, 1, 2048)).toBeCloseTo(10);
  });

  it('stays in range for negative distances', () => {
    expect(layerOffset(-10, 1, 2048)).toBeCloseTo(2038);
  });
});

describe('tileOrigins', () => {
  it('covers the view with copies starting at or left of zero', () => {
    expect(tileOrigins(0, 2048, 1024)).toEqual([0]);
    expect(tileOrigins(1500, 2048, 1024)).toEqual([-1500, 548]);
    expect(tileOrigins(100, 512, 1024)).toEqual([-100, 412, 924]);
  });
});

describe('isWaterPixel', () => {
  // Colours sampled from background.png around the sand line.
  it('treats deep blue as water and sand or its dark outline as not', () => {
    expect(isWaterPixel(15, 65, 140)).toBe(true);
    expect(isWaterPixel(17, 72, 150)).toBe(true);
    expect(isWaterPixel(192, 148, 33)).toBe(false);
    expect(isWaterPixel(30, 25, 20)).toBe(false);
  });
});
