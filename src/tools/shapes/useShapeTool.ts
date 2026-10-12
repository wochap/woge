import { useCallback } from "react";
import type Konva from "konva";
import { useEditor } from "../../store/editor";
import { useSettings } from "../../store/settings";
import { trackDrag, docPoint } from "../../canvas/pointer";
import { newId } from "../../model/objects";
import { isShapeTool, shapeFromDrag, tooSmall } from "./math";
import { afterCreate, startNewText } from "../text/editing";
import { startFreehand } from "../freehand/useFreehandTool";
import { placeBadge } from "../badge/editing";

/** The mousedown that follows this pointerdown would otherwise move focus off the new editor. */
function keepFocusOnNextMouseDown() {
  const stop = (ev: MouseEvent) => ev.preventDefault();
  window.addEventListener("mousedown", stop, { once: true, capture: true });
  setTimeout(() => window.removeEventListener("mousedown", stop, { capture: true }), 300);
}

/** Stage pointer down for drawing tools: press-drag-release creates one object. */
export function useShapeTool() {
  return useCallback((e: Konva.KonvaEventObject<PointerEvent>) => {
    const stage = e.target.getStage();
    const s = useEditor.getState();
    const tool = s.activeTool;
    if (!stage || e.evt.button !== 0) return;
    if (tool === "text") {
      if (s.editingText) return;
      startNewText(docPoint(stage, e.evt.clientX, e.evt.clientY));
      keepFocusOnNextMouseDown();
      return;
    }
    if (tool === "brush") return startFreehand(e, "brush");
    if (tool === "highlighter") return startFreehand(e, "highlight");
    if (tool === "counter") return placeBadge(docPoint(stage, e.evt.clientX, e.evt.clientY));
    if (!isShapeTool(tool)) return;
    s.clearSelection();
    trackDrag(
      stage,
      e.evt,
      (m) => {
        const obj = shapeFromDrag(tool, m.start, m.point, m, useSettings.getState().tools);
        useEditor.getState().setDrawing(obj);
      },
      (m, cancelled) => {
        const st = useEditor.getState();
        const obj = st.drawing;
        st.setDrawing(null);
        if (cancelled || !obj || !m.moved || tooSmall(obj)) return;
        st.addObject({ ...obj, id: newId() });
        afterCreate();
      },
    );
  }, []);
}
