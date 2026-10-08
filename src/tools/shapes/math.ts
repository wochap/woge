import { rectFromDrag, type Point } from "../../model/geometry";
import { newId, snap45, type AnnotationObject, type TextObj } from "../../model/objects";
import type { ToolSettings } from "../../store/settings";

export type ShapeTool = "rect" | "ellipse" | "arrow";
export const MIN_SIZE = 3;

export function isShapeTool(t: string): t is ShapeTool {
  return t === "rect" || t === "ellipse" || t === "arrow";
}

/** Object spanned by a drag from `a` to `b`; Shift constrains, Alt draws from the centre. */
export function shapeFromDrag(
  tool: ShapeTool,
  a: Point,
  b: Point,
  mods: { shift: boolean; alt: boolean },
  settings: ToolSettings,
  id = "drawing",
): AnnotationObject {
  if (tool === "arrow") {
    const end = mods.shift ? snap45(a, b) : b;
    const start = mods.alt ? { x: 2 * a.x - end.x, y: 2 * a.y - end.y } : a;
    return {
      id,
      z: 0,
      type: "arrow",
      x1: start.x,
      y1: start.y,
      x2: end.x,
      y2: end.y,
      ...settings.arrow,
    };
  }
  const r = rectFromDrag(a, b, mods.shift ? 1 : null, mods.alt);
  return { id, z: 0, type: tool, ...r, ...settings[tool] };
}

/** Under 3px in both axes: a click, not a shape. */
export function tooSmall(o: AnnotationObject): boolean {
  if (o.type === "arrow")
    return Math.abs(o.x2 - o.x1) < MIN_SIZE && Math.abs(o.y2 - o.y1) < MIN_SIZE;
  if (o.type === "text") return false;
  return o.w < MIN_SIZE && o.h < MIN_SIZE;
}

export function newText(p: Point, settings: ToolSettings): TextObj {
  return {
    id: newId(),
    z: 0,
    type: "text",
    x: Math.round(p.x),
    y: Math.round(p.y),
    text: "",
    ...settings.text,
  };
}
