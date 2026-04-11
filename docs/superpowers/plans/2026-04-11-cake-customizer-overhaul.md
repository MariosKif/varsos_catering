# Cake Customizer Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the cake customizer's image pipeline so any uploaded image sits full-bleed on the cake's white print zone, correctly warped to its 3D perspective, with an interactive cover-fit crop tool.

**Architecture:** Two new pure-ish libraries (`perspectiveMatrix.ts`, `imagePipeline.ts`) plus a rewritten `HeroCakeCustomizer.astro` that uses CSS `matrix3d` to warp a rectangular overlay onto the cake's trapezoid print zone. Upload flow: EXIF-aware preprocess → inline crop mode (cover-fit default, drag + zoom) → render cropped canvas → display warped. No clip-path, no blend-mode, no blur-fill.

**Tech Stack:** Astro 5, TypeScript, Tailwind v4, GSAP, Vitest (new dev dep).

**Spec:** `docs/superpowers/specs/2026-04-11-cake-customizer-overhaul-design.md`

---

## Scope Note

This is one feature — the cake customizer image pipeline rewrite. It is a single subsystem, so it does not need to be split. Every task below produces a commit-able, runnable state.

---

## File Structure

```
src/
├── lib/
│   ├── perspectiveMatrix.ts        NEW (Task 2)
│   ├── perspectiveMatrix.test.ts   NEW (Task 2)
│   └── imagePipeline.ts            NEW (Task 3)
└── components/
    └── HeroCakeCustomizer.astro    MODIFY (Tasks 4, 5, 6, 7)

vitest.config.ts                    NEW (Task 1)
package.json                         MODIFY (Task 1)
```

`UploadControl.astro` and `ColorSelector.astro` are unchanged. The existing IDs (`cake-upload-input`, `upload-btn`, `change-btn`, `remove-btn`, `upload-actions`, `upload-error`) are preserved.

---

## Task 1: Install Vitest and wire test infrastructure

**Files:**
- Modify: `package.json` (add devDependency + test script)
- Create: `vitest.config.ts`

- [ ] **Step 1: Install Vitest**

Run:
```bash
cd /Users/marios/Desktop/Cursor/varsos_catering && npm install --save-dev vitest
```
Expected: `added N packages`, no errors. `package.json` now lists `vitest` under `devDependencies`.

- [ ] **Step 2: Add the `test` script to `package.json`**

Open `package.json` and add `"test": "vitest run"` inside the `"scripts"` block so it reads:

```json
{
  "name": "varsos-catering",
  "type": "module",
  "version": "0.0.1",
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "astro": "astro",
    "test": "vitest run"
  },
  ...
}
```

- [ ] **Step 3: Create `vitest.config.ts`**

Create `/Users/marios/Desktop/Cursor/varsos_catering/vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
  },
});
```

- [ ] **Step 4: Verify Vitest runs**

Run:
```bash
npm test
```
Expected: Vitest starts, reports `No test files found, exiting with code 1` (or similar). A non-zero exit here is fine — it means the runner is wired up; there are no tests yet. If Vitest itself fails to start (missing module, config error), stop and fix.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json vitest.config.ts
git commit -m "Add Vitest for unit testing the perspective math helpers"
```

---

## Task 2: `perspectiveMatrix.ts` — homography math (TDD)

**Files:**
- Create: `src/lib/perspectiveMatrix.ts`
- Create: `src/lib/perspectiveMatrix.test.ts`

This task follows a single red-green TDD cycle: write all the tests, run them and see them fail, implement the module, run them and see them pass, commit.

- [ ] **Step 1: Write the failing test file**

Create `/Users/marios/Desktop/Cursor/varsos_catering/src/lib/perspectiveMatrix.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the tests to see them fail**

Run:
```bash
npm test
```
Expected: Vitest reports the test file and fails with a module-resolution error like `Cannot find module './perspectiveMatrix'` or `Failed to load url`. This is the red state.

- [ ] **Step 3: Implement `src/lib/perspectiveMatrix.ts`**

Create `/Users/marios/Desktop/Cursor/varsos_catering/src/lib/perspectiveMatrix.ts`:

```ts
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
```

- [ ] **Step 4: Run the tests to see them pass**

Run:
```bash
npm test
```
Expected: All tests in `perspectiveMatrix.test.ts` pass. `Test Files  1 passed (1)`, `Tests  6 passed (6)`.

If anything fails, first suspect: column-major ordering in `homographyToMatrix3d`, or sign errors in the `A` matrix rows.

- [ ] **Step 5: Commit**

```bash
git add src/lib/perspectiveMatrix.ts src/lib/perspectiveMatrix.test.ts
git commit -m "Add perspectiveMatrix lib with homography + matrix3d helpers"
```

---

## Task 3: `imagePipeline.ts` — preprocess + render crop

**Files:**
- Create: `src/lib/imagePipeline.ts`

This module is browser-only (uses `createImageBitmap`, `<canvas>`, `URL.createObjectURL`). It is validated by the visual acceptance check in Task 7, not by unit tests.

- [ ] **Step 1: Create the file with full implementation**

Create `/Users/marios/Desktop/Cursor/varsos_catering/src/lib/imagePipeline.ts`:

