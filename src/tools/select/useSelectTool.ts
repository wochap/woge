import { useCallback } from "react";
import type Konva from "konva";
import type { Rect } from "../../model/document";
import type { Point } from "../../model/geometry";
import {
  boundsOf,
  intersects,
  translate,
  unionBounds,
  type AnnotationObject,
  type ReorderDir,
} from "../../model/objects";
import { useEditor } from "../../store/editor";
import { trackDrag } from "../../canvas/pointer";
import { rectFromDrag } from "../../model/geometry";

const store = useEditor.getState;

/** Ids of objects whose bounds intersect `r`. */
export function objectsInRect(objects: AnnotationObject[], r: Rect): string[] {
  return objects.filter((o) => intersects(boundsOf(o), r)).map((o) => o.id);
}

export function selectionBounds(): Rect | null {
  const { document: doc, selection } = store();
  if (!doc) return null;
  const sel = new Set(selection);
  return unionBounds(doc.objects.filter((o) => sel.has(o.id)).map(boundsOf));
}

/** Click on an object: Shift toggles, otherwise select it unless already selected. */
export function objectPointerDown(id: string, shift: boolean) {
  const s = store();
  if (shift) s.toggleSelect(id);
  else if (!s.selection.includes(id)) s.select([id]);
}

export function nudgeSelection(dx: number, dy: number) {
  const s = store();
  s.updateObjects(s.selection, (o) => translate(o, dx, dy));
}

export function deleteSelection() {
  const s = store();
  s.deleteObjects(s.selection);
}

export function reorderSelection(dir: ReorderDir) {
  const s = store();
  s.reorder(s.selection, dir);
}

/** Marquee result: intersecting ids, added to the selection with Shift. */
export function marqueeSelect(r: Rect, additive: boolean) {
  const s = store();
  if (!s.document) return;
  const hit = objectsInRect(s.document.objects, r);
  s.select(additive ? [...s.selection, ...hit] : hit);
}

// --- Dragging objects (Konva drag on the objects layer) ---

let dragStarts = new Map<string, Point>();
let dragLead: { id: string; start: Point } | null = null;

function nodeOf(stage: Konva.Stage | null, id: string): Konva.Node | undefined {
  return stage?.findOne(`#${id}`) ?? undefined;
}

export function objectDragStart(e: Konva.KonvaEventObject<DragEvent>, id: string) {
  const s = store();
  const stage = e.target.getStage();
  if (!s.selection.includes(id)) s.select(e.evt?.shiftKey ? [...s.selection, id] : [id]);
  let selection = store().selection;
  if (e.evt?.altKey) {
    // Alt+drag: leave copies behind, keep moving the originals.
    store().duplicate(selection, 0);
    store().select(selection);
    selection = store().selection;
  }
  useEditor.setState({ pointerDrag: true });
  dragStarts = new Map();
  for (const sid of selection) {
    const n = nodeOf(stage, sid);
    if (n) dragStarts.set(sid, n.position());
  }
  dragLead = { id, start: dragStarts.get(id) ?? e.target.position() };
}

export function objectDragMove(e: Konva.KonvaEventObject<DragEvent>) {
  if (!dragLead) return;
  const stage = e.target.getStage();
  const p = e.target.position();
  const dx = p.x - dragLead.start.x;
  const dy = p.y - dragLead.start.y;
  for (const [sid, start] of dragStarts) {
    if (sid === dragLead.id) continue;
    nodeOf(stage, sid)?.position({ x: start.x + dx, y: start.y + dy });
  }
}

export function objectDragEnd(e: Konva.KonvaEventObject<DragEvent>) {
  if (!dragLead) return;
  const stage = e.target.getStage();
  const p = e.target.position();
  const dx = p.x - dragLead.start.x;
  const dy = p.y - dragLead.start.y;
  const ids = [...dragStarts.keys()];
  // Arrows keep their geometry in points; their node offset must return to the origin.
  for (const [sid, start] of dragStarts) nodeOf(stage, sid)?.position(start);
  dragStarts = new Map();
  dragLead = null;
  useEditor.setState({ pointerDrag: false });
  if (dx || dy) store().updateObjects(ids, (o) => translate(o, dx, dy));
}

/** Stage pointer down on empty space in Select: marquee or clear. */
export function useSelectTool(setMarquee: (r: Rect | null) => void) {
  return useCallback(
    (e: Konva.KonvaEventObject<PointerEvent>) => {
      const stage = e.target.getStage();
      if (!stage || e.evt.button !== 0) return;
      const shift = e.evt.shiftKey;
      trackDrag(
        stage,
        e.evt,
        (m) => setMarquee(m.moved ? rectFromDrag(m.start, m.point, null, false) : null),
        (m, cancelled) => {
          setMarquee(null);
          if (cancelled) return;
          if (!m.moved) {
            if (!shift) store().clearSelection();
            return;
          }
          marqueeSelect(rectFromDrag(m.start, m.point, null, false), shift);
        },
      );
    },
    [setMarquee],
  );
}
