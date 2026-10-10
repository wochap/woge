import { create } from "zustand";
import {
  ZOOM_STEP,
  centreAt,
  fitTransform,
  keepCentre,
  screenToImage,
  zoomAround,
  zoomToScale,
  type Point,
  type Size,
  type View,
} from "../lib/viewport";
import type { ToolId } from "../tools/registry";
import {
  newDocument,
  rotatedDims,
  visibleSize,
  type Dims,
  type Document,
  type DocumentSource,
  type Rect,
} from "../model/document";
import { rotateDocument, type Dir } from "../model/geometry";
import * as H from "./history";
import {
  applyPatch,
  maxZ,
  newId,
  nextBadgeNumber as maxBadgeNext,
  renumberBadges,
  reorder as reorderObjects,
  translate,
  type AnnotationObject,
  type NewObject,
  type ObjectPatch,
  type ReorderDir,
} from "../model/objects";

export const DUPLICATE_OFFSET = 10;
type ObjectUpdate = ObjectPatch | ((o: AnnotationObject) => AnnotationObject);
import type { CropPreset } from "../tools/crop/math";

export type Mode = "none" | "crop" | "resize";

export interface ToastMessage {
  id: number;
  text: string;
  kind: "info" | "success" | "error";
  action?: { label: string; run: () => void };
}

export interface Loading {
  name: string;
}

interface EditorState {
  /** Present document (mirror of `history.present`). */
  document: Document | null;
  /** Base bitmap; not part of the document. */
  bitmap: ImageBitmap | null;
  history: H.History | null;
  mode: Mode;
  /** Transient crop rect (rotated-image space) while in crop mode. */
  cropDraft: Rect | null;
  cropPreset: CropPreset;
  /** Transient output size while in resize mode. */
  /** Output-space draft rect; `x/y` is its offset from the current image origin (view-only). */
  resizeDraft: Rect | null;
  resizeLock: boolean;
  /** Set while a canvas pointer drag is in progress; undo/redo are inert. */
  pointerDrag: boolean;
  viewport: View;
  /** True until the user zooms or pans after a fit; resizes re-fit while set. */
  fitted: boolean;
  canvasSize: Size;
  activeTool: ToolId;
  loading: Loading | null;
  toast: ToastMessage | null;
  pointer: Point | null;
  checkerboard: boolean;
  statusLine: boolean;
  /** Selected annotation object ids. */
  selection: string[];
  /** In-memory object clipboard (session only). */
  objectClipboard: AnnotationObject[];
  /** Object being drawn by a shape tool; not yet in the document. */
  drawing: AnnotationObject | null;
  /** Text object currently open in the in-place editor. */
  editingText: string | null;
  /** True while the text being edited was just created (cancel removes it). */
  editingIsNew: boolean;
  /** Badge open in the inline number editor. */
  editingBadge: string | null;
  /** Live size of an in-progress freehand stroke (the stroke itself lives on the ui layer). */
  liveSize: Dims | null;
  /** Counter after Reset; null follows `max(n) + 1`. */
  badgeCounter: number | null;
  /** Config `badge_renumber`: deleting badges closes gaps. */
  badgeRenumber: boolean;

  loadImage(bitmap: ImageBitmap, source: DocumentSource): void;
  commit(doc: Document): void;
  undo(): void;
  redo(): void;
  rotate(dir: Dir): void;
  /** Dimensions currently drawn on the canvas (full rotated image in crop mode). */
  displayDims(): Dims | null;
  setViewport(view: View): void;
  setCanvasSize(size: Size): void;
  fit(): void;
  actualSize(): void;
  zoomTo(scale: number, aroundScreenPoint?: Point): void;
  zoomBy(factor: number, aroundScreenPoint?: Point): void;
  zoomStep(dir: 1 | -1): void;
  setActiveTool(tool: ToolId): void;
  setLoading(loading: Loading | null): void;
  showToast(text: string, kind?: ToastMessage["kind"], action?: ToastMessage["action"]): void;
  dismissToast(id: number): void;
  setPointer(screen: Point | null): void;
  setCheckerboard(on: boolean): void;
  setStatusLine(on: boolean): void;

