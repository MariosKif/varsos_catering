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
