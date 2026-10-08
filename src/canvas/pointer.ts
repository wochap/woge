import type Konva from "konva";
import type { Point } from "../model/geometry";
import { useEditor } from "../store/editor";

export const OBJECTS_ROOT = "objects-root";

/** Client coordinates to rotated-image (document object) space. */
export function docPoint(stage: Konva.Stage, clientX: number, clientY: number): Point {
  const root = stage.findOne(`.${OBJECTS_ROOT}`) ?? stage;
  const r = stage.container().getBoundingClientRect();
  return root
    .getAbsoluteTransform()
    .copy()
    .invert()
    .point({ x: clientX - r.left, y: clientY - r.top });
}

/** Document-space units per screen pixel. */
export function docPerScreen(stage: Konva.Stage): number {
  const root = stage.findOne(`.${OBJECTS_ROOT}`) ?? stage;
  return 1 / (root.getAbsoluteScale().x || 1);
}

export interface DragMove {
  start: Point;
  point: Point;
  shift: boolean;
  alt: boolean;
  /** Pointer travelled at least `CLICK_SLOP` screen pixels. */
  moved: boolean;
}

export const CLICK_SLOP = 3;

/**
 * Window-level drag in document space. Sets `pointerDrag` so undo/redo stay inert mid-drag.
 * `onEnd` also receives cancelled drags (`cancelled` true on pointercancel).
 */
export function trackDrag(
  stage: Konva.Stage,
  evt: PointerEvent | MouseEvent,
  onMove: (m: DragMove) => void,
  onEnd: (m: DragMove, cancelled: boolean) => void,
) {
  const start = docPoint(stage, evt.clientX, evt.clientY);
  const sx = evt.clientX;
  const sy = evt.clientY;
  let last: DragMove = { start, point: start, shift: evt.shiftKey, alt: evt.altKey, moved: false };
  useEditor.setState({ pointerDrag: true });
  const move = (ev: PointerEvent) => {
    const moved = last.moved || Math.hypot(ev.clientX - sx, ev.clientY - sy) >= CLICK_SLOP;
    last = {
      start,
      point: docPoint(stage, ev.clientX, ev.clientY),
      shift: ev.shiftKey,
      alt: ev.altKey,
      moved,
    };
    onMove(last);
  };
  const up = (ev: PointerEvent) => {
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", up);
    window.removeEventListener("pointercancel", up);
    useEditor.setState({ pointerDrag: false });
    onEnd(last, ev.type === "pointercancel");
  };
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", up);
  window.addEventListener("pointercancel", up);
}