```ts
/**
 * Image pipeline for the cake customizer.
 *
 * preprocessFile: decode a File with EXIF orientation applied and downscale
 * huge images to a cap on the long side, so downstream steps work with a
 * predictable-size ImageBitmap.
 *
 * renderCrop: draw a rectangular crop of a source bitmap onto a target-sized
 * canvas and return a blob URL ready to assign to an <img>.
 */

export interface PreprocessedImage {
  bitmap: ImageBitmap;
  width: number;
  height: number;
}

export interface CropRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const MAX_LONG_SIDE = 2400;
export const TARGET_W = 1100;
export const TARGET_H = 460;

export async function preprocessFile(file: File): Promise<PreprocessedImage> {
  let bitmap = await createImageBitmap(file, {
    imageOrientation: 'from-image',
    premultiplyAlpha: 'default',
    colorSpaceConversion: 'default',
  });

  const longSide = Math.max(bitmap.width, bitmap.height);
  if (longSide > MAX_LONG_SIDE) {
    const scale = MAX_LONG_SIDE / longSide;
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(bitmap, 0, 0, w, h);

    bitmap.close();
    bitmap = await createImageBitmap(canvas);
  }

  return { bitmap, width: bitmap.width, height: bitmap.height };
}

export async function renderCrop(
  source: ImageBitmap,
  crop: CropRect,
  target: { w: number; h: number },
  mime: 'image/jpeg' | 'image/png' = 'image/jpeg'
): Promise<string> {
  const canvas = document.createElement('canvas');
  canvas.width = target.w;
  canvas.height = target.h;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(
    source,
    crop.x, crop.y, crop.w, crop.h,
    0, 0, target.w, target.h
  );

  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => resolve(URL.createObjectURL(blob!)),
      mime,
      0.92
    );
  });
}
```

- [ ] **Step 2: Type-check the module**

Run:
```bash
npx astro check
```
Expected: `0 errors, 0 warnings, 0 hints`. If type errors in `imagePipeline.ts`, fix them before moving on.

- [ ] **Step 3: Commit**

```bash
git add src/lib/imagePipeline.ts
git commit -m "Add imagePipeline lib: EXIF-aware preprocess and renderCrop"
```

---

## Task 4: `HeroCakeCustomizer.astro` — markup + baseline script with auto cover-fit

This is the big structural change. After this task the site is fully working with the new pipeline — uploads get auto cover-cropped to the target aspect and displayed on the warped plate. The interactive crop UI is added in Task 5.

**Files:**
- Modify: `src/components/HeroCakeCustomizer.astro` (full rewrite of the `#cake-wrapper` markup and the `<script>` block)

- [ ] **Step 1: Replace the `#cake-wrapper` markup**

Open `/Users/marios/Desktop/Cursor/varsos_catering/src/components/HeroCakeCustomizer.astro`. Replace the entire `<div id="cake-wrapper">…</div>` block (currently around lines 65–124 — the `<img>`, the `#overlay-container` with its clip-path, the placeholder, and the `#drop-highlight`) with this new structure:

```astro
      <div id="cake-wrapper" class="relative mx-auto select-none overflow-hidden rounded-2xl">
        <img
          id="cake-image"
          src="/images/cake-base.jpg"
          alt="Βάση τούρτας με λευκή περιοχή εκτύπωσης και ροζ γλάσο"
          class="block w-full h-auto transition-[filter] duration-300 ease-in-out"
          width="1536"
          height="1024"
          draggable="false"
        />

        {/* ── Display layer ─────────────────────────────────────
             Shown whenever the user is not actively cropping. Holds
             the warped white print plate and the overlay image, both
             sized to the TARGET_W × TARGET_H nominal rectangle and
             transformed with matrix3d into the cake's print-zone quad. */}
        <div id="display-layer" class="absolute inset-0">
          <div
            id="print-plate"
            class="pointer-events-none absolute left-0 top-0 origin-top-left bg-white will-change-transform"
            style="width: 1100px; height: 460px;"
            aria-hidden="true"
          ></div>
          <img
            id="image-overlay"
            src=""
            alt=""
            class="hidden pointer-events-none absolute left-0 top-0 origin-top-left will-change-transform"
            style="width: 1100px; height: 460px; filter: drop-shadow(0 1px 2px rgba(0,0,0,.08));"
            draggable="false"
          />
          <div
            id="preview-placeholder"
            class="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 text-center"
          >
            <svg class="h-10 w-10 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21zM9.75 9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
            </svg>
            <span class="text-xs font-medium text-gray-400 sm:text-sm">
              Η εικόνα σου εδώ
            </span>
          </div>
        </div>

        {/* drop zone highlight */}
        <div
          id="drop-highlight"
          class="pointer-events-none absolute inset-0 hidden rounded-2xl border-2 border-dashed border-brand-500 bg-brand-500/10 transition-opacity"
          aria-hidden="true"
        ></div>
      </div>
```

No `#crop-layer` yet — that comes in Task 5. No `clip-path`, no `mix-blend-mode` — they are gone for good.

- [ ] **Step 2: Replace the `<script>` block**

Replace the entire `<script>…</script>` block at the bottom of `HeroCakeCustomizer.astro` with:

