export const DECODE_ERROR = "Could not read image";

/** Fetch an asset URL and decode it upright (EXIF orientation applied). */
export async function decodeUrl(url: string): Promise<ImageBitmap> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(DECODE_ERROR);
  const blob = await res.blob();
  try {
    return await createImageBitmap(blob, { imageOrientation: "from-image" });
  } catch {
    throw new Error(DECODE_ERROR);
  }
}

/** Monotonic load ids: only the latest started load may commit. */
export function createLoadGuard() {
  let current = 0;
  return {
    begin(): number {
      return ++current;
    },
    isCurrent(id: number): boolean {
      return id === current;
    },
  };
}
