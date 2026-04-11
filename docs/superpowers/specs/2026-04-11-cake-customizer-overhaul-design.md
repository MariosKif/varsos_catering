# Cake Customizer Overhaul — Design Spec

**Date:** 2026-04-11
**Status:** Ready for implementation
**Scope:** `src/components/HeroCakeCustomizer.astro` and supporting library modules

---

## 1. Problem

The current hero cake customizer has four image-fit problems that all show up depending on the uploaded photo:

1. **Flat / glued-on look.** The cake is photographed at an angle, so its white print zone is a real perspective trapezoid. The current overlay is a flat rectangle trimmed by a `clip-path`, which never follows the cake's surface.
2. **Portraits show tiny, surrounded by blur.** Blur-fill centers a contain-fit image and fills the sides with a blurred copy. Portraits and narrow images land as a small sharp thumbnail with heavy blur bars.
3. **Images get clipped by the trapezoid `clip-path`.** Subjects near the edges can disappear.
4. **Aspect-ratio distortion / baked-in text bleed-through.** The base photo has "Χρόνια πολλά Maria!" baked in, and `mix-blend-mode: multiply` causes it to bleed through every upload. *(The text has already been painted out of `public/images/cake-base.jpg` as part of this change. The backup is at `public/images/cake-base.original.jpg`.)*

## 2. Goal

Replace the customizer's image pipeline so that any uploaded image — landscape, portrait, square, huge, with EXIF rotation, anything — ends up sitting **full-bleed** on the cake's white print zone, **correctly warped to the cake's 3D perspective**, with **no bars, no blur, no bleed-through**, and with an interactive crop/zoom tool so the user can fine-tune which part of their photo shows.

## 3. Architecture

Three pure-function libraries + a rewritten component script. The existing `UploadControl.astro` and `ColorSelector.astro` stay untouched.

```
User picks/drops file
        │
        ▼
[1] imagePipeline.preprocessFile(file)
    • createImageBitmap(file, { imageOrientation: 'from-image' })   ← EXIF rotate
    • downscale long side to ≤ 2400 px via offscreen canvas
    • return { bitmap, width, height }
        │
        ▼
[2] Crop Mode enters (inline, swaps #display-layer → #crop-layer)
    • <canvas id="crop-canvas"> draws the preprocessed bitmap
    • rectangular crop frame locked to target aspect (2.38:1)
    • initial state = COVER-FIT (zoomed to fully fill the frame, centred)
    • interactions: pointer drag to pan, wheel / pinch to zoom
    • Apply / Cancel buttons below
        │
        ▼
[3] imagePipeline.renderCrop(bitmap, cropRect, target, mime)
    • draws the cropped region to a 1100×460 canvas
    • canvas.toBlob → object URL
        │
        ▼
[4] Display layer returns
    • #print-plate  (solid white <div>, sized 1100×460) + matrix3d warp
    • #image-overlay (<img>, sized 1100×460) + same matrix3d warp
    • both anchored top-left, transform applied from their natural size
      onto the cake's actual print-zone quad in pixels
    • no clip-path, no mix-blend-mode
```

## 4. File structure

```
src/
├── lib/
│   ├── perspectiveMatrix.ts    NEW — pure math: homography + matrix3d
│   └── imagePipeline.ts        NEW — preprocess / renderCrop (browser-only)
└── components/
    └── HeroCakeCustomizer.astro  MODIFY — crop-layer markup, rewritten <script>
```

Public assets:
- `public/images/cake-base.jpg` — **already updated** (text painted out).
- `public/images/cake-base.original.jpg` — backup of the pre-paint original.

No other files change.

## 5. Module contracts

### 5.1 `src/lib/perspectiveMatrix.ts`

Pure math, no DOM, no dependencies, fully unit-testable.

