import type { Point } from "../../model/geometry";

export type FreehandTool = "brush" | "highlight";

/** Minimum distance between kept points, in image pixels (zoom does not change sampling). */
export const DECIMATE_PX = 1.5;

/** Append `p` unless it is closer than `DECIMATE_PX` to the last kept point. */
export function addPoint(points: Point[], p: Point): boolean {
  const last = points[points.length - 1];
  if (last && Math.hypot(p.x - last.x, p.y - last.y) < DECIMATE_PX) return false;
  points.push(p);
  return true;
}

/**
 * Shift constraints: the brush locks to horizontal or vertical through the first point
 * (axis from the latest point), the highlighter becomes one straight segment.
 */
export function constrain(
  points: Point[],
  tool: FreehandTool,
  shift: boolean,
  end?: Point,
): Point[] {
  if (!shift || !points.length) return points;
  const a = points[0];
  const b = end ?? points[points.length - 1];
  if (tool === "highlight") return [a, b];
  const horizontal = Math.abs(b.x - a.x) >= Math.abs(b.y - a.y);
  return points.map((p) => (horizontal ? { x: p.x, y: a.y } : { x: a.x, y: p.y }));
}

/** One Chaikin corner-cutting pass; endpoints are kept. */
export function chaikin(points: Point[]): Point[] {
  if (points.length < 3) return points;
  const out: Point[] = [points[0]];
  for (let i = 0; i < points.length - 1; i++) {
    const p = points[i];
    const q = points[i + 1];
    out.push(
      { x: 0.75 * p.x + 0.25 * q.x, y: 0.75 * p.y + 0.25 * q.y },
      { x: 0.25 * p.x + 0.75 * q.x, y: 0.25 * p.y + 0.75 * q.y },
    );
  }
  out.push(points[points.length - 1]);
  return out;
}

/** Flat point list for the stroke object; a lone point becomes a dot. */
export function flatten(points: Point[]): number[] {
  if (points.length === 1) return [points[0].x, points[0].y, points[0].x, points[0].y];
  return points.flatMap((p) => [p.x, p.y]);
}

export function finishStroke(
  points: Point[],
  tool: FreehandTool,
  shift: boolean,
  smooth: boolean,
): number[] {
  let pts = constrain(points, tool, shift);
  if (tool === "brush" && smooth && !shift) pts = chaikin(pts);
  return flatten(pts);
}