```astro
<script>
  import { gsap } from 'gsap';
  import { ScrollTrigger } from 'gsap/ScrollTrigger';
  import { fitRectToQuad, type Quad } from '../lib/perspectiveMatrix';
  import {
    preprocessFile,
    renderCrop,
    TARGET_W,
    TARGET_H,
    type CropRect,
  } from '../lib/imagePipeline';

  gsap.registerPlugin(ScrollTrigger);

  /* ── Constants ─────────────────────────────────────── */
  const MAX_FILE_SIZE = 5 * 1024 * 1024;
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
  const ASPECT = TARGET_W / TARGET_H;

  // Cake print-zone corners in % of the cake wrapper's rendered size.
  // Starting values from the existing clip-path math; fine-tuned in Task 7.
  const PRINT_ZONE_CORNERS_PCT = {
    tl: { x: 18.22, y: 17.78 },
    tr: { x: 82.78, y: 17.19 },
    br: { x: 86.78, y: 62.03 },
    bl: { x: 15.36, y: 61.73 },
  };

  /* ── DOM refs ──────────────────────────────────────── */
  const cakeImage     = document.getElementById('cake-image')       as HTMLImageElement;
  const cakeWrapper   = document.getElementById('cake-wrapper')!;
  const printPlate    = document.getElementById('print-plate')      as HTMLDivElement;
  const overlayImg    = document.getElementById('image-overlay')    as HTMLImageElement;
  const placeholder   = document.getElementById('preview-placeholder')!;
  const dropHighlight = document.getElementById('drop-highlight')!;
  const uploadInput   = document.getElementById('cake-upload-input') as HTMLInputElement;
  const uploadBtn     = document.getElementById('upload-btn')!;
  const changeBtn     = document.getElementById('change-btn')!;
  const removeBtn     = document.getElementById('remove-btn')!;
  const uploadActions = document.getElementById('upload-actions')!;
  const uploadError   = document.getElementById('upload-error')!;
  const colorBtns     = document.querySelectorAll<HTMLButtonElement>('[data-color-btn]');

  /* ── File validation ────────────────────────────────── */
  function validateFile(file: File): string | null {
    if (!ALLOWED_TYPES.includes(file.type)) return 'Μόνο αρχεία JPG, PNG ή WebP.';
    if (file.size > MAX_FILE_SIZE) return 'Το αρχείο υπερβαίνει τα 5 MB.';
    return null;
  }

  function showError(msg: string) {
    uploadError.textContent = msg;
    uploadError.classList.remove('hidden');
    setTimeout(() => uploadError.classList.add('hidden'), 4000);
  }

  /* ── Perspective warp ───────────────────────────────── */
  function getPrintZoneQuad(): Quad {
    const rect = cakeWrapper.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    const p = PRINT_ZONE_CORNERS_PCT;
    return [
      { x: (p.tl.x / 100) * w, y: (p.tl.y / 100) * h },
      { x: (p.tr.x / 100) * w, y: (p.tr.y / 100) * h },
      { x: (p.br.x / 100) * w, y: (p.br.y / 100) * h },
      { x: (p.bl.x / 100) * w, y: (p.bl.y / 100) * h },
    ];
  }

  let warpPending = false;
  function applyWarp() {
    if (warpPending) return;
    warpPending = true;
    requestAnimationFrame(() => {
      warpPending = false;
      const matrix = fitRectToQuad(TARGET_W, TARGET_H, getPrintZoneQuad());
      printPlate.style.transform = matrix;
      overlayImg.style.transform = matrix;
    });
  }

  const ro = new ResizeObserver(() => applyWarp());
  ro.observe(cakeWrapper);
  if (cakeImage.complete) applyWarp();
  else cakeImage.addEventListener('load', () => applyWarp(), { once: true });

  /* ── Overlay URL lifecycle ─────────────────────────── */
  let objectUrl: string | null = null;

  function setOverlayUrl(url: string) {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    objectUrl = url;
    overlayImg.src = url;
    overlayImg.alt = 'Προεπισκόπηση σχεδίου τούρτας';
    overlayImg.classList.remove('hidden');
    placeholder.classList.add('hidden');
    gsap.fromTo(overlayImg, { opacity: 0 }, { opacity: 1, duration: 0.4, ease: 'power2.out' });
    uploadBtn.classList.add('hidden');
    uploadActions.classList.remove('hidden');
    uploadActions.classList.add('flex');
    uploadError.classList.add('hidden');
  }

  function clearImage() {
    gsap.to(overlayImg, {
      opacity: 0,
      duration: 0.3,
      ease: 'power2.in',
      onComplete: () => {
        if (objectUrl) { URL.revokeObjectURL(objectUrl); objectUrl = null; }
        overlayImg.src = '';
        overlayImg.alt = '';
        overlayImg.classList.add('hidden');
      },
    });
    placeholder.classList.remove('hidden');
    gsap.fromTo(placeholder, { opacity: 0 }, { opacity: 1, duration: 0.3, delay: 0.2 });
    uploadBtn.classList.remove('hidden');
    uploadActions.classList.add('hidden');
    uploadActions.classList.remove('flex');
    uploadInput.value = '';
    uploadError.classList.add('hidden');
  }

  /* ── Upload flow: auto cover-fit crop, no interactive UI yet ── */
  let uploadToken = 0;

  async function handleUpload(file: File) {
    const error = validateFile(file);
    if (error) { showError(error); return; }

    const token = ++uploadToken;
    let pre;
    try {
      pre = await preprocessFile(file);
    } catch {
      showError('Δεν ήταν δυνατή η ανάγνωση της εικόνας.');
      return;
    }
    if (token !== uploadToken) { pre.bitmap.close(); return; }

    // Cover-fit: crop a centred rectangle of TARGET aspect out of the bitmap.
    const srcAspect = pre.width / pre.height;
    let cw: number, ch: number;
    if (srcAspect > ASPECT) {
      // image is wider than target: full height, cropped width
      ch = pre.height;
      cw = Math.round(ch * ASPECT);
    } else {
      // image is taller than target: full width, cropped height
      cw = pre.width;
      ch = Math.round(cw / ASPECT);
    }
    const crop: CropRect = {
      x: Math.round((pre.width - cw) / 2),
      y: Math.round((pre.height - ch) / 2),
      w: cw,
      h: ch,
    };

    const url = await renderCrop(pre.bitmap, crop, { w: TARGET_W, h: TARGET_H }, 'image/jpeg');
    pre.bitmap.close();
    if (token !== uploadToken) { URL.revokeObjectURL(url); return; }

    setOverlayUrl(url);
    applyWarp();
    changeBtn.focus();
  }

  uploadInput.addEventListener('change', () => {
    const file = uploadInput.files?.[0];
    if (file) handleUpload(file);
  });
  uploadBtn.addEventListener('click', () => uploadInput.click());
  changeBtn.addEventListener('click', () => { uploadInput.value = ''; uploadInput.click(); });
  removeBtn.addEventListener('click', clearImage);

  /* ── Drag & drop ────────────────────────────────────── */
  function preventDefaults(e: Event) { e.preventDefault(); e.stopPropagation(); }
  (['dragenter', 'dragover'] as const).forEach(evt =>
    cakeWrapper.addEventListener(evt, (e) => { preventDefaults(e); dropHighlight.classList.remove('hidden'); })
  );
  (['dragleave', 'drop'] as const).forEach(evt =>
    cakeWrapper.addEventListener(evt, (e) => { preventDefaults(e); dropHighlight.classList.add('hidden'); })
  );
  cakeWrapper.addEventListener('drop', (e) => {
    const file = (e as DragEvent).dataTransfer?.files[0];
    if (file) handleUpload(file);
  });

  /* ── Frosting color ─────────────────────────────────── */
  colorBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const filter = btn.dataset.filter ?? 'hue-rotate(0deg)';
      cakeImage.style.filter = filter;
      colorBtns.forEach((b) => {
        const isActive = b === btn;
        b.setAttribute('aria-checked', String(isActive));
        b.classList.toggle('border-gray-900', isActive);
        b.classList.toggle('ring-2', isActive);
        b.classList.toggle('ring-gray-900', isActive);
        b.classList.toggle('ring-offset-2', isActive);
        b.classList.toggle('scale-110', isActive);
        b.classList.toggle('border-white', !isActive);
        b.classList.toggle('shadow-md', !isActive);
        const icon = b.querySelector('.check-icon') as HTMLElement | null;
        if (icon) {
          icon.classList.toggle('opacity-100', isActive);
          icon.classList.toggle('opacity-0', !isActive);
        }
      });
    });
  });

  /* ── GSAP entrance animations ───────────────────────── */
  gsap.defaults({ ease: 'power3.out' });
  gsap.from('[data-gsap-fade]', {
    y: 30,
    opacity: 0,
    duration: 0.9,
    stagger: 0.15,
    delay: 0.2,
  });
</script>
```

