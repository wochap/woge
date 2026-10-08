import type { Dims, Document, Rect, Rotation } from "./document";
import { rotatedDims } from "./document";

export interface Point {
  x: number;
  y: number;
}

export type Dir = "cw" | "ccw";
export type Handle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";
export const HANDLES: Handle[] = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];
export const MAX_SIDE = 16384;

/** Rotate a point by 90° inside a `w`×`h` space; the result lives in an `h`×`w` space. */
export function rotatePoint90(p: Point, w: number, h: number, dir: Dir = "cw"): Point {
  return dir === "cw" ? { x: h - p.y, y: p.x } : { x: p.y, y: w - p.x };
}

export function rotateRect90(r: Rect, w: number, h: number, dir: Dir = "cw"): Rect {
  return dir === "cw"
    ? { x: h - r.y - r.h, y: r.x, w: r.h, h: r.w }
    : { x: r.y, y: w - r.x - r.w, w: r.h, h: r.w };
}

export function rotateDocument(doc: Document, dir: Dir): Document {
  const { w, h } = rotatedDims(doc);
  const rotation = ((doc.rotation + (dir === "cw" ? 90 : 270)) % 360) as Rotation;
  return {
    ...doc,
    rotation,
    crop: rotateRect90(doc.crop, w, h, dir),
    size: { w: doc.size.h, h: doc.size.w },
    objects: doc.objects.map((o) => ({ ...o, ...rotatePoint90(o, w, h, dir) })),
  };
}

/** Intersect with the `bounds` area, keeping at least 1×1. */
export function clampRect(r: Rect, bounds: Dims): Rect {
  const x = Math.min(Math.max(0, r.x), bounds.w - 1);
  const y = Math.min(Math.max(0, r.y), bounds.h - 1);
  const right = Math.min(Math.max(r.x + r.w, x + 1), bounds.w);
  const bottom = Math.min(Math.max(r.y + r.h, y + 1), bounds.h);
  return { x, y, w: right - x, h: bottom - y };
}

/** Keep the rect's size and push it inside `bounds`. */
export function clampMove(r: Rect, bounds: Dims): Rect {
  const w = Math.min(r.w, bounds.w);
  const h = Math.min(r.h, bounds.h);
  return {
    x: Math.min(Math.max(0, r.x), bounds.w - w),
    y: Math.min(Math.max(0, r.y), bounds.h - h),
    w,
    h,
  };
}

/** Largest rect of aspect `ratio` (w/h) inside `rect`, anchored at its centre or top-left. */
export function fitAspect(rect: Rect, ratio: number, anchor: "center" | "nw" = "center"): Rect {
  let w = rect.w;
  let h = rect.h;
  if (w / h > ratio) w = Math.max(1, Math.floor(h * ratio));
  else h = Math.max(1, Math.floor(w / ratio));
  if (anchor === "nw") return { x: rect.x, y: rect.y, w, h };
  return { x: rect.x + (rect.w - w) / 2, y: rect.y + (rect.h - h) / 2, w, h };
}

export interface ResizeOptions {
  /** Aspect ratio (w/h) to keep, or false. */
  lockAspect?: number | false;
  fromCenter?: boolean;
}

/** Drag `handle` of `bounds` by `delta`; the opposite side (or the centre) stays put. */
export function resizeFromHandle(
  bounds: Rect,
  handle: Handle,
  delta: Point,
  { lockAspect = false, fromCenter = false }: ResizeOptions = {},
): Rect {
  const k = fromCenter ? 2 : 1;
  const sx = handle.includes("e") ? 1 : handle.includes("w") ? -1 : 0;
  const sy = handle.includes("s") ? 1 : handle.includes("n") ? -1 : 0;
  let w = Math.max(1, bounds.w + sx * delta.x * k);
  let h = Math.max(1, bounds.h + sy * delta.y * k);
  if (lockAspect) {
    const byWidth =
      sx !== 0 && (sy === 0 || Math.abs(w / bounds.w - 1) >= Math.abs(h / bounds.h - 1));
    if (byWidth) h = Math.max(1, w / lockAspect);
    else w = Math.max(1, h * lockAspect);
  }
  const cx = bounds.x + bounds.w / 2;
  const cy = bounds.y + bounds.h / 2;
  const x = fromCenter || sx === 0 ? cx - w / 2 : sx > 0 ? bounds.x : bounds.x + bounds.w - w;
  const y = fromCenter || sy === 0 ? cy - h / 2 : sy > 0 ? bounds.y : bounds.y + bounds.h - h;
  return { x, y, w, h };
}

export function snapInt(r: Rect): Rect {
  const x = Math.round(r.x);
  const y = Math.round(r.y);
  return {
    x,
    y,
    w: Math.max(1, Math.round(r.x + r.w) - x),
    h: Math.max(1, Math.round(r.y + r.h) - y),
  };
}

export function clampSide(n: number): number {
  return Math.min(MAX_SIDE, Math.max(1, Math.round(n)));
}

/** Rect spanned by a drag from `a` to `b`; `ratio` constrains aspect, `fromCenter` mirrors around `a`. */
export function rectFromDrag(a: Point, b: Point, ratio: number | null, fromCenter: boolean): Rect {
  let dx = b.x - a.x;
  let dy = b.y - a.y;
  if (ratio) {
    const w = Math.max(Math.abs(dx), Math.abs(dy) * ratio);
    dx = Math.sign(dx || 1) * w;
    dy = Math.sign(dy || 1) * (w / ratio);
  }
  if (fromCenter) {
    return {
      x: a.x - Math.abs(dx),
      y: a.y - Math.abs(dy),
      w: Math.abs(dx) * 2,
      h: Math.abs(dy) * 2,
    };
  }
  return {
    x: Math.min(a.x, a.x + dx),
    y: Math.min(a.y, a.y + dy),
    w: Math.abs(dx),
    h: Math.abs(dy),
  };
}
