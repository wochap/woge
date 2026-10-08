import Konva from "konva";
import type { Dims, Rotation } from "../model/document";
import {
  FILL_ALPHA,
  HIGHLIGHT_ALPHA,
  badgePx,
  badgeTextColor,
  freehandPx,
  PLATE_ALPHA,
  PLATE_PAD,
  TEXT_LINE_HEIGHT,
  resolveColor,
  sortByZ,
  strokePx,
  type AnnotationObject,
  type ArrowObj,
  type BadgeObj,
  type EllipseObj,
  type RedactObj,
  type StrokeObj,
  type RectObj,
  type TextObj,
} from "../model/objects";
import { PLATE_COLOR } from "../model/palette";
import type { Flavour } from "../lib/theme";
import { redactLayout } from "../tools/redact/math";

export interface RenderCtx {
  flavour: Flavour;
  /** Rotated-image dimensions; stroke widths scale with them. */
  image: Dims;
  /** Document units per screen pixel (hit areas); 1 when absent. */
  unit?: number;
  /** Base bitmap, its dimensions and rotation, for redact regions. */
  bitmap?: CanvasImageSource | null;
  base?: Dims;
  rotation?: Rotation;
}

export const HIT_PX = 12;
export const STROKE_TENSION = 0.3;

export function currentFlavour(): Flavour {
  return window.document.documentElement.dataset.theme === "latte" ? "latte" : "mocha";
}

function withAlpha(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

export function rectAttrs(o: RectObj, c: RenderCtx) {
  const color = resolveColor(o.stroke, c.flavour);
  return {
    id: o.id,
    name: "object",
    x: o.x,
    y: o.y,
    width: o.w,
    height: o.h,
    stroke: color,
    strokeWidth: strokePx(o.strokeWidth, c.image),
    fill: o.fill ? withAlpha(color, FILL_ALPHA) : undefined,
    perfectDrawEnabled: false,
  };
}

export function ellipseAttrs(o: EllipseObj, c: RenderCtx) {
  const { x, y, width, height, ...rest } = rectAttrs(o as unknown as RectObj, c);
  return { ...rest, x: x + width / 2, y: y + height / 2, radiusX: width / 2, radiusY: height / 2 };
}

export function arrowAttrs(o: ArrowObj, c: RenderCtx) {
  const color = resolveColor(o.stroke, c.flavour);
  const sw = strokePx(o.strokeWidth, c.image);
  const head = Math.max(10, sw * 3.5);
  return {
    id: o.id,
    name: "object",
    x: 0,
    y: 0,
    points: [o.x1, o.y1, o.x2, o.y2],
    stroke: color,
    fill: color,
    strokeWidth: sw,
    pointerLength: head,
    pointerWidth: head,
    pointerAtBeginning: o.heads === "both",
    lineCap: "round" as const,
    lineJoin: "round" as const,
    hitStrokeWidth: Math.max(sw, 12),
    perfectDrawEnabled: false,
  };
}

export function textAttrs(o: TextObj, c: RenderCtx) {
  return {
    text: o.text,
    fontFamily: o.font,
    fontSize: o.size,
    fontStyle: o.bold ? "bold" : "normal",
    fill: resolveColor(o.color, c.flavour),
    lineHeight: TEXT_LINE_HEIGHT,
    width: o.w,
    wrap: "word",
    perfectDrawEnabled: false,
  };
}

export function plateAttrs(w: number, h: number, c: RenderCtx) {
  return {
    x: -PLATE_PAD,
    y: -PLATE_PAD,
    width: w + PLATE_PAD * 2,
    height: h + PLATE_PAD * 2,
    cornerRadius: PLATE_PAD,
    fill: PLATE_COLOR[c.flavour],
    opacity: PLATE_ALPHA,
    perfectDrawEnabled: false,
  };
}

export function strokeAttrs(o: StrokeObj, c: RenderCtx) {
  const sw = freehandPx(o, c.image);
  const hl = o.type === "highlight";
  return {
    id: o.id,
    name: "object",
    x: 0,
    y: 0,
    points: o.points,
    stroke: resolveColor(o.stroke, c.flavour),
    strokeWidth: sw,
    tension: !hl && o.smooth ? STROKE_TENSION : 0,
    lineCap: "round" as const,
    lineJoin: "round" as const,
    opacity: hl ? HIGHLIGHT_ALPHA : 1,
    globalCompositeOperation: hl ? ("multiply" as const) : ("source-over" as const),
    hitStrokeWidth: Math.max(sw, HIT_PX * (c.unit ?? 1)),
    perfectDrawEnabled: false,
  };
}

export function redactFilterAttrs(o: Pick<RedactObj, "mode" | "strength">) {
  return o.mode === "blur"
    ? { filters: [Konva.Filters.Blur], blurRadius: o.strength }
    : { filters: [Konva.Filters.Pixelate], pixelSize: o.strength };
}

export function badgeAttrs(o: BadgeObj, c: RenderCtx) {
  const d = badgePx(o.size, c.image);
  const fill = resolveColor(o.color, c.flavour);
  return {
    circle: { radius: d / 2, fill, perfectDrawEnabled: false },
    text: {
      text: String(o.n),
      x: -d / 2,
      y: -d / 2,
      width: d,
      height: d,
      align: "center" as const,
      verticalAlign: "middle" as const,
      fontFamily: "Inter Variable",
      fontStyle: "bold",
      fontSize: d * 0.55,
      fill: badgeTextColor(fill),
      listening: false,
      perfectDrawEnabled: false,
    },
  };
}

/** Redact region: base-bitmap crop under a filter, cached so the filter runs once. */
export function buildRedactNode(o: RedactObj, c: RenderCtx): Konva.Group {
  const g = new Konva.Group({ id: o.id, name: "object", x: o.x, y: o.y });
  const lay = c.bitmap && c.base ? redactLayout(o, c.rotation ?? 0, c.base) : null;
  if (lay && c.bitmap) {
    const inner = new Konva.Group({ x: lay.x, y: lay.y });
    const img = new Konva.Image({
      image: c.bitmap,
      ...lay.image,
      crop: lay.crop,
      ...redactFilterAttrs(o),
    });
    inner.add(img);
    g.add(inner);
    img.cache({ pixelRatio: 1 });
  }
  return g;
}

/** Imperative nodes for export, same attributes as `ObjectsLayer`. */
export function buildObjectNodes(objects: AnnotationObject[], c: RenderCtx): Konva.Node[] {
  return sortByZ(objects).map((o) => {
    switch (o.type) {
      case "rect":
        return new Konva.Rect(rectAttrs(o, c));
      case "ellipse":
        return new Konva.Ellipse(ellipseAttrs(o, c));
      case "arrow":
        return new Konva.Arrow(arrowAttrs(o, c));
      case "text": {
        const g = new Konva.Group({ id: o.id, x: o.x, y: o.y });
        const t = new Konva.Text(textAttrs(o, c));
        if (o.plate) g.add(new Konva.Rect(plateAttrs(o.w ?? t.width(), t.height(), c)));
        g.add(t);
        return g;
      }
      case "brush":
      case "highlight":
        return new Konva.Line(strokeAttrs(o, c));
      case "redact":
        return buildRedactNode(o, c);
      case "badge": {
        const a = badgeAttrs(o, c);
        const g = new Konva.Group({ id: o.id, x: o.x, y: o.y });
        g.add(new Konva.Circle(a.circle), new Konva.Text(a.text));
        return g;
      }
    }
  });
}
