import Konva from "konva";
import { useEditor } from "../../store/editor";
import { useSettings } from "../../store/settings";
import { docPerScreen, docPoint, trackDrag } from "../../canvas/pointer";
import { pointsBounds, type StrokeObj } from "../../model/objects";
import { rotatedDims } from "../../model/document";
import { currentFlavour, strokeAttrs } from "../../canvas/objectNodes";
import type { Point } from "../../model/geometry";
import { addPoint, constrain, finishStroke, flatten, type FreehandTool } from "./math";
import { afterCreate } from "../text/editing";

export const DRAFT_GROUP = "freehand-draft";

/**
 * Brush/highlighter press-drag-release. The in-progress stroke is an imperative Konva line
 * on the `ui` layer (no React renders, no history); release commits one object.
 */
export function startFreehand(e: Konva.KonvaEventObject<PointerEvent>, tool: FreehandTool) {
  const stage = e.target.getStage();
  const s = useEditor.getState();
  const doc = s.document;
  if (!stage || !doc) return;
  s.clearSelection();
  const settings = useSettings.getState().tools[tool];
  const proto: StrokeObj = {
    id: "drawing",
    z: 0,
    type: tool,
    points: [],
    stroke: settings.stroke,
    strokeOpacity: settings.strokeOpacity,
    strokeWidth: settings.strokeWidth,
    ...(tool === "brush" ? { smooth: useSettings.getState().tools.brush.smooth } : {}),
  };
  const ctx = { flavour: currentFlavour(), image: rotatedDims(doc), unit: docPerScreen(stage) };
  const host = stage.findOne(`.${DRAFT_GROUP}`) as Konva.Group | undefined;
  const line = new Konva.Line({ ...strokeAttrs(proto, ctx), id: undefined, listening: false });
  host?.add(line);
  const raw: Point[] = [];
  let frame = 0;
  let shift = e.evt.shiftKey;
  let end: Point | null = null;

  const render = () => {
    frame = 0;
    const pts = constrain(raw, tool, shift, end ?? undefined);
    const flat = flatten(pts);
    line.points(flat);
    line.getLayer()?.batchDraw();
    const b = pointsBounds(flat);
    useEditor.setState({ liveSize: { w: b.w, h: b.h } });
  };
  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(render);
  };

  trackDrag(
    stage,
    e.evt,
    (m) => {
      addPoint(raw, m.point);
      shift = m.shift;
      end = m.point;
      schedule();
    },
    (m, cancelled) => {
      if (frame) cancelAnimationFrame(frame);
      line.destroy();
      host?.getLayer()?.batchDraw();
      useEditor.setState({ liveSize: null });
      if (cancelled) return;
      if (!raw.length) raw.push(m.start);
      const points = finishStroke(raw, tool, m.shift, !!proto.smooth);
      const { id: _id, z: _z, ...obj } = proto;
      useEditor.getState().addObject({ ...obj, points });
      afterCreate();
    },
  );
  // Show the dot immediately.
  addPoint(raw, docPoint(stage, e.evt.clientX, e.evt.clientY));
  render();
}