  addObject(obj: NewObject): string | null;
  updateObjects(ids: string[], update: ObjectUpdate): void;
  deleteObjects(ids: string[]): void;
  duplicate(ids: string[], offset?: number): string[];
  reorder(ids: string[], dir: ReorderDir): void;
  select(ids: string[]): void;
  toggleSelect(id: string): void;
  selectAll(): void;
  clearSelection(): void;
  copyObjects(): boolean;
  cutObjects(): boolean;
  pasteObjects(): boolean;
  setDrawing(obj: AnnotationObject | null): void;
  setEditingText(id: string | null, isNew?: boolean): void;
  setEditingBadge(id: string | null): void;
  /** Number the next badge gets. */
  nextBadgeNumber(): number;
  /** Take the next badge number, advancing a reset counter. */
  takeBadgeNumber(): number;
  resetBadgeCounter(): void;
  /** Set a badge's number by hand; others keep theirs. */
  setBadgeNumber(id: string, n: number): void;
}

/** Keep only ids still present in `doc`. */
function prune(selection: string[], doc: Document): string[] {
  const ids = new Set(doc.objects.map((o) => o.id));
  return selection.filter((id) => ids.has(id));
}

function cloneWithOffset(
  objs: AnnotationObject[],
  base: number,
  offset: number,
): AnnotationObject[] {
  return [...objs]
    .sort((a, b) => a.z - b.z)
    .map((o, i) => {
      const c = {
        ...translate(structuredClone(o), offset, offset),
        id: newId(),
        z: base + i + 1,
      } as AnnotationObject;
      // Copied badges take the next numbers.
      if (c.type === "badge") c.n = useEditor.getState().takeBadgeNumber();
      return c;
    });
}

let toastId = 0;
/** Numbers handed out but not yet committed (copies built before one commit). */
let pendingBadge = 0;
const centre = (s: Size): Point => ({ x: s.width / 2, y: s.height / 2 });

