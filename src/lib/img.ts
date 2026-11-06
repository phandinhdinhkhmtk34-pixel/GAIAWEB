/**
 * Uploaded images (Supabase Storage) are served through Next.js image optimization, so a 2 MB PNG
 * uploaded in Admin reaches visitors as a small WebP sized for the screen. Local files are left alone.
 * Widths must be in Next's default sizes (16…384, 640, 750, 828, 1080, 1200, 1920, 2048, 3840).
 */
const isUploaded = (url: string) => url.includes("/storage/v1/object/public/");

export function resized(url: string, width: number, quality = 75) {
  if (!isUploaded(url)) return url;
  return `/_next/image?url=${encodeURIComponent(url)}&w=${width}&q=${quality}`;
}

export function responsive(url: string, widths: number[], quality = 75) {
  if (!isUploaded(url)) return { src: url };
  return {
    src: resized(url, widths[widths.length - 1], quality),
    srcSet: widths.map((w) => `${resized(url, w, quality)} ${w}w`).join(", "),
  };
}
