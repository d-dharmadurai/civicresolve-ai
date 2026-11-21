/** Longest edge (px) sent to the server; Gemini and the UI never need more detail. */
export const MAX_UPLOAD_DIMENSION = 1600;
export const MAX_UPLOAD_FILE_BYTES = 10 * 1024 * 1024;
const JPEG_QUALITY = 0.82;

export interface PreparedImage {
  dataUrl: string;
  mimeType: string;
}

export function readBlobAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      typeof reader.result === "string"
        ? resolve(reader.result)
        : reject(new Error("Could not read image file."));
    reader.onerror = () => reject(new Error("Failed to read image file."));
    reader.readAsDataURL(blob);
  });
}

/** Returns the scaled size that fits within `max` while preserving aspect ratio. */
export function fitWithin(
  width: number,
  height: number,
  max: number = MAX_UPLOAD_DIMENSION
): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= max) return { width, height };
  const scale = max / longest;
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

async function downscale(file: Blob): Promise<PreparedImage | null> {
  if (typeof createImageBitmap !== "function" || typeof document === "undefined") return null;

  const bitmap = await createImageBitmap(file);
  try {
    const { width, height } = fitWithin(bitmap.width, bitmap.height);
    // Skip re-encoding when it cannot shrink the upload (already small and not a heavy PNG).
    if (width === bitmap.width && file.size < 1_500_000 && file.type !== "image/png") {
      return null;
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(bitmap, 0, 0, width, height);

    const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
    return dataUrl.startsWith("data:image/jpeg") ? { dataUrl, mimeType: "image/jpeg" } : null;
  } finally {
    bitmap.close();
  }
}

/**
 * Converts a photo into an upload-ready data URL. Large images are downscaled and
 * re-encoded as JPEG in the browser, cutting payload size (and Gemini latency) by
 * up to 90%; if the browser cannot do that the original bytes are used unchanged.
 */
export async function prepareImageForUpload(file: Blob): Promise<PreparedImage> {
  try {
    const scaled = await downscale(file);
    if (scaled) return scaled;
  } catch {
    // Fall through to the original file when decoding or canvas export fails.
  }
  return { dataUrl: await readBlobAsDataUrl(file), mimeType: file.type || "image/jpeg" };
}
