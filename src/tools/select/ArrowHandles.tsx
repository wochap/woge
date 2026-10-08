import { useState } from "react";
import type Konva from "konva";
import { Circle } from "react-konva";
import { useEditor } from "../../store/editor";
import { snap45, type ArrowObj } from "../../model/objects";
import { cssVar, setCursor } from "../../canvas/useHandles";
import { trackDrag } from "../../canvas/pointer";
import { ANCHOR_PX } from "./SelectionTransformer";

/** Move one endpoint; Shift snaps the arrow to 45° around the other end. */
export function moveEndpoint(
  o: ArrowObj,
  end: 1 | 2,
  p: { x: number; y: number },
  shift: boolean,
): ArrowObj {
  if (end === 1) {
    const q = shift ? snap45({ x: o.x2, y: o.y2 }, p) : p;
    return { ...o, x1: q.x, y1: q.y };
  }
  const q = shift ? snap45({ x: o.x1, y: o.y1 }, p) : p;
  return { ...o, x2: q.x, y2: q.y };
}

/** Endpoint handles for a single selected arrow, in document space on the `ui` layer. */
export function ArrowHandles({ docScale }: { docScale: number }) {
  const selection = useEditor((s) => s.selection);
  const doc = useEditor((s) => s.document);
  const tool = useEditor((s) => s.activeTool);
  const view = useEditor((s) => s.viewport.scale);
  const [draft, setDraft] = useState<ArrowObj | null>(null);
  const obj = selection.length === 1 ? doc?.objects.find((o) => o.id === selection[0]) : undefined;
  if (tool !== "select" || !obj || obj.type !== "arrow") return null;
  const a = draft && draft.id === obj.id ? draft : obj;
  const r = ANCHOR_PX / 2 / (view * docScale);
  const accent = cssVar("--accent") || "#cba6f7";
  const bg = cssVar("--bg") || "#1e1e2e";

  const down = (end: 1 | 2) => (e: Konva.KonvaEventObject<PointerEvent>) => {
    const stage = e.target.getStage();
    if (!stage || e.evt.button !== 0) return;
    e.cancelBubble = true;
    const node = stage.findOne(`#${obj.id}`) as Konva.Arrow | undefined;
    let last = obj;
    trackDrag(
      stage,
      e.evt,
      (m) => {
        last = moveEndpoint(obj, end, m.point, m.shift);
        node?.points([last.x1, last.y1, last.x2, last.y2]);
        node?.getLayer()?.batchDraw();
        setDraft(last);
      },
      (_m, cancelled) => {
        setDraft(null);
        if (cancelled) node?.points([obj.x1, obj.y1, obj.x2, obj.y2]);
        else useEditor.getState().updateObjects([obj.id], () => last);
      },
    );
  };

  return (
    <>
      {([1, 2] as const).map((end) => (
        <Circle
          key={end}
          name={`arrow-handle-${end}`}
          x={end === 1 ? a.x1 : a.x2}
          y={end === 1 ? a.y1 : a.y2}
          radius={r}
          fill={bg}
          stroke={accent}
          strokeWidth={1.5 / (view * docScale)}
          onPointerDown={down(end)}
          onMouseEnter={(e) => setCursor(e, "crosshair")}
          onMouseLeave={(e) => setCursor(e, "")}
        />
      ))}
    </>
  );
}
