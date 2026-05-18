export const QUALITY_LIMITS = {
  MIN_PHOTOS: 30,
  RECOMMENDED_PHOTOS: 150,
  MAX_PHOTOS: 500,
  MAX_PHOTO_MB: 15,
  MIN_DIMENSION_PX: 1024,
  BLURRY_THRESHOLD: 0.75,
} as const;

export interface PhotoScore {
  file: File;
  width: number;
  height: number;
  sizeMb: number;
  blurScore: number;
  ok: boolean;
  reasons: string[];
}

export interface QualitySummary {
  total: number;
  ok: number;
  blurry: number;
  tooLarge: number;
  tooSmall: number;
  enoughPhotos: boolean;
  recommendedMet: boolean;
  tooMany: boolean;
  canProceed: boolean;
}

export async function scorePhoto(file: File): Promise<PhotoScore> {
  const sizeMb = file.size / (1024 * 1024);
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const blurScore = estimateBlur(img);
    const reasons: string[] = [];
    if (sizeMb > QUALITY_LIMITS.MAX_PHOTO_MB) {
      reasons.push(`File too large (${sizeMb.toFixed(1)} MB > ${QUALITY_LIMITS.MAX_PHOTO_MB} MB)`);
    }
    if (img.width < QUALITY_LIMITS.MIN_DIMENSION_PX || img.height < QUALITY_LIMITS.MIN_DIMENSION_PX) {
      reasons.push(`Resolution too low (${img.width}×${img.height})`);
    }
    if (blurScore > QUALITY_LIMITS.BLURRY_THRESHOLD) {
      reasons.push('Looks blurry — try a steadier shot');
    }
    return {
      file,
      width: img.width,
      height: img.height,
      sizeMb,
      blurScore,
      ok: reasons.length === 0,
      reasons,
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = url;
  });
}

function estimateBlur(img: HTMLImageElement): number {
  const canvas = document.createElement('canvas');
  const w = 256;
  const h = Math.max(1, Math.round((img.height / img.width) * 256));
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return 0;
  ctx.drawImage(img, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h).data;
  const gray = new Float32Array(w * h);
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    gray[p] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }
  let mean = 0;
  let count = 0;
  const lap = new Float32Array(gray.length);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = y * w + x;
      const v = -4 * gray[idx] + gray[idx - 1] + gray[idx + 1] + gray[idx - w] + gray[idx + w];
      lap[idx] = v;
      mean += v;
      count++;
    }
  }
  if (count === 0) return 0;
  mean /= count;
  let variance = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = y * w + x;
      variance += (lap[idx] - mean) * (lap[idx] - mean);
    }
  }
  variance /= count;
  return Math.max(0, Math.min(1, 1 - variance / 400));
}

export function summarize(scores: PhotoScore[]): QualitySummary {
  const okCount = scores.filter((s) => s.ok).length;
  const blurry = scores.filter((s) => s.blurScore > QUALITY_LIMITS.BLURRY_THRESHOLD).length;
  const tooLarge = scores.filter((s) => s.sizeMb > QUALITY_LIMITS.MAX_PHOTO_MB).length;
  const tooSmall = scores.filter(
    (s) => s.width < QUALITY_LIMITS.MIN_DIMENSION_PX || s.height < QUALITY_LIMITS.MIN_DIMENSION_PX,
  ).length;
  const enoughPhotos = okCount >= QUALITY_LIMITS.MIN_PHOTOS;
  const tooMany = scores.length > QUALITY_LIMITS.MAX_PHOTOS;
  return {
    total: scores.length,
    ok: okCount,
    blurry,
    tooLarge,
    tooSmall,
    enoughPhotos,
    recommendedMet: okCount >= QUALITY_LIMITS.RECOMMENDED_PHOTOS,
    tooMany,
    canProceed: enoughPhotos && !tooMany,
  };
}

export function getExtension(file: File): string {
  const name = file.name.toLowerCase();
  const dot = name.lastIndexOf('.');
  if (dot === -1) return 'jpg';
  const ext = name.slice(dot + 1);
  return ['jpg', 'jpeg', 'png', 'webp', 'heic'].includes(ext) ? ext : 'jpg';
}

export function getMimeType(ext: string): string {
  const map: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    heic: 'image/heic',
  };
  return map[ext.toLowerCase()] ?? 'image/jpeg';
}