- [ ] **Step 3: Type-check**

Run:
```bash
npx astro check
```
Expected: `0 errors, 0 warnings, 0 hints`.

- [ ] **Step 4: Smoke-test in the dev server**

Run the dev server in the background:
```bash
npm run dev
```
Open the printed URL (e.g. `http://localhost:4321/` or `4322/`). Verify by eye:
1. The hero loads. The cake is visible. A **white plate** sits warped over the cake's print zone (the baked text is already gone; the plate is there for defence-in-depth). The placeholder icon + "Η εικόνα σου εδώ" sit inside the plate area.
2. Click "Ανέβασε το σχέδιό σου" and pick any landscape JPG. It should appear on the cake, full-bleed, center-cropped to the target aspect, sitting on top of the warped plate.
3. Try a portrait JPG — it should center-crop to the middle landscape slice (the top/bottom of the portrait get cut off), no bars, no blur.
4. Change frosting color — the hue-rotate still applies only to the cake, not to the overlay.
5. Resize the browser window — the warp follows the cake's new size without stalling.
6. Click "Αφαίρεση" — the overlay fades out, placeholder returns.

If anything fails, fix before committing. Common suspects:
- `matrix3d` transform not applied → inspect `#print-plate` in devtools; should have `transform: matrix3d(…)` with 16 numbers.
- Placeholder still showing over the image → check the `classList.add('hidden')` in `setOverlayUrl`.
- Overlay appears but not warped → the `ResizeObserver` didn't fire before the first render; check the `cakeImage.addEventListener('load', …)` path.

