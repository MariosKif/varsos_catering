export type Point = { x: number; y: number };
export type Quad = [Point, Point, Point, Point];

/**
 * Solves the 2D projective homography that maps the source quad to the
 * destination quad. Returns a row-major 9-element matrix
 * [h0,h1,h2, h3,h4,h5, h6,h7,1]
 * where a point (x,y) maps to
 *   x' = (h0*x + h1*y + h2) / (h6*x + h7*y + 1)
 *   y' = (h3*x + h4*y + h5) / (h6*x + h7*y + 1)
 */
export function computeHomography(src: Quad, dst: Quad): number[] {
  // 8 linear equations in 8 unknowns (h0..h7), normalized so h8 = 1.
  // Per correspondence (x,y) -> (x',y'):
  //   h0*x + h1*y + h2 - h6*x*x' - h7*y*x' = x'
  //   h3*x + h4*y + h5 - h6*x*y' - h7*y*y' = y'
  const A: number[][] = [];
  const b: number[] = [];
  for (let i = 0; i < 4; i++) {
    const { x, y } = src[i];
    const { x: xp, y: yp } = dst[i];
    A.push([x, y, 1, 0, 0, 0, -x * xp, -y * xp]);
    b.push(xp);
    A.push([0, 0, 0, x, y, 1, -x * yp, -y * yp]);
    b.push(yp);
  }
  const h = solveLinear(A, b);
  return [...h, 1];
}

/** Gaussian elimination with partial pivoting. */
function solveLinear(A: number[][], b: number[]): number[] {
  const n = b.length;
  const M: number[][] = A.map((row, i) => [...row, b[i]]);
  for (let i = 0; i < n; i++) {
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(M[k][i]) > Math.abs(M[maxRow][i])) maxRow = k;
    }
    [M[i], M[maxRow]] = [M[maxRow], M[i]];
    for (let k = i + 1; k < n; k++) {
      const factor = M[k][i] / M[i][i];
      for (let j = i; j <= n; j++) {
        M[k][j] -= factor * M[i][j];
      }
    }
  }
  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let sum = M[i][n];
    for (let j = i + 1; j < n; j++) sum -= M[i][j] * x[j];
    x[i] = sum / M[i][i];
  }
  return x;
}

/**
 * Convert a 3x3 homography to a CSS matrix3d() string.
 * matrix3d is column-major with 16 values. The standard 2D-projective
 * embedding places homography columns/rows 1,2 and 4 on matrix columns
 * 1,2,4 with an identity z column/row in slot 3.
 */
export function homographyToMatrix3d(h: number[]): string {
  const [h0, h1, h2, h3, h4, h5, h6, h7] = h;
  // column-major:
  //   col0: h0, h3,  0, h6
  //   col1: h1, h4,  0, h7
  //   col2:  0,  0,  1,  0
  //   col3: h2, h5,  0,  1
  const m = [
    h0, h3, 0, h6,
    h1, h4, 0, h7,
     0,  0, 1,  0,
    h2, h5, 0,  1,
  ];
  return `matrix3d(${m.join(',')})`;
}

/**
 * Compute the matrix3d() that warps an element of natural size
 * (width × height), anchored at (0, 0), onto the destination quad
 * in the same pixel space.
 */
export function fitRectToQuad(
  width: number,
  height: number,
  dst: Quad
): string {
  const src: Quad = [
    { x: 0,     y: 0      },
    { x: width, y: 0      },
    { x: width, y: height },
    { x: 0,     y: height },
  ];
  return homographyToMatrix3d(computeHomography(src, dst));
}
