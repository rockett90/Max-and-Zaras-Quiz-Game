import { describe, expect, it } from 'vitest';
import { circleHitsRect, rectsOverlap } from '../src/engine/collision';

const box = { x: 100, y: 100, width: 50, height: 50 };

describe('collision', () => {
  it('detects overlapping and separated rects', () => {
    expect(rectsOverlap(box, { x: 140, y: 140, width: 20, height: 20 })).toBe(true);
    expect(rectsOverlap(box, { x: 150, y: 100, width: 20, height: 20 })).toBe(false); // touching edge
  });

  it('detects a circle grazing a rect edge', () => {
    expect(circleHitsRect(125, 155, 8, box)).toBe(true);
    expect(circleHitsRect(125, 165, 8, box)).toBe(false);
    expect(circleHitsRect(155, 155, 8, box)).toBe(true); // near the corner
    expect(circleHitsRect(160, 160, 8, box)).toBe(false);
  });
});
