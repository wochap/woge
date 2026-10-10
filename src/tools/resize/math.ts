import type { Dims, Document, Rect } from "../../model/document";
import { clampSide, resizeFromHandle, type Handle, type Point } from "../../model/geometry";
import type { View } from "../../lib/viewport";

/** The 100% size: crop dimensions. */
export function originalSize(doc: Document): Dims {
  return { w: doc.crop.w, h: doc.crop.h };
}

export function setWidth(orig: Dims, cur: Dims, w: number, lock: boolean): Dims {
  const nw = clampSide(w);
  return { w: nw, h: lock ? clampSide((nw * orig.h) / orig.w) : cur.h };
}

export function setHeight(orig: Dims, cur: Dims, h: number, lock: boolean): Dims {
  const nh = clampSide(h);
  return { w: lock ? clampSide((nh * orig.w) / orig.h) : cur.w, h: nh };
}

export function setPercent(orig: Dims, pct: number): Dims {
  return { w: clampSide((orig.w * pct) / 100), h: clampSide((orig.h * pct) / 100) };
}

export function percentOf(orig: Dims, cur: Dims): number {
  return Math.round((cur.w / orig.w) * 100);
}

export function applyResize(doc: Document, size: Dims): Document {
  return { ...doc, size: { w: clampSide(size.w), h: clampSide(size.h) } };
}

/** Point of `r` that stays fixed while dragging `handle`: opposite edge/corner, or centre with Alt. */
export function anchorPoint(r: Rect, handle: Handle, alt: boolean): Point {
  const sx = handle.includes("e") ? 1 : handle.includes("w") ? -1 : 0;
  const sy = handle.includes("s") ? 1 : handle.includes("n") ? -1 : 0;
  const ax = alt || sx === 0 ? 0.5 : sx > 0 ? 0 : 1;
  const ay = alt || sy === 0 ? 0.5 : sy > 0 ? 0 : 1;
  return { x: r.x + r.w * ax, y: r.y + r.h * ay };
}

/**
 * Draft rect after dragging `handle` by `delta` from `start`. Sizes are clamped integers;
 * the position is recomputed from the anchor so rounding never moves the fixed side.
 */
export function dragDraft(
  start: Rect,
  orig: Dims,
  handle: Handle,
  delta: Point,
  lock: boolean,
  alt: boolean,
): Rect {
  const ratio = lock ? orig.w / orig.h : false;
  const r = resizeFromHandle(start, handle, delta, { lockAspect: ratio, fromCenter: alt });
  let w = clampSide(r.w);
  let h = clampSide(r.h);
  if (lock) {
    // Round the leading dimension, derive the other so 1536 gives 864 exactly.
    if (Math.abs(r.w - start.w) * orig.h >= Math.abs(r.h - start.h) * orig.w)
      h = clampSide((w * orig.h) / orig.w);
    else w = clampSide((h * orig.w) / orig.h);
  }
  const a = anchorPoint(start, handle, alt);
  const f = anchorPoint({ x: 0, y: 0, w, h }, handle, alt);
  return { x: a.x - f.x, y: a.y - f.y, w, h };
}

/** Viewport after applying a draft: pan so the new image origin sits where the draft was. */
export function panForDraft(view: View, draft: Point): View {
  return { ...view, x: view.x + draft.x * view.scale, y: view.y + draft.y * view.scale };
}
