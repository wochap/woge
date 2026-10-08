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
  resizeDraft: Dims | null;
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
}

let toastId = 0;
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
    });
    get().fit();
  },
  commit(doc) {
    const { history, fitted } = get();
    if (!history) return;
    const next = H.commit(history, doc);
    set({ history: next, document: next.present });
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
    if (mode === "resize" && resizeDraft) return resizeDraft;
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
}));