export const useEditor = create<EditorState>((set, get) => ({
  document: null,
  bitmap: null,
  history: null,
  mode: "none",
  cropDraft: null,
  cropPreset: "free",
  resizeDraft: null,
  resizeLock: true,
  pointerDrag: false,
  viewport: { x: 0, y: 0, scale: 1 },
  fitted: true,
  canvasSize: { width: 0, height: 0 },
  activeTool: "select",
  loading: null,
  toast: null,
  pointer: null,
  checkerboard: false,
  statusLine: true,
  selection: [],
  objectClipboard: [],
  drawing: null,
  editingText: null,
  editingIsNew: false,
  editingBadge: null,
  liveSize: null,
  badgeCounter: null,
  badgeRenumber: true,

  loadImage(bitmap, source) {
    const prev = get().bitmap;
    if (prev && prev !== bitmap) prev.close?.();
    const history = H.reset(newDocument(source));
    set({
      bitmap,
      history,
      document: history.present,
      pointer: null,
      mode: "none",
      cropDraft: null,
      resizeDraft: null,
      activeTool: "select",
      selection: [],
      drawing: null,
      editingText: null,
      editingBadge: null,
      badgeCounter: null,
    });
    get().fit();
  },
  commit(doc) {
    const { history, fitted } = get();
    pendingBadge = 0;
    if (!history) return;
    const next = H.commit(history, doc);
    set({
      history: next,
      document: next.present,
      selection: prune(get().selection, next.present),
    });
    if (fitted) get().fit();
  },
  undo() {
    const { history, pointerDrag, fitted } = get();
    if (!history || pointerDrag || !H.canUndo(history)) return;
    const next = H.undo(history);
    set({
      history: next,
      document: next.present,
      mode: "none",
      cropDraft: null,
      resizeDraft: null,
      activeTool: "select",
      selection: prune(get().selection, next.present),
      editingText: null,
    });
    if (fitted) get().fit();
  },
  redo() {
    const { history, pointerDrag, fitted } = get();
    if (!history || pointerDrag || !H.canRedo(history)) return;
    const next = H.redo(history);
    set({
      history: next,
      document: next.present,
      mode: "none",
      cropDraft: null,
      resizeDraft: null,
      activeTool: "select",
      selection: prune(get().selection, next.present),
      editingText: null,
    });
    if (fitted) get().fit();
  },
  rotate(dir) {
    const { document, mode } = get();
    if (!document || mode !== "none") return;
    get().commit(rotateDocument(document, dir));
  },
  displayDims() {
    const { document, mode, resizeDraft } = get();
    if (!document) return null;
    if (mode === "crop") return rotatedDims(document);
    if (mode === "resize" && resizeDraft) return { w: resizeDraft.w, h: resizeDraft.h };
    return visibleSize(document);
  },
  setViewport(view) {
    set({ viewport: view, fitted: false });
  },
  setCanvasSize(size) {
    const { canvasSize: prev, fitted, document, viewport } = get();
    if (prev.width === size.width && prev.height === size.height) return;
    set({ canvasSize: size });
    if (!document) return;
    if (fitted || prev.width === 0) get().fit();
    else set({ viewport: keepCentre(viewport, prev, size) });
  },
  fit() {
    const { canvasSize } = get();
    const dims = get().displayDims();
    if (!dims || canvasSize.width === 0) return set({ fitted: true });
    set({ viewport: fitTransform({ width: dims.w, height: dims.h }, canvasSize), fitted: true });
  },
  actualSize() {
    const { document, canvasSize, viewport } = get();
    if (!document) return;
    const p = screenToImage(viewport, centre(canvasSize));
    set({ viewport: centreAt(canvasSize, canvasSize, 1, p), fitted: false });
  },
  zoomTo(scale, around) {
    const { document, viewport, canvasSize } = get();
    if (!document) return;
    set({ viewport: zoomToScale(viewport, scale, around ?? centre(canvasSize)), fitted: false });
  },
  zoomBy(factor, around) {
    const { document, viewport, canvasSize } = get();
    if (!document) return;
    set({ viewport: zoomAround(viewport, factor, around ?? centre(canvasSize)), fitted: false });
  },
  zoomStep(dir) {
    get().zoomBy(dir > 0 ? ZOOM_STEP : 1 / ZOOM_STEP);
  },
  setActiveTool(tool) {
    set({ activeTool: tool });
  },
  setLoading(loading) {
    set({ loading });
  },
  showToast(text, kind = "info", action) {
    set({ toast: { id: ++toastId, text, kind, action } });
  },
  dismissToast(id) {
    if (get().toast?.id === id) set({ toast: null });
  },
  setPointer(screen) {
    const { viewport } = get();
    const dims = get().displayDims();
    if (!dims || !screen) return set({ pointer: null });
    const p = screenToImage(viewport, screen);
    const inside = p.x >= 0 && p.y >= 0 && p.x < dims.w && p.y < dims.h;
    set({ pointer: inside ? { x: Math.floor(p.x), y: Math.floor(p.y) } : null });
  },
  setCheckerboard(on) {
    set({ checkerboard: on });
  },
  setStatusLine(on) {
    set({ statusLine: on });
  },

  addObject(obj) {
    const doc = get().document;
    if (!doc) return null;
    const id = obj.id ?? newId();
    const full = { ...obj, id, z: maxZ(doc.objects) + 1 } as AnnotationObject;
    get().commit({ ...doc, objects: [...doc.objects, full] });
    set({ selection: [id] });
    return id;
  },
  updateObjects(ids, update) {
    const doc = get().document;
    if (!doc || !ids.length) return;
    const sel = new Set(ids);
    let changed = false;
    const objects = doc.objects.map((o) => {
      if (!sel.has(o.id)) return o;
      const n = typeof update === "function" ? update(o) : applyPatch(o, update);
      if (JSON.stringify(n) !== JSON.stringify(o)) changed = true;
      return n;
    });
    if (changed) get().commit({ ...doc, objects });
  },
  deleteObjects(ids) {
    const doc = get().document;
    if (!doc || !ids.length) return;
    const sel = new Set(ids);
    let objects = doc.objects.filter((o) => !sel.has(o.id));
    if (objects.length === doc.objects.length) return;
    const badgeGone = doc.objects.some((o) => sel.has(o.id) && o.type === "badge");
    if (badgeGone && get().badgeRenumber) {
      objects = renumberBadges(objects);
      set({ badgeCounter: null });
    }
    get().commit({ ...doc, objects });
    set({ selection: get().selection.filter((id) => !sel.has(id)) });
  },
  duplicate(ids, offset = DUPLICATE_OFFSET) {
    const doc = get().document;
    if (!doc || !ids.length) return [];
    const sel = new Set(ids);
    const copies = cloneWithOffset(
      doc.objects.filter((o) => sel.has(o.id)),
      maxZ(doc.objects),
      offset,
    );
    if (!copies.length) return [];
    get().commit({ ...doc, objects: [...doc.objects, ...copies] });
    const out = copies.map((o) => o.id);
    set({ selection: out });
    return out;
  },
  reorder(ids, dir) {
    const doc = get().document;
    if (!doc || !ids.length) return;
    const objects = reorderObjects(doc.objects, ids, dir);
    const before = doc.objects
      .map((o) => `${o.id}:${o.z}`)
      .sort()
      .join();
    const after = objects
      .map((o) => `${o.id}:${o.z}`)
      .sort()
      .join();
    if (before !== after) get().commit({ ...doc, objects });
  },
  select(ids) {
    set({ selection: [...new Set(ids)] });
  },
  toggleSelect(id) {
    const sel = get().selection;
    set({ selection: sel.includes(id) ? sel.filter((s) => s !== id) : [...sel, id] });
  },
  selectAll() {
    set({ selection: get().document?.objects.map((o) => o.id) ?? [] });
  },
  clearSelection() {
    if (get().selection.length) set({ selection: [] });
  },
  copyObjects() {
    const { document: doc, selection } = get();
    if (!doc || !selection.length) return false;
    const sel = new Set(selection);
    set({ objectClipboard: structuredClone(doc.objects.filter((o) => sel.has(o.id))) });
    return true;
  },
  cutObjects() {
    if (!get().copyObjects()) return false;
    get().deleteObjects(get().selection);
    return true;
  },
  pasteObjects() {
    const { document: doc, objectClipboard } = get();
    if (!doc || !objectClipboard.length) return false;
    const copies = cloneWithOffset(objectClipboard, maxZ(doc.objects), DUPLICATE_OFFSET);
    get().commit({ ...doc, objects: [...doc.objects, ...copies] });
    // Repeated pastes cascade.
    set({
      selection: copies.map((o) => o.id),
      objectClipboard: objectClipboard.map((o) => translate(o, DUPLICATE_OFFSET, DUPLICATE_OFFSET)),
    });
    return true;
  },
  setDrawing(obj) {
    set({ drawing: obj });
  },
  setEditingText(id, isNew = false) {
    set({ editingText: id, editingIsNew: id ? isNew : false });
  },
  setEditingBadge(id) {
    set({ editingBadge: id });
  },
  nextBadgeNumber() {
    const { document: doc, badgeCounter } = get();
    return (badgeCounter ?? maxBadgeNext(doc?.objects ?? [])) + pendingBadge;
  },
  takeBadgeNumber() {
    const n = get().nextBadgeNumber();
    if (get().badgeCounter !== null) set({ badgeCounter: get().badgeCounter! + 1 });
    else pendingBadge++;
    return n;
  },
  resetBadgeCounter() {
    set({ badgeCounter: 1 });
  },
  setBadgeNumber(id, n) {
    const v = Math.max(0, Math.round(n));
    if (!Number.isFinite(v)) return;
    set({ badgeCounter: null });
    get().updateObjects([id], { n: v });
  },
}));
