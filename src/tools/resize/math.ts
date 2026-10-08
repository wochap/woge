import type { Dims, Document } from "../../model/document";
import { clampSide } from "../../model/geometry";

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