```ts
export type Point = { x: number; y: number };
export type Quad  = [Point, Point, Point, Point]; // TL, TR, BR, BL

/**
 * Solves the 2D projective homography that maps the source quad to
 * the destination quad. Returns a row-major 9-element matrix
 * [a,b,c, d,e,f, g,h,1] where [x' y' w'] = H · [x y 1].
 */
export function computeHomography(src: Quad, dst: Quad): number[];

/**
 * Converts a 3x3 homography to a CSS matrix3d(...) string.
 * Pads rows/cols with z-axis identity so CSS does a 2D projective
 * transform (the w coordinate is preserved in the 4th column).
 */
export function homographyToMatrix3d(h: number[]): string;

/**
 * Convenience: compute the matrix3d() string that warps an element
 * of natural size (width × height) positioned at origin (0,0) onto
 * the destination quad in the same pixel space.
 */
export function fitRectToQuad(
  width: number,
  height: number,
  dst: Quad
): string;
```

**Implementation notes for `computeHomography`:**
- Build the 8×8 linear system `A · h = b` from the 4 point correspondences (see standard projective geometry references).
- Solve via Gaussian elimination with partial pivoting.
- Return the full 9-element vector with `h[8] = 1`.
- No dependency on any math library — 60 lines max.

**Implementation notes for `homographyToMatrix3d`:**
- CSS matrix3d is column-major, 16 floats. Build from `H`:
  ```
  [ h0  h3  0  h6
    h1  h4  0  h7
     0   0  1   0
    h2  h5  0   1 ]
  ```
  then flatten column-major. This mapping is the standard one used by projects like `d3-geo-polygon`.

### 5.2 `src/lib/imagePipeline.ts`

Browser-only (uses DOM / Canvas APIs). No tests — validated visually.

```ts
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

/**
 * Decodes a File into an EXIF-corrected ImageBitmap, downscaling if
 * the long side exceeds MAX_LONG_SIDE (2400 px). Closes and replaces
 * the original bitmap when downscaling so only one is alive at a time.
 *
 * Throws on unsupported/corrupt files.
 */
export async function preprocessFile(file: File): Promise<PreprocessedImage>;

/**
 * Renders a rectangular crop of the source bitmap onto a canvas of
 * the exact target size and returns a fresh object URL pointing to
 * the encoded blob. Uses 'image/jpeg' at quality 0.92 by default;
 * caller can pass 'image/png' to preserve transparency.
 *
 * The cropRect is in source-bitmap pixel space. Portions outside
 * the bitmap are not drawn (canvas stays transparent there), but the
 * Crop Mode UI prevents this state from being reachable.
 */
export async function renderCrop(
  source: ImageBitmap,
  crop: CropRect,
  target: { w: number; h: number },
  mime?: 'image/jpeg' | 'image/png'
): Promise<string>;

export const MAX_LONG_SIDE = 2400;
export const TARGET_W = 1100;
export const TARGET_H = 460;
```

`preprocessFile` details:
1. `createImageBitmap(file, { imageOrientation: 'from-image', premultiplyAlpha: 'default', colorSpaceConversion: 'default' })`.
2. If `max(bitmap.width, bitmap.height) > MAX_LONG_SIDE`, compute a uniform scale and redraw onto a temporary canvas, then `createImageBitmap(canvas)` to get a smaller `ImageBitmap`. Close the original.
3. Return `{ bitmap, width, height }`.

`renderCrop` details:
1. Create an offscreen `<canvas>` of `target.w × target.h`.
2. `ctx.drawImage(source, crop.x, crop.y, crop.w, crop.h, 0, 0, target.w, target.h)`.
3. `canvas.toBlob` → `URL.createObjectURL(blob)`.

### 5.3 `HeroCakeCustomizer.astro` — script responsibilities

The rewritten `<script>` block owns:

- **Constants**
  - `PRINT_ZONE_CORNERS_PCT` — 4 corners of the cake's white print zone as percentages of the cake image's rendered size. Starting values (executor must fine-tune visually while watching the dev server):
    ```ts
    const PRINT_ZONE_CORNERS_PCT = {
      tl: { x: 18.22, y: 17.78 },
      tr: { x: 82.78, y: 17.19 },
      br: { x: 86.78, y: 62.03 },
      bl: { x: 15.36, y: 61.73 },
    };
    ```
  - `TARGET_W = 1100`, `TARGET_H = 460` (imported from imagePipeline).
  - `ASPECT = TARGET_W / TARGET_H` (≈ 2.391).