- [ ] **Step 5: Commit**

Stop the dev server (Ctrl-C in the tab running it, or kill the background process).

```bash
git add src/components/HeroCakeCustomizer.astro
git commit -m "Rewrite cake customizer: matrix3d perspective warp + auto cover-fit pipeline"
```

---

## Task 5: Add interactive crop UI (apply / cancel, no pan/zoom yet)

After this task, uploads open an inline crop preview showing the cover-fit result. The user can accept or cancel. Dragging and zooming come in Task 6.

**Files:**
- Modify: `src/components/HeroCakeCustomizer.astro`

- [ ] **Step 1: Add the crop-layer markup**

Inside `#cake-wrapper`, add a new sibling **after** `#display-layer` and **before** `#drop-highlight`:

```astro
        {/* ── Crop layer — shown only while the user is adjusting a fresh upload ── */}
        <div id="crop-layer" class="absolute inset-0 hidden">
          <canvas id="crop-canvas" class="absolute inset-0 block h-full w-full touch-none"></canvas>
          <div id="crop-controls" class="absolute inset-x-0 bottom-3 flex justify-center gap-3 px-4">
            <button
              type="button"
              id="crop-cancel-btn"
              class="rounded-full bg-white/95 px-5 py-2 text-sm font-semibold text-gray-900 shadow-lg ring-1 ring-gray-900/10 backdrop-blur transition-all hover:bg-white active:scale-95"
            >
              Ακύρωση
            </button>
            <button
              type="button"
              id="crop-apply-btn"
              class="rounded-full bg-gray-900 px-5 py-2 text-sm font-semibold text-white shadow-lg transition-all hover:bg-gray-800 active:scale-95"
            >
              Εφαρμογή
            </button>
          </div>
        </div>
```

- [ ] **Step 2: Add DOM refs and imports for the new elements**

In the `<script>` block, in the `/* ── DOM refs ── */` section, add:

```ts
  const displayLayer  = document.getElementById('display-layer')!;
  const cropLayer     = document.getElementById('crop-layer')!;
  const cropCanvas    = document.getElementById('crop-canvas')      as HTMLCanvasElement;
  const cropApplyBtn  = document.getElementById('crop-apply-btn')!;
  const cropCancelBtn = document.getElementById('crop-cancel-btn')!;
```

Also, the existing `type CropRect` import is already there — no change.

- [ ] **Step 3: Replace the `handleUpload` function with `enterCropMode` + companions**

Delete the entire block that starts with the comment `/* ── Upload flow: auto cover-fit crop, no interactive UI yet ── */` and ends at the last `}` of the `handleUpload` function definition (inclusive of the `let uploadToken = 0;` declaration — the new block below re-declares it). Do **not** delete the `uploadInput.addEventListener(...)` block that follows; that stays.

In the deleted block's place, add:

