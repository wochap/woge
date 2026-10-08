import type { Dims, Rect } from "./document";
import { rotatePoint90, rotateRect90, type Dir, type Point } from "./geometry";
import { PALETTE, type ColorKey } from "./palette";
import type { Flavour } from "../lib/theme";

export type { ColorKey } from "./palette";
export type StrokeWidth = "S" | "M" | "L";
export type ArrowHeads = "end" | "both";

interface Base {
  id: string;
  z: number;
}

export interface ShapeStyle {
  stroke: ColorKey;
  strokeWidth: StrokeWidth;
  fill: boolean;
}

export interface RectObj extends Base, ShapeStyle {
  type: "rect";
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface EllipseObj extends Base, ShapeStyle {
  type: "ellipse";
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ArrowObj extends Base {
  type: "arrow";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  heads: ArrowHeads;
  stroke: ColorKey;
  strokeWidth: StrokeWidth;
}

export interface TextObj extends Base {
  type: "text";
  x: number;
  y: number;
  /** Wrap width; auto width when absent. */
  w?: number;
  text: string;
  color: ColorKey;
  font: string;
  size: number;
  bold: boolean;
  plate: boolean;
}

export interface StrokeObj extends Base {
  type: "brush" | "highlight";
  /** Flat `[x0, y0, x1, y1, …]` in rotated-image space. */
  points: number[];
  stroke: ColorKey;
  strokeWidth: StrokeWidth;
  /** Brush only: render with curve tension. */
  smooth?: boolean;
}

export type RedactMode = "pixelate" | "blur";

export interface RedactObj extends Base {
  type: "redact";
  x: number;
  y: number;
  w: number;
  h: number;
  mode: RedactMode;
  strength: number;
}

export type BadgeSize = "S" | "M" | "L";

export interface BadgeObj extends Base {
  type: "badge";
  /** Centre. */
  x: number;
  y: number;
  n: number;
  color: ColorKey;
  size: BadgeSize;
}

export type AnnotationObject =
  RectObj | EllipseObj | ArrowObj | TextObj | StrokeObj | RedactObj | BadgeObj;
export type ObjectType = AnnotationObject["type"];
/** An object before it joins the document: id and z are assigned by the store. */
export type NewObject = AnnotationObject extends infer T
  ? T extends AnnotationObject
    ? Omit<T, "id" | "z"> & { id?: string; z?: number }
    : never
  : never;

/** Fields any object may receive through `updateObjects`; ignored where meaningless. */
export type ObjectPatch = Partial<
  Omit<RectObj, "type" | "id"> &
    Omit<ArrowObj, "type" | "id"> &
    Omit<TextObj, "type" | "id" | "w" | "size"> &
    Omit<StrokeObj, "type" | "id"> &
    Omit<RedactObj, "type" | "id" | "x" | "y" | "w" | "h"> &
    Omit<BadgeObj, "type" | "id" | "size" | "x" | "y" | "color"> & {
      w: number | undefined;
      /** Text: font size; badge: S/M/L. */
      size: number | BadgeSize;
    }
>;

export const STROKE_PX: Record<StrokeWidth, number> = { S: 2, M: 4, L: 8 };
export const HIGHLIGHT_PX: Record<StrokeWidth, number> = { S: 12, M: 20, L: 32 };
export const BADGE_PX: Record<BadgeSize, number> = { S: 22, M: 28, L: 36 };
export const HIGHLIGHT_ALPHA = 0.5;
export const PIXELATE_RANGE = { min: 4, max: 64, default: 12 } as const;
export const BLUR_RANGE = { min: 2, max: 40, default: 8 } as const;
export const FILL_ALPHA = 0.25;
export const TEXT_SIZE_MIN = 8;
export const TEXT_SIZE_MAX = 200;
export const TEXT_LINE_HEIGHT = 1.2;
export const PLATE_PAD = 4;
export const PLATE_ALPHA = 0.7;

export function resolveColor(key: ColorKey, flavour: Flavour): string {
  return PALETTE[flavour][key] ?? PALETTE[flavour].red;
}

/** Image-relative factor so widths look alike on 1080p and 4k. */
export function imageFactor(size: Dims | undefined): number {
  return size ? Math.max(1, Math.min(size.w, size.h) / 1080) : 1;
}

export function strokePx(width: StrokeWidth, size: Dims): number {
  return STROKE_PX[width] * imageFactor(size);
}

/** Line width of a brush or highlight stroke. */
export function freehandPx(o: Pick<StrokeObj, "type" | "strokeWidth">, size: Dims): number {
  return (o.type === "highlight" ? HIGHLIGHT_PX : STROKE_PX)[o.strokeWidth] * imageFactor(size);
}

export function badgePx(size: BadgeSize, image: Dims | undefined): number {
  return BADGE_PX[size] * imageFactor(image);
}

export function clampStrength(mode: RedactMode, n: number): number {
  const r = mode === "blur" ? BLUR_RANGE : PIXELATE_RANGE;
  return Math.min(r.max, Math.max(r.min, Math.round(n)));
}

export function pointsBounds(points: number[]): Rect {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (let i = 0; i + 1 < points.length; i += 2) {
    x0 = Math.min(x0, points[i]);
    x1 = Math.max(x1, points[i]);
    y0 = Math.min(y0, points[i + 1]);
    y1 = Math.max(y1, points[i + 1]);
  }
  if (x0 === Infinity) return { x: 0, y: 0, w: 0, h: 0 };
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

function mapPoints(points: number[], f: (p: Point) => Point): number[] {
  const out: number[] = [];
  for (let i = 0; i + 1 < points.length; i += 2) {
    const q = f({ x: points[i], y: points[i + 1] });
    out.push(q.x, q.y);
  }
  return out;
}

export function clampTextSize(n: number): number {
  return Math.min(TEXT_SIZE_MAX, Math.max(TEXT_SIZE_MIN, Math.round(n)));
}

/** Rough text extent without a canvas; the renderer measures for real. */
export function estimateTextSize(o: TextObj): Dims {
  const lines = o.text.split("\n");
  const longest = Math.max(1, ...lines.map((l) => l.length));
  const w = o.w ?? longest * o.size * 0.6;
  return { w, h: Math.max(1, lines.length) * o.size * TEXT_LINE_HEIGHT };
}

/** Measured text sizes keyed by id, filled in by the renderer. */
export const measuredText = new Map<string, Dims>();

/** Object bounds; `image` (rotated-image dims) sizes badges, scale 1 when absent. */
export function boundsOf(o: AnnotationObject, image?: Dims): Rect {
  switch (o.type) {
    case "brush":
    case "highlight":
      return pointsBounds(o.points);
    case "badge": {
      const d = badgePx(o.size, image);
      return { x: o.x - d / 2, y: o.y - d / 2, w: d, h: d };
    }
    case "rect":
    case "ellipse":
    case "redact":
      return { x: o.x, y: o.y, w: o.w, h: o.h };
    case "arrow":
      return {
        x: Math.min(o.x1, o.x2),
        y: Math.min(o.y1, o.y2),
        w: Math.abs(o.x2 - o.x1),
        h: Math.abs(o.y2 - o.y1),
      };
    case "text": {
      const m = measuredText.get(o.id) ?? estimateTextSize(o);
      return { x: o.x, y: o.y, w: o.w ?? m.w, h: m.h };
    }
  }
}

export function unionBounds(rects: Rect[]): Rect | null {
  if (!rects.length) return null;
  const x = Math.min(...rects.map((r) => r.x));
  const y = Math.min(...rects.map((r) => r.y));
  const r = Math.max(...rects.map((r) => r.x + r.w));
  const b = Math.max(...rects.map((r) => r.y + r.h));
  return { x, y, w: r - x, h: b - y };
}

export function intersects(a: Rect, b: Rect): boolean {
  return a.x <= b.x + b.w && b.x <= a.x + a.w && a.y <= b.y + b.h && b.y <= a.y + a.h;
}

export function translate<T extends AnnotationObject>(o: T, dx: number, dy: number): T {
  if (o.type === "arrow")
    return { ...o, x1: o.x1 + dx, y1: o.y1 + dy, x2: o.x2 + dx, y2: o.y2 + dy };
  if (o.type === "brush" || o.type === "highlight")
    return { ...o, points: mapPoints(o.points, (p) => ({ x: p.x + dx, y: p.y + dy })) };
  return { ...o, x: (o as RectObj).x + dx, y: (o as RectObj).y + dy };
}

/**
 * Map `o` from bounds `from` to bounds `to` (box transform). Text scales its font size;
 * stroke widths stay; badges only move their centre.
 */
export function scaleObj<T extends AnnotationObject>(o: T, from: Rect, to: Rect): T {
  const sx = from.w ? to.w / from.w : 1;
  const sy = from.h ? to.h / from.h : 1;
  const mx = (x: number) => to.x + (x - from.x) * sx;
  const my = (y: number) => to.y + (y - from.y) * sy;
  switch (o.type) {
    case "rect":
    case "ellipse":
    case "redact":
      return { ...o, x: mx(o.x), y: my(o.y), w: o.w * sx, h: o.h * sy };
    case "brush":
    case "highlight":
      return { ...o, points: mapPoints(o.points, (p) => ({ x: mx(p.x), y: my(p.y) })) };
    case "badge":
      return { ...o, x: mx(o.x), y: my(o.y) };
    case "arrow":
      return { ...o, x1: mx(o.x1), y1: my(o.y1), x2: mx(o.x2), y2: my(o.y2) };
    case "text":
      return {
        ...o,
        x: mx(o.x),
        y: my(o.y),
        size: clampTextSize(o.size * sy),
        w: o.w === undefined ? undefined : o.w * sx,
      };
  }
  return o;
}

export function rotateObject90<T extends AnnotationObject>(
  o: T,
  w: number,
  h: number,
  dir: Dir,
): T {
  switch (o.type) {
    case "rect":
    case "ellipse":
    case "redact": {
      const r = rotateRect90(o, w, h, dir);
      return { ...o, ...r };
    }
    case "brush":
    case "highlight":
      return { ...o, points: mapPoints(o.points, (p) => rotatePoint90(p, w, h, dir)) };
    case "badge":
      return { ...o, ...rotatePoint90(o, w, h, dir) };
    case "arrow": {
      const a = rotatePoint90({ x: o.x1, y: o.y1 }, w, h, dir);
      const b = rotatePoint90({ x: o.x2, y: o.y2 }, w, h, dir);
      return { ...o, x1: a.x, y1: a.y, x2: b.x, y2: b.y };
    }
    case "text": {
      // Text stays upright; its anchor follows the rotation.
      const b = boundsOf(o);
      const r = rotateRect90(b, w, h, dir);
      return { ...o, x: r.x + (r.w - b.w) / 2, y: r.y + (r.h - b.h) / 2 };
    }
  }
  return o;
}

/** Snap a vector to the nearest 45° step, keeping its length. */
export function snap45(a: Point, b: Point): Point {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  const step = Math.PI / 4;
  const ang = Math.round(Math.atan2(dy, dx) / step) * step;
  return { x: a.x + Math.cos(ang) * len, y: a.y + Math.sin(ang) * len };
}

let seq = 0;
export function newId(): string {
  return `o${Date.now().toString(36)}${(++seq).toString(36)}`;
}

export function sortByZ(objects: AnnotationObject[]): AnnotationObject[] {
  return [...objects].sort((a, b) => a.z - b.z);
}

export function maxZ(objects: AnnotationObject[]): number {
  return objects.reduce((m, o) => Math.max(m, o.z), 0);
}

export type ReorderDir = "forward" | "backward" | "front" | "back";

/** Reorder `ids` and renumber z as 1..n. */
export function reorder(
  objects: AnnotationObject[],
  ids: string[],
  dir: ReorderDir,
): AnnotationObject[] {
  const list = sortByZ(objects);
  const sel = new Set(ids);
  let out: AnnotationObject[];
  if (dir === "front")
    out = [...list.filter((o) => !sel.has(o.id)), ...list.filter((o) => sel.has(o.id))];
  else if (dir === "back")
    out = [...list.filter((o) => sel.has(o.id)), ...list.filter((o) => !sel.has(o.id))];
  else {
    out = [...list];
    if (dir === "forward") {
      for (let i = out.length - 2; i >= 0; i--)
        if (sel.has(out[i].id) && !sel.has(out[i + 1].id))
          [out[i], out[i + 1]] = [out[i + 1], out[i]];
    } else {
      for (let i = 1; i < out.length; i++)
        if (sel.has(out[i].id) && !sel.has(out[i - 1].id))
          [out[i], out[i - 1]] = [out[i - 1], out[i]];
    }
  }
  return out.map((o, i) => ({ ...o, z: i + 1 }));
}

/** Apply only fields meaningful for the object's type. */
export function applyPatch(o: AnnotationObject, patch: ObjectPatch): AnnotationObject {
  const keys: Record<ObjectType, string[]> = {
    rect: ["x", "y", "w", "h", "z", "stroke", "strokeWidth", "fill"],
    ellipse: ["x", "y", "w", "h", "z", "stroke", "strokeWidth", "fill"],
    arrow: ["x1", "y1", "x2", "y2", "z", "heads", "stroke", "strokeWidth"],
    text: ["x", "y", "w", "z", "text", "color", "font", "size", "bold", "plate"],
    brush: ["points", "z", "stroke", "strokeWidth", "smooth"],
    highlight: ["points", "z", "stroke", "strokeWidth"],
    redact: ["x", "y", "w", "h", "z", "mode", "strength"],
    badge: ["x", "y", "z", "n", "color", "size"],
  };
  const next: Record<string, unknown> = { ...o };
  for (const k of keys[o.type]) if (k in patch) next[k] = (patch as Record<string, unknown>)[k];
  // `size` is a number for text and S/M/L for badges; ignore the other kind.
  if (o.type === "text" && typeof next.size !== "number") next.size = o.size;
  if (o.type === "badge" && !(["S", "M", "L"] as unknown[]).includes(next.size)) next.size = o.size;
  if (o.type === "redact" && (patch.mode !== undefined || patch.strength !== undefined))
    next.strength = clampStrength(next.mode as RedactMode, next.strength as number);
  // Text/badge colour and stroke colour share the swatch control.
  const colored = o.type === "text" || o.type === "badge";
  if (colored && patch.stroke !== undefined && patch.color === undefined) next.color = patch.stroke;
  if (!colored && o.type !== "redact" && patch.color !== undefined && patch.stroke === undefined)
    next.stroke = patch.color;
  return next as unknown as AnnotationObject;
}

// --- Counter badges ---

export function badgesOf(objects: AnnotationObject[]): BadgeObj[] {
  return objects.filter((o): o is BadgeObj => o.type === "badge");
}

/** `max(n) + 1` over existing badges, 1 when none. */
export function nextBadgeNumber(objects: AnnotationObject[]): number {
  return badgesOf(objects).reduce((m, b) => Math.max(m, b.n), 0) + 1;
}

/** Renumber badges 1..k keeping their sequence (by number, then z); other objects untouched. */
export function renumberBadges(objects: AnnotationObject[]): AnnotationObject[] {
  const order = badgesOf(objects).sort((a, b) => a.n - b.n || a.z - b.z);
  const num = new Map(order.map((b, i) => [b.id, i + 1]));
  return objects.map((o) => (o.type === "badge" ? { ...o, n: num.get(o.id)! } : o));
}

/** Number colour for a badge: dark crust on light colours, light base on dark ones. */
export function badgeTextColor(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const lin = (c: number) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  const l = 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
  return l > 0.375 ? BADGE_DARK : BADGE_LIGHT;
}
export const BADGE_DARK = "#11111b";
export const BADGE_LIGHT = "#eff1f5";