- **Warp application**
  - `applyWarp()` reads `cakeWrapper.getBoundingClientRect()`, converts the percentage corners to pixel points, calls `fitRectToQuad(TARGET_W, TARGET_H, quad)`, and assigns the result to `transform` on both `#print-plate` and `#image-overlay`.
  - Called on: mount, `ResizeObserver` tick (debounced via rAF), orientation change, and after a new overlay is applied.

- **Crop Mode state machine**
  ```ts
  type CropState = {
    bitmap: ImageBitmap;
    canvasW: number; canvasH: number;  // crop canvas backing size
    imgX: number; imgY: number;        // top-left of image inside canvas px
    imgScale: number;                  // bitmap → canvas px scale
    frame: { x: number; y: number; w: number; h: number }; // crop frame in canvas px
  };
  let cropState: CropState | null = null;
  ```

- **Entering Crop Mode** (`enterCropMode(file)`):
  1. `preprocessFile(file)` → bitmap.
  2. Hide `#display-layer`, show `#crop-layer`.
  3. Size the `<canvas id="crop-canvas">` to `cakeWrapper` width × a fixed 4:3-ish preview height (same height as the cake photo would render).
  4. Compute `frame` = centered rectangle at `ASPECT` aspect ratio, 80% of canvas width (or bounded by height).
  5. Compute `imgScale` = COVER-FIT: `Math.max(frame.w / bitmap.width, frame.h / bitmap.height)`. This guarantees the image fully covers the frame at initial state — no gaps.
  6. Centre the image so the frame's centre aligns with the bitmap's geometric centre.
  7. `drawCropCanvas()`.

- **Drawing the crop canvas** (`drawCropCanvas()`):
  - Clear.
  - `ctx.drawImage(bitmap, imgX, imgY, bitmap.width * imgScale, bitmap.height * imgScale)`.
  - Darken everything outside the frame with a semi-transparent `rgba(0,0,0,0.45)` mask (draw full canvas, then clear the frame rect).
  - Draw a 2 px solid white frame outline for visibility.

- **Interactions (pointer events — unified mouse + touch)**:
  - **Drag pan:** `pointerdown` on canvas records start point; `pointermove` adjusts `imgX`/`imgY`; `pointerup` releases. Clamp so the image always fully covers the frame (`imgX ≤ frame.x` etc.) — this is what enforces no-gap state.
  - **Wheel zoom:** `wheel` event scales around the pointer position. Clamp `imgScale` to `[coverScale, coverScale * 6]` where `coverScale` is the minimum zoom needed to still fully cover the frame at the current image centering. Prevent default.
  - **Pinch zoom:** two active pointers; track distance; scale around midpoint. Same clamp.
  - Every change calls `drawCropCanvas()` inside a rAF guard so redraws happen at most once per frame.

- **Applying the crop** (`applyCrop()`):
  1. Compute `cropRect` in **bitmap source space**: `{ x: (frame.x - imgX) / imgScale, y: (frame.y - imgY) / imgScale, w: frame.w / imgScale, h: frame.h / imgScale }`.
  2. `renderCrop(bitmap, cropRect, { w: TARGET_W, h: TARGET_H }, mime)` → object URL.
  3. Revoke previous `objectUrl` if any.
  4. Assign to `#image-overlay.src`, unhide it, fade in with GSAP.
  5. `applyWarp()` to position it.
  6. Hide `#crop-layer`, show `#display-layer`.
  7. Close the bitmap; clear `cropState`.
  8. Toggle upload/change/remove button visibility as today.

- **Cancelling** (`cancelCrop()`):
  1. Close bitmap; clear `cropState`.
  2. Reset the file input.
  3. Hide `#crop-layer`, show `#display-layer`.