```ts
  /* ── Crop mode state ───────────────────────────────── */
  type CropState = {
    bitmap: ImageBitmap;
    canvasW: number;
    canvasH: number;
    imgScale: number;
    imgX: number;
    imgY: number;
    frame: { x: number; y: number; w: number; h: number };
  };
  let cropState: CropState | null = null;
  let uploadToken = 0;

  function sizeCropCanvas(): { w: number; h: number } {
    const dpr = window.devicePixelRatio || 1;
    const rect = cakeWrapper.getBoundingClientRect();
    cropCanvas.width = Math.round(rect.width * dpr);
    cropCanvas.height = Math.round(rect.height * dpr);
    cropCanvas.style.width = `${rect.width}px`;
    cropCanvas.style.height = `${rect.height}px`;
    const ctx = cropCanvas.getContext('2d')!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { w: rect.width, h: rect.height };
  }

  function minCoverScale(): number {
    if (!cropState) return 1;
    const { bitmap, frame } = cropState;
    return Math.max(frame.w / bitmap.width, frame.h / bitmap.height);
  }

  function clampCropState() {
    if (!cropState) return;
    const { bitmap, imgScale, frame } = cropState;
    const imgW = bitmap.width * imgScale;
    const imgH = bitmap.height * imgScale;
    // Frame must be fully inside rendered image → bound imgX, imgY.
    const minX = frame.x + frame.w - imgW;
    const maxX = frame.x;
    const minY = frame.y + frame.h - imgH;
    const maxY = frame.y;
    cropState.imgX = Math.min(maxX, Math.max(minX, cropState.imgX));
    cropState.imgY = Math.min(maxY, Math.max(minY, cropState.imgY));
  }

  let drawPending = false;
  function drawCropCanvas() {
    if (drawPending || !cropState) return;
    drawPending = true;
    requestAnimationFrame(() => {
      drawPending = false;
      if (!cropState) return;
      const { bitmap, canvasW, canvasH, imgScale, imgX, imgY, frame } = cropState;
      const ctx = cropCanvas.getContext('2d')!;
      ctx.clearRect(0, 0, canvasW, canvasH);
      ctx.drawImage(
        bitmap,
        imgX, imgY,
        bitmap.width * imgScale,
        bitmap.height * imgScale
      );
      // Dim everything outside the crop frame (4 rects around it).
      ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
      ctx.fillRect(0, 0, canvasW, frame.y);
      ctx.fillRect(0, frame.y + frame.h, canvasW, canvasH - (frame.y + frame.h));
      ctx.fillRect(0, frame.y, frame.x, frame.h);
      ctx.fillRect(frame.x + frame.w, frame.y, canvasW - (frame.x + frame.w), frame.h);
      // White frame outline for visibility.
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.strokeRect(frame.x + 1, frame.y + 1, frame.w - 2, frame.h - 2);
    });
  }

  async function enterCropMode(file: File) {
    const error = validateFile(file);
    if (error) { showError(error); return; }

    const token = ++uploadToken;
    let pre;
    try {
      pre = await preprocessFile(file);
    } catch {
      showError('Δεν ήταν δυνατή η ανάγνωση της εικόνας.');
      return;
    }
    if (token !== uploadToken) { pre.bitmap.close(); return; }

    displayLayer.classList.add('hidden');
    cropLayer.classList.remove('hidden');

    const { w: canvasW, h: canvasH } = sizeCropCanvas();

    // Crop frame: inset from canvas edges, locked to ASPECT.
    const frameMargin = 16;
    let frameW = canvasW - frameMargin * 2;
    let frameH = frameW / ASPECT;
    if (frameH > canvasH - frameMargin * 2) {
      frameH = canvasH - frameMargin * 2;
      frameW = frameH * ASPECT;
    }
    const frame = {
      x: (canvasW - frameW) / 2,
      y: (canvasH - frameH) / 2,
      w: frameW,
      h: frameH,
    };

    // COVER-FIT initial scale: frame must be fully covered by the image.
    const imgScale = Math.max(frame.w / pre.width, frame.h / pre.height);
    // Centre the image on the frame centre.
    const imgX = frame.x + frame.w / 2 - (pre.width * imgScale) / 2;
    const imgY = frame.y + frame.h / 2 - (pre.height * imgScale) / 2;

    cropState = { bitmap: pre.bitmap, canvasW, canvasH, imgScale, imgX, imgY, frame };
    drawCropCanvas();
  }

  async function applyCrop() {
    if (!cropState) return;
    const { bitmap, frame, imgScale, imgX, imgY } = cropState;
    const crop: CropRect = {
      x: (frame.x - imgX) / imgScale,
      y: (frame.y - imgY) / imgScale,
      w: frame.w / imgScale,
      h: frame.h / imgScale,
    };
    const url = await renderCrop(bitmap, crop, { w: TARGET_W, h: TARGET_H }, 'image/jpeg');
    bitmap.close();
    cropState = null;

    cropLayer.classList.add('hidden');
    displayLayer.classList.remove('hidden');
    setOverlayUrl(url);
    applyWarp();
    changeBtn.focus();
  }

  function cancelCrop() {
    if (cropState) {
      cropState.bitmap.close();
      cropState = null;
    }
    uploadInput.value = '';
    cropLayer.classList.add('hidden');
    displayLayer.classList.remove('hidden');
  }

  cropApplyBtn.addEventListener('click', () => { applyCrop(); });
  cropCancelBtn.addEventListener('click', cancelCrop);
```

- [ ] **Step 4: Route uploads through crop mode**

Find these three lines in the script:

```ts
  uploadInput.addEventListener('change', () => {
    const file = uploadInput.files?.[0];
    if (file) handleUpload(file);
  });
```

and

```ts
  cakeWrapper.addEventListener('drop', (e) => {
    const file = (e as DragEvent).dataTransfer?.files[0];
    if (file) handleUpload(file);
  });
```

Replace `handleUpload(file)` with `enterCropMode(file)` in both places. The two updated blocks:

```ts
  uploadInput.addEventListener('change', () => {
    const file = uploadInput.files?.[0];
    if (file) enterCropMode(file);
  });
```

```ts
  cakeWrapper.addEventListener('drop', (e) => {
    const file = (e as DragEvent).dataTransfer?.files[0];
    if (file) enterCropMode(file);
  });
```

- [ ] **Step 5: Type-check**

Run:
```bash
npx astro check
```
Expected: `0 errors, 0 warnings, 0 hints`.

- [ ] **Step 6: Smoke-test in the dev server**

Run `npm run dev` and verify:
1. Upload any image → `#display-layer` hides, `#crop-layer` shows a full-wrapper canvas with the image rendered at cover-fit scale. The crop frame is centred and visible as a dimmed border with a white outline.
2. Click "Εφαρμογή" → crop layer hides, display layer returns, the image is warped onto the cake matching what was inside the frame. Change/Remove actions are visible.
3. Upload a second image → new crop session starts.
4. Upload → click "Ακύρωση" → returns to display layer with the previous overlay (or placeholder) intact. Upload button is visible again.
5. Drag-and-drop from Finder → same crop flow starts.

- [ ] **Step 7: Commit**

Stop the dev server.

```bash
git add src/components/HeroCakeCustomizer.astro
git commit -m "Add inline crop preview with apply/cancel in cake customizer"
```

---

