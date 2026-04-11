import { describe, it, expect } from 'vitest';
import {
  computeHomography,
  homographyToMatrix3d,
  fitRectToQuad,
} from './perspectiveMatrix';
import type { Point, Quad } from './perspectiveMatrix';

function applyH(h: number[], p: Point): Point {
  const w = h[6] * p.x + h[7] * p.y + h[8];
  return {
    x: (h[0] * p.x + h[1] * p.y + h[2]) / w,
    y: (h[3] * p.x + h[4] * p.y + h[5]) / w,
  };
}

const unit: Quad = [
  { x: 0, y: 0 },
  { x: 1, y: 0 },
  { x: 1, y: 1 },
  { x: 0, y: 1 },
];

describe('computeHomography', () => {
  it('identity: unit square → unit square maps every corner to itself', () => {
    const h = computeHomography(unit, unit);
    for (const p of unit) {
      const q = applyH(h, p);
      expect(q.x).toBeCloseTo(p.x, 9);
      expect(q.y).toBeCloseTo(p.y, 9);
    }
  });

  it('uniform scale by 2 maps the centre (0.5, 0.5) to (1, 1)', () => {
    const dst: Quad = [
      { x: 0, y: 0 },
      { x: 2, y: 0 },
      { x: 2, y: 2 },
      { x: 0, y: 2 },
    ];
    const h = computeHomography(unit, dst);
    const mid = applyH(h, { x: 0.5, y: 0.5 });
    expect(mid.x).toBeCloseTo(1, 9);
    expect(mid.y).toBeCloseTo(1, 9);
  });

  it('translation by (10, 20) maps the origin to (10, 20)', () => {
    const dst: Quad = [
      { x: 10, y: 20 },
      { x: 11, y: 20 },
      { x: 11, y: 21 },
      { x: 10, y: 21 },
    ];
    const h = computeHomography(unit, dst);
    const origin = applyH(h, { x: 0, y: 0 });
    expect(origin.x).toBeCloseTo(10, 9);
    expect(origin.y).toBeCloseTo(20, 9);
  });

  it('trapezoid: all 4 source corners round-trip to the destination corners', () => {
    const dst: Quad = [
      { x: 20, y: 10 },
      { x: 80, y: 5 },
      { x: 90, y: 50 },
      { x: 10, y: 55 },
    ];
    const h = computeHomography(unit, dst);
    for (let i = 0; i < 4; i++) {
      const q = applyH(h, unit[i]);
      expect(q.x).toBeCloseTo(dst[i].x, 6);
      expect(q.y).toBeCloseTo(dst[i].y, 6);
    }
  });
});

describe('homographyToMatrix3d', () => {
  it('produces a well-formed CSS matrix3d string with 16 values', () => {
    const h = computeHomography(unit, unit);
    const s = homographyToMatrix3d(h);
    expect(s.startsWith('matrix3d(')).toBe(true);
    expect(s.endsWith(')')).toBe(true);
    const body = s.slice('matrix3d('.length, -1);
    expect(body.split(',')).toHaveLength(16);
  });
});

describe('fitRectToQuad', () => {
  it('returns a matrix3d string for a valid rect → quad mapping', () => {
    const dst: Quad = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 50 },
      { x: 0, y: 50 },
    ];
    const s = fitRectToQuad(100, 50, dst);
    expect(s.startsWith('matrix3d(')).toBe(true);
  });
});
