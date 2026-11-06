"use client";

/**
 * Shrink an image in the browser before upload: scale it down to what the site can display
 * (2× for sharp screens) and re-encode as WebP, which keeps transparency for logos.
 * If the result isn't smaller, or the browser can't decode the file, the original is kept.
 */
export async function optimizeImage(file: File, max: { width: number; height: number }, quality = 0.86): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, max.width / bitmap.width, max.height / bitmap.height);
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();
    const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/webp", quality));
    if (!blob || blob.type !== "image/webp" || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.\w+$/, "") + ".webp", { type: "image/webp" });
  } catch {
    return file;
  }
}

/** Display limits per kind of image (pixels, already doubled for high-density screens). */
export const IMAGE_LIMITS = {
  logo: { width: 640, height: 240 },
  hero: { width: 2400, height: 1600 },
  character: { width: 900, height: 1200 },
  thumbnail: { width: 1280, height: 720 },
} as const;
export type ImageKind = keyof typeof IMAGE_LIMITS;