- **Remove image** (existing `clearImage()`): revoke object URL, clear `#image-overlay.src`, unhide placeholder, restore upload button. `#print-plate` stays visible either way (it's what covers the baked text, now permanently covered anyway since the base image has been cleaned — but we keep the plate as defence-in-depth, pure white, behind any overlay).

- **Frosting colour swatches** — unchanged. CSS filter still applies to `#cake-image` only.

- **GSAP entrance animations** — unchanged.

- **Drag-and-drop into the hero** — unchanged, now routed through `enterCropMode(file)` instead of `showImage(file)`.

## 6. Markup changes in `HeroCakeCustomizer.astro`

Inside `#cake-wrapper`, replace the existing `#overlay-container` + placeholder markup with two sibling layers:

```html
<div id="cake-wrapper" class="relative mx-auto select-none overflow-hidden rounded-2xl">
  <img id="cake-image" src="/images/cake-base.jpg" ... />

  {/* Display layer — what the user normally sees */}
  <div id="display-layer" class="absolute inset-0">
    {/* Permanent white plate that sits on the cake's print zone, warped
        into perspective. Covers any remnants of the baked text and gives
        a clean surface for the overlay. */}
    <div
      id="print-plate"
      class="pointer-events-none absolute left-0 top-0 bg-white origin-top-left will-change-transform"
      style="width: 1100px; height: 460px;"
      aria-hidden="true"
    ></div>

    {/* The user's uploaded & cropped image, same 1100×460 nominal size,
        same matrix3d warp. Hidden until upload. */}
    <img
      id="image-overlay"
      src=""
      alt=""
      class="hidden pointer-events-none absolute left-0 top-0 origin-top-left will-change-transform"
      style="width: 1100px; height: 460px; filter: drop-shadow(0 1px 2px rgba(0,0,0,.08));"
      draggable="false"
    />

    {/* Placeholder prompt, only visible when no overlay is applied */}
    <div
      id="preview-placeholder"
      class="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 text-center"
    >
      <svg class="h-10 w-10 text-gray-300" ...>…</svg>
      <span class="text-xs font-medium text-gray-400 sm:text-sm">Η εικόνα σου εδώ</span>
    </div>
  </div>

  {/* Crop layer — shown only while the user is adjusting a fresh upload */}
  <div id="crop-layer" class="absolute inset-0 hidden">
    <canvas id="crop-canvas" class="block h-full w-full touch-none"></canvas>
    <div
      id="crop-controls"
      class="absolute inset-x-0 bottom-3 flex justify-center gap-3"
    >
      <button type="button" id="crop-cancel-btn" class="…">Ακύρωση</button>
      <button type="button" id="crop-apply-btn" class="…">Εφαρμογή</button>
    </div>
  </div>

  {/* Drop zone highlight — unchanged */}
  <div id="drop-highlight" ...></div>
</div>
```

Styling notes:
- `#display-layer` and `#crop-layer` are mutually exclusive — exactly one has `hidden` at any time. Default: display visible, crop hidden.
- The crop-canvas `touch-none` class prevents mobile scroll while the user drags.
- The apply/cancel buttons use the existing brand button style from `UploadControl.astro` (duplicated inline is fine — they're two buttons, not a new abstraction).

## 7. Perspective corners — verification

The starting corner values in section 5.3 come from the current clip-path + overlay-container math:
- `left: 15.36%`, `width: 71.42%`, `top: 17.19%`, `height: 45.02%`
- `clip-path: polygon(4% 1.3%, 94.4% 0%, 100% 99.6%, 0% 98.9%)`

These are an approximation. During implementation the executor **must**:
1. Run the dev server.
2. Upload a test image with a clear rectangular grid or a bright solid colour.
3. Eyeball whether the warped plate matches the actual white zone on the cake.
4. Nudge the percentages in `PRINT_ZONE_CORNERS_PCT` (± a few tenths of a percent) until the edges visually snap to the pink border.
5. Take one screenshot before / after for the record.

This is a visual check, not a test — accepted because the cake photo is fixed and the corners are constants once dialed in.

## 8. Error handling & edge cases

- **File validation** (MIME whitelist, 5 MB cap) stays and runs *before* `preprocessFile`. Error copy unchanged.
- **`createImageBitmap` failure** (corrupt file) → catch, call `showError('Δεν ήταν δυνατή η ανάγνωση της εικόνας.')`, reset input.
- **Cancel during processing** — if the user hits cancel while `preprocessFile` is still resolving, guard by checking a token: store a local `currentUploadToken`; on resolve, bail if the token has changed.
- **Object URL leaks** — every new overlay revokes the previous `objectUrl` before assigning. `bitmap.close()` called whenever `cropState` goes to `null`.
- **`ResizeObserver` thrash** — debounced via rAF; one `applyWarp()` per frame max.
- **Very small images** — if the preprocessed bitmap is smaller than the crop frame at 1× scale, the cover-fit scale calculation already handles it (it upscales). No special case.
- **Wheel zoom accidentally scrolling the page** — crop-canvas `wheel` handler calls `preventDefault()`. The canvas also gets `touch-action: none` via Tailwind `touch-none`.

## 9. Testing strategy

### 9.1 Unit tests — `perspectiveMatrix.ts`

Tool: **Vitest**. Add as a dev dependency.

Tests live in `src/lib/perspectiveMatrix.test.ts`:

1. **Identity** — src == dst == unit square → H maps any point to itself (within 1e-9).
2. **Uniform scale** — unit square → `(0,0) (2,0) (2,2) (0,2)` → mapping `(0.5, 0.5)` returns `(1, 1)`.
3. **Translation** — unit square → shifted by (10, 20) → mapping `(0,0)` returns `(10, 20)`.
4. **Known trapezoid round-trip** — for a hand-picked trapezoid, map all 4 source corners and assert they match the destination corners within 1e-6.
5. **`fitRectToQuad` produces a valid CSS string** — starts with `matrix3d(`, ends with `)`, contains 16 comma-separated numbers.

No tests for `imagePipeline.ts` — it's DOM/Canvas-bound and validated visually.

### 9.2 Visual acceptance check (manual)

Run `npm run dev`. For each of the following, upload and verify:

- [ ] Landscape JPG (2:1 ratio) — should fit naturally, very little cropping, frame is full.
- [ ] Portrait JPG from a phone (3:4 ratio) — should zoom in on the centre, crop left/right, no bars.
- [ ] Square PNG — should zoom slightly, frame full, centered.
- [ ] Huge image (4000×6000 JPG) — should downscale to ≤ 2400 px, no jank, frame full.
- [ ] Image with EXIF rotation — should arrive upright, not sideways.
- [ ] Very small image (300×200) — should upscale to cover the frame, mildly soft but no bars.
- [ ] WebP — same as JPG.
- [ ] Drag and drop from Finder — same result as file picker.
- [ ] Pan inside the crop frame — image moves, never reveals a gap at any edge.
- [ ] Wheel zoom inside the crop frame — zooms around the cursor, never reveals a gap.
- [ ] Cancel — returns to the cake view with the previous overlay (or placeholder) intact.
- [ ] Apply → change color — the frosting colour filter still works on the cake and does not disturb the warped overlay.
- [ ] Resize the browser window — the warp follows the cake's new size smoothly.
- [ ] Mobile (Chrome devtools iPhone viewport) — drag and pinch both work on the crop canvas.

### 9.3 Type check

Run `npx astro check` — must pass with zero errors/warnings.

## 10. Out of scope

- No new cake photograph. The existing `cake-base.jpg` (with text painted out) is final.
- No face or subject detection. Default centring + user adjustment is enough.
- No server uploads. The overlay never leaves the browser. Firebase is not touched.
- No analytics or event tracking.
- No new colour swatches or unrelated UI polish.

## 11. Dependencies to add

- **`vitest`** — dev dependency, for `perspectiveMatrix.test.ts`. Configured with a minimal `vitest.config.ts`.

No runtime dependencies are added.
