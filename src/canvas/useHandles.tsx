import { useCallback } from "react";
import { Rect as KRect } from "react-konva";
import type Konva from "konva";
import type { Rect } from "../model/document";
import { HANDLES, type Handle, type Point } from "../model/geometry";
import { useEditor } from "../store/editor";

export interface DragInfo {
  handle: Handle | "body" | "draw";
  /** Total pointer movement since drag start, in image space. */
  delta: Point;
  shift: boolean;
  alt: boolean;
}

export const HANDLE_PX = 10;

export const CURSORS: Record<Handle, string> = {
  nw: "nwse-resize",
  se: "nwse-resize",
  ne: "nesw-resize",
  sw: "nesw-resize",
  n: "ns-resize",
  s: "ns-resize",
  e: "ew-resize",
  w: "ew-resize",
};

export function cssVar(name: string): string {
  return getComputedStyle(window.document.documentElement).getPropertyValue(name).trim();
}

function handlePoint(r: Rect, h: Handle): Point {
  const x = h.includes("w") ? r.x : h.includes("e") ? r.x + r.w : r.x + r.w / 2;
  const y = h.includes("n") ? r.y : h.includes("s") ? r.y + r.h : r.y + r.h / 2;
  return { x, y };
}

export function setCursor(e: Konva.KonvaEventObject<unknown>, cursor: string) {
  const c = e.target.getStage()?.container();
  if (c) c.style.cursor = cursor;
}

/**
 * Window-level pointer drag reporting deltas in image space. Sets the store's
 * `pointerDrag` flag so undo/redo stay inert mid-drag.
 */
export function useHandles(onDrag: (d: DragInfo) => void, onEnd?: (d: DragInfo) => void) {
  return useCallback(
    (handle: DragInfo["handle"], e: Konva.KonvaEventObject<PointerEvent>) => {
      if (e.evt.button !== 0) return;
      e.cancelBubble = true;
      const scale = useEditor.getState().viewport.scale;
      const start = { x: e.evt.clientX, y: e.evt.clientY };
      let last: DragInfo = {
        handle,
        delta: { x: 0, y: 0 },
        shift: e.evt.shiftKey,
        alt: e.evt.altKey,
      };
      useEditor.setState({ pointerDrag: true });
      const move = (ev: PointerEvent) => {
        last = {
          handle,
          delta: { x: (ev.clientX - start.x) / scale, y: (ev.clientY - start.y) / scale },
          shift: ev.shiftKey,
          alt: ev.altKey,
        };
        onDrag(last);
      };
      const up = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        window.removeEventListener("pointercancel", up);
        useEditor.setState({ pointerDrag: false });
        onEnd?.(last);
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
      window.addEventListener("pointercancel", up);
    },
    [onDrag, onEnd],
  );
}

interface HandlesProps {
  rect: Rect;
  scale: number;
  onDown(handle: Handle, e: Konva.KonvaEventObject<PointerEvent>): void;
}

/** Eight 10px square handles (`--accent` fill, `--bg` rim) around `rect`. */
export function Handles({ rect, scale, onDown }: HandlesProps) {
  const size = HANDLE_PX / scale;
  const fill = cssVar("--accent") || "#cba6f7";
  const rim = cssVar("--bg") || "#1e1e2e";
  return (
    <>
      {HANDLES.map((h) => {
        const p = handlePoint(rect, h);
        return (
          <KRect
            key={h}
            name={`handle-${h}`}
            x={p.x - size / 2}
            y={p.y - size / 2}
            width={size}
            height={size}
            fill={fill}
            stroke={rim}
            strokeWidth={1 / scale}
            onPointerDown={(e) => onDown(h, e)}
            onMouseEnter={(e) => setCursor(e, CURSORS[h])}
            onMouseLeave={(e) => setCursor(e, "")}
          />
        );
      })}
    </>
  );
}
