import Konva from "konva";
import type { Dims } from "../model/document";
import {
  FILL_ALPHA,
  PLATE_ALPHA,
  PLATE_PAD,
  TEXT_LINE_HEIGHT,
  resolveColor,
  sortByZ,
  strokePx,
  type AnnotationObject,
  type ArrowObj,
  type EllipseObj,
  type RectObj,
  type TextObj,
} from "../model/objects";
import { PLATE_COLOR } from "../model/palette";
import type { Flavour } from "../lib/theme";

export interface RenderCtx {
  flavour: Flavour;
  /** Rotated-image dimensions; stroke widths scale with them. */
  image: Dims;
}

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
    }
  });
}
