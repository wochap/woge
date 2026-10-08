import { rotateRect90, type Point } from "../../model/geometry";
import type { Dims, Rect, Rotation } from "../../model/document";
import type { RedactObj } from "../../model/objects";

/** Map a rect from rotated-image space back to base-bitmap space. */
export function unrotateRect(r: Rect, rotation: Rotation, base: Dims): Rect {
  let cur = rotation % 180 === 0 ? { ...base } : { w: base.h, h: base.w };
  let out = r;
  for (let i = 0; i < rotation / 90; i++) {
    out = rotateRect90(out, cur.w, cur.h, "ccw");
    cur = { w: cur.h, h: cur.w };
  }
  return out;
}

/** Offset of a `rotation`-rotated image node so it fills a `w`×`h` box from its top-left. */
export function rotatedPlacement(rotation: Rotation, w: number, h: number): Point {
  switch (rotation) {
    case 90:
      return { x: w, y: 0 };
    case 180:
      return { x: w, y: h };
    case 270:
      return { x: 0, y: h };
    default:
      return { x: 0, y: 0 };
  }
}

export interface RedactLayout {
  /** Visible part of the region, relative to the region's top-left. */
  x: number;
  y: number;
  w: number;
  h: number;
  /** Source rect in base-bitmap space, Konva `crop` shape. */
  crop: { x: number; y: number; width: number; height: number };
  /** Base-image node placement inside the visible part. */
  image: { x: number; y: number; width: number; height: number; rotation: Rotation };
}

/**
 * Image-node layout for a region: the base bitmap cropped to the region (clamped to the
 * image) and rotated into place. Null when the region lies outside the image.
 */
export function redactLayout(
  o: Pick<RedactObj, "x" | "y" | "w" | "h">,
  rotation: Rotation,
  base: Dims,
): RedactLayout | null {
  const dims = rotation % 180 === 0 ? base : { w: base.h, h: base.w };
  const x0 = Math.max(0, Math.floor(o.x));
  const y0 = Math.max(0, Math.floor(o.y));
  const x1 = Math.min(dims.w, Math.ceil(o.x + o.w));
  const y1 = Math.min(dims.h, Math.ceil(o.y + o.h));
  if (x1 - x0 < 1 || y1 - y0 < 1) return null;
  const vis = { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  const crop = unrotateRect(vis, rotation, base);
  return {
    x: vis.x - o.x,
    y: vis.y - o.y,
    w: vis.w,
    h: vis.h,
    crop: { x: crop.x, y: crop.y, width: crop.w, height: crop.h },
    image: { ...rotatedPlacement(rotation, vis.w, vis.h), width: crop.w, height: crop.h, rotation },
  };
}