## Task 6: Add pan + zoom interactions inside crop mode

**Files:**
- Modify: `src/components/HeroCakeCustomizer.astro` (`<script>` block only)

- [ ] **Step 1: Add pointer + wheel handlers below `cropCancelBtn.addEventListener(...)`**

In the `<script>` block, find the line:

```ts
  cropCancelBtn.addEventListener('click', cancelCrop);
```

Immediately after it, add:

```ts
  /* ── Crop mode interactions: drag-pan, wheel-zoom, pinch-zoom ── */
  const activePointers = new Map<number, { x: number; y: number }>();
  let dragLast: { x: number; y: number } | null = null;
  let pinchStart:
    | { dist: number; scale: number; midX: number; midY: number }
    | null = null;

  function canvasPointFromEvent(e: PointerEvent | WheelEvent): { x: number; y: number } {
    const r = cropCanvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  cropCanvas.addEventListener('pointerdown', (e) => {
    if (!cropState) return;
    cropCanvas.setPointerCapture(e.pointerId);
    activePointers.set(e.pointerId, canvasPointFromEvent(e));
    if (activePointers.size === 1) {
      dragLast = canvasPointFromEvent(e);
      pinchStart = null;
    } else if (activePointers.size === 2) {
      const pts = [...activePointers.values()];
      const dx = pts[0].x - pts[1].x;
      const dy = pts[0].y - pts[1].y;
      pinchStart = {
        dist: Math.hypot(dx, dy),
        scale: cropState.imgScale,
        midX: (pts[0].x + pts[1].x) / 2,
        midY: (pts[0].y + pts[1].y) / 2,
      };
      dragLast = null;
    }
  });

  cropCanvas.addEventListener('pointermove', (e) => {
    if (!cropState || !activePointers.has(e.pointerId)) return;
    const pt = canvasPointFromEvent(e);
    activePointers.set(e.pointerId, pt);

    if (activePointers.size === 1 && dragLast) {
      cropState.imgX += pt.x - dragLast.x;
      cropState.imgY += pt.y - dragLast.y;
      dragLast = pt;
      clampCropState();
      drawCropCanvas();
    } else if (activePointers.size === 2 && pinchStart) {
      const pts = [...activePointers.values()];
      const dx = pts[0].x - pts[1].x;
      const dy = pts[0].y - pts[1].y;
      const dist = Math.hypot(dx, dy);
      const rawScale = pinchStart.scale * (dist / pinchStart.dist);
      const minS = minCoverScale();
      const clamped = Math.max(minS, Math.min(minS * 6, rawScale));
      // Keep pinch midpoint anchored in image coordinates.
      const mx = pinchStart.midX;
      const my = pinchStart.midY;
      const relX = (mx - cropState.imgX) / cropState.imgScale;
      const relY = (my - cropState.imgY) / cropState.imgScale;
      cropState.imgScale = clamped;
      cropState.imgX = mx - relX * clamped;
      cropState.imgY = my - relY * clamped;
      clampCropState();
      drawCropCanvas();
    }
  });

  function endPointer(e: PointerEvent) {
    activePointers.delete(e.pointerId);
    if (activePointers.size < 2) pinchStart = null;
    if (activePointers.size === 0) dragLast = null;
  }
  cropCanvas.addEventListener('pointerup', endPointer);
  cropCanvas.addEventListener('pointercancel', endPointer);

  cropCanvas.addEventListener(
    'wheel',
    (e) => {
      if (!cropState) return;
      e.preventDefault();
      const pt = canvasPointFromEvent(e);
      const factor = Math.exp(-e.deltaY * 0.0015);
      const rawScale = cropState.imgScale * factor;
      const minS = minCoverScale();
      const clamped = Math.max(minS, Math.min(minS * 6, rawScale));
      // Zoom around the cursor position.
      const relX = (pt.x - cropState.imgX) / cropState.imgScale;
      const relY = (pt.y - cropState.imgY) / cropState.imgScale;
      cropState.imgScale = clamped;
      cropState.imgX = pt.x - relX * clamped;
      cropState.imgY = pt.y - relY * clamped;
      clampCropState();
      drawCropCanvas();
    },
    { passive: false }
  );
```

- [ ] **Step 2: Type-check**

Run:
```bash
npx astro check
```
Expected: `0 errors, 0 warnings, 0 hints`.

- [ ] **Step 3: Smoke-test drag and zoom**

Run `npm run dev`. Upload a landscape image and verify in the crop canvas:

1. **Mouse drag** — click-and-drag on the canvas moves the image. The crop frame never reveals a gap (clamping works).
2. **Wheel zoom** — scroll-wheel zooms in/out around the cursor. The frame is always fully covered. Scrolling past the minimum scale clamps at cover-fit. Scrolling in zooms up to ~6× cover.
3. **Touch** (Chrome devtools → device mode → iPhone viewport) — one-finger drag pans, two-finger pinch zooms around the midpoint, no page scrolling happens during the gesture.
4. **Apply** after zooming/panning → the resulting overlay on the cake reflects what was inside the frame.

