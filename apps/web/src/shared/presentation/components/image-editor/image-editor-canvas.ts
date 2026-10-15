import type { MediaSize, Point, Size } from 'react-easy-crop';

import type { ImageEditorConfig, ImageEditorExportParams } from './image-editor.types';

const DEG_TO_RAD = Math.PI / 180;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function getRadianAngle(degree: number): number {
  return degree * DEG_TO_RAD;
}

export function rotateSize(
  width: number,
  height: number,
  rotation: number,
): { width: number; height: number } {
  const rotRad = getRadianAngle(rotation);
  return {
    width:
      Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height),
    height:
      Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height),
  };
}

/** Fit entire image inside crop area (CSS contain), centered. */
export function computeFitCropAndZoom(
  mediaSize: MediaSize,
  cropSize: Size,
  rotation: number,
  minZoom: number,
  maxZoom: number,
): { crop: Point; zoom: number } {
  const bbox = rotateSize(mediaSize.width, mediaSize.height, rotation);
  const zoomW = cropSize.width / bbox.width;
  const zoomH = cropSize.height / bbox.height;
  return {
    crop: { x: 0, y: 0 },
    zoom: clamp(Math.min(zoomW, zoomH), minZoom, maxZoom),
  };
}

export function computeOutputDimensions(
  cropWidth: number,
  cropHeight: number,
  maxOutputPx: number,
): { width: number; height: number } {
  const safeW = Math.max(1, cropWidth);
  const safeH = Math.max(1, cropHeight);
  const longSide = Math.max(safeW, safeH);
  const scale = Math.min(1, maxOutputPx / longSide);
  return {
    width: Math.max(1, Math.round(safeW * scale)),
    height: Math.max(1, Math.round(safeH * scale)),
  };
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', reject);
    image.src = src;
  });
}

/** Horizontally flip image; returns a new object URL (caller must revoke). */
export async function flipImageHorizontally(
  imageSrc: string,
): Promise<{ url: string; shouldRevoke: true }> {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas not supported');
  }
  ctx.translate(canvas.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(image, 0, 0);

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((file) => resolve(file), 'image/png');
  });
  if (!blob) {
    throw new Error('Failed to flip image');
  }
  return { url: URL.createObjectURL(blob), shouldRevoke: true };
}

export async function exportEditedImageBlob(
  params: ImageEditorExportParams,
): Promise<Blob> {
  const {
    imageSrc,
    pixelCrop,
    rotation,
    flipH,
    flipV = false,
    config,
  } = params;

  const image = await loadImage(imageSrc);
  const rotRad = getRadianAngle(rotation);
  const { width: bBoxWidth, height: bBoxHeight } = rotateSize(
    image.naturalWidth,
    image.naturalHeight,
    rotation,
  );

  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = Math.ceil(bBoxWidth);
  tempCanvas.height = Math.ceil(bBoxHeight);
  const tempCtx = tempCanvas.getContext('2d');
  if (!tempCtx) {
    throw new Error('Canvas not supported');
  }

  tempCtx.fillStyle = config.backgroundColor;
  tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
  tempCtx.translate(bBoxWidth / 2, bBoxHeight / 2);
  tempCtx.rotate(rotRad);
  tempCtx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
  tempCtx.translate(-image.naturalWidth / 2, -image.naturalHeight / 2);
  tempCtx.drawImage(image, 0, 0);

  const { width: outputWidth, height: outputHeight } = computeOutputDimensions(
    pixelCrop.width,
    pixelCrop.height,
    config.maxOutputPx,
  );

  const canvas = document.createElement('canvas');
  canvas.width = outputWidth;
  canvas.height = outputHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas not supported');
  }

  ctx.fillStyle = config.backgroundColor;
  ctx.fillRect(0, 0, outputWidth, outputHeight);
  ctx.drawImage(
    tempCanvas,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    outputWidth,
    outputHeight,
  );

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((file) => resolve(file), 'image/webp', 0.92);
  });
  if (!blob) {
    throw new Error('Failed to export image');
  }
  return blob;
}

export function resolveEditorAspect(
  config: ImageEditorConfig,
  naturalWidth: number,
  naturalHeight: number,
): number {
  if (config.aspectRatio != null && Number.isFinite(config.aspectRatio)) {
    return config.aspectRatio;
  }
  if (naturalWidth > 0 && naturalHeight > 0) {
    const ratio = naturalWidth / naturalHeight;
    return Math.min(4, Math.max(0.25, ratio));
  }
  return 4 / 3;
}
