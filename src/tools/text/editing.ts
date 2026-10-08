import type { Document } from "../../model/document";
import type { View } from "../../lib/viewport";
import type { TextObj } from "../../model/objects";
import { useEditor } from "../../store/editor";
import { useSettings } from "../../store/settings";
import { newText } from "../shapes/math";
import type { Point } from "../../model/geometry";

const store = useEditor.getState;

/** Text object being edited: an existing one or the not-yet-added draft. */
export function editedText(): TextObj | null {
  const s = store();
  if (!s.editingText) return null;
  if (s.drawing?.id === s.editingText && s.drawing.type === "text") return s.drawing;
  const o = s.document?.objects.find((x) => x.id === s.editingText);
  return o?.type === "text" ? o : null;
}

export function openTextEditor(id: string) {
  const s = store();
  const o = s.document?.objects.find((x) => x.id === id);
  if (!o || o.type !== "text") return;
  s.select([id]);
  s.setEditingText(id, false);
}

/** Text tool click: a draft text opens in the editor; it joins the document on commit. */
export function startNewText(p: Point) {
  const o = newText(p, useSettings.getState().tools);
  const s = store();
  s.clearSelection();
  s.setDrawing(o);
  s.setEditingText(o.id, true);
}

export function commitText(value: string) {
  const s = store();
  const o = editedText();
  const isNew = s.editingIsNew;
  s.setEditingText(null);
  if (!o) return;
  const text = value.replace(/\s+$/, "");
  if (isNew) {
    s.setDrawing(null);
    if (!text) return;
    s.addObject({ ...o, text });
    afterCreate();
  } else if (!text) s.deleteObjects([o.id]);
  else s.updateObjects([o.id], { text });
}

export function cancelText() {
  const s = store();
  if (s.editingIsNew) s.setDrawing(null);
  s.setEditingText(null);
}

/** Non-sticky tools return to Select after creating. */
export function afterCreate() {
  if (!useSettings.getState().sticky) store().setActiveTool("select");
}

/** Screen placement of a text's top-left and its on-screen scale. */
export function textOverlayPosition(doc: Document, view: View, o: { x: number; y: number }) {
  const sx = doc.size.w / doc.crop.w;
  const sy = doc.size.h / doc.crop.h;
  return {
    left: view.x + (o.x - doc.crop.x) * sx * view.scale,
    top: view.y + (o.y - doc.crop.y) * sy * view.scale,
    scale: sy * view.scale,
  };
}