Edge cases to try:
- Upload a tiny 300×200 image → it upscales to cover and you can still pan within the cover range.
- Upload a very wide panorama (e.g. 4000×600) → it cover-fits with room to pan left/right.
- Upload a very tall portrait (3:4) → it cover-fits with room to pan up/down.

- [ ] **Step 4: Commit**

Stop the dev server.

```bash
git add src/components/HeroCakeCustomizer.astro
git commit -m "Add drag-pan, wheel-zoom, and pinch-zoom to crop mode"
```

---

## Task 7: Fine-tune perspective corners + full visual acceptance

The starting `PRINT_ZONE_CORNERS_PCT` values were derived from the old clip-path math and are approximate. This task dials them in visually and runs the full acceptance checklist from the spec.

**Files:**
- Modify: `src/components/HeroCakeCustomizer.astro` (`PRINT_ZONE_CORNERS_PCT` constant only)

- [ ] **Step 1: Start the dev server and prep a test image**

```bash
npm run dev
```

Prepare a test image: a **solid bright magenta PNG** at roughly 1200×500, or a photo with a clear rectangular pattern (a book cover, a screenshot with a border). The bright colour or grid lines make it obvious where the plate edges land.

- [ ] **Step 2: Upload the test image, apply, observe**

Upload → Εφαρμογή → look at the cake with fresh eyes. Check each corner of the warped overlay against the inner edge of the pink frosting border on the cake:

| Edge | Expectation |
|---|---|
| Top edge | Hugs the inner top of the pink border without crossing onto it, left-to-right |
| Bottom edge | Same for the bottom |
| Left edge | Sits just inside the vertical pink stripe on the left |
| Right edge | Sits just inside the vertical pink stripe on the right |

Note which corners are off and in which direction (up/down/left/right).

- [ ] **Step 3: Nudge the corner percentages**

In `HeroCakeCustomizer.astro`, edit `PRINT_ZONE_CORNERS_PCT`. Move corners in increments of **0.2–0.5 percentage points**. Example: if the top edge of the overlay sits ~4 px above the pink border on a 700-px-wide rendered cake, that's ~0.6% of the cake height — lower both `tl.y` and `tr.y` by ~0.6.

After each edit, save the file; Astro HMR re-runs the script and the warp updates instantly. Iterate until all four edges visually snap to the pink border.

Do **not** chase sub-pixel accuracy — the cake photo's pink border is several pixels thick, so "within 1–2 px" at the rendered size is perfect.

- [ ] **Step 4: Run the full visual acceptance checklist**

With the corners dialled in, upload each of the following and verify. Take a quick mental note of anything that looks wrong:

- [ ] Landscape JPG (~2:1) — fits naturally, minimal cropping.
- [ ] Portrait JPG from a phone (3:4) — zoomed in on the centre, full-bleed, no bars.
- [ ] Square PNG — slight zoom, full-bleed, centered.
- [ ] Huge image (take any 4000×6000+ JPG) — preprocesses without jank, fills frame.
- [ ] Image with EXIF rotation (a phone photo held vertically) — arrives upright.
- [ ] Small image (~300×200) — upscaled to cover, mildly soft but no bars.
- [ ] WebP — same behaviour as JPG.
- [ ] Drag-and-drop from Finder — same as file picker.
- [ ] Pan inside crop frame — no gap ever revealed at any edge.
- [ ] Wheel zoom in/out — no gap, zooms around cursor.
- [ ] Cancel during crop — returns cleanly to the previous state.
- [ ] Apply → switch frosting color — hue-rotate still affects cake only, overlay untouched.
- [ ] Browser resize — warp follows smoothly without visible stutter.
- [ ] Mobile viewport (Chrome devtools iPhone 14) — drag and pinch work; apply button is tappable.

Any failure → stop and diagnose before proceeding. Common failures and fixes:
- **Overlay drifts on resize** — the `ResizeObserver` is observing the wrong element, or the corners were hard-coded in px somewhere instead of recomputed from %.
- **Pinch zoom feels wrong** — recheck the `relX/relY` anchor math in the `pointermove` pinch branch.
- **EXIF not respected** — `createImageBitmap`'s `imageOrientation: 'from-image'` requires a recent browser; confirm you're not running Safari Technology Preview from 2019.

- [ ] **Step 5: Final type check and build**

Stop the dev server.

```bash
npx astro check && npm run build
```
Expected: both succeed with zero errors. The production build verifies the module imports resolve end-to-end.

- [ ] **Step 6: Commit**

```bash
git add src/components/HeroCakeCustomizer.astro
git commit -m "Fine-tune cake print-zone perspective corners"
```

---

## Summary of final file tree

```
docs/superpowers/
├── specs/2026-04-11-cake-customizer-overhaul-design.md   (committed)
└── plans/2026-04-11-cake-customizer-overhaul.md          (this file)

public/images/
├── cake-base.jpg              (updated — text painted out)
└── cake-base.original.jpg     (backup)

src/
├── lib/
│   ├── perspectiveMatrix.ts       NEW
│   ├── perspectiveMatrix.test.ts  NEW
│   └── imagePipeline.ts           NEW
└── components/
    └── HeroCakeCustomizer.astro   REWRITTEN

vitest.config.ts                   NEW
package.json                       MODIFIED
```

Total commits produced by this plan: 7 (one per task).
