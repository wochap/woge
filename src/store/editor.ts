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

export interface EditorDocument {
  base: ImageBitmap;
  width: number;
  height: number;
  /** null for stdin/clipboard inputs (no Save in place). */
  sourcePath: string | null;
  name: string;
}

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
  document: EditorDocument | null;
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

  setDocument(doc: EditorDocument | null): void;
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
  viewport: { x: 0, y: 0, scale: 1 },
  fitted: true,
  canvasSize: { width: 0, height: 0 },
  activeTool: "select",
  loading: null,
  toast: null,
  pointer: null,
  checkerboard: false,
  statusLine: true,

  setDocument(doc) {
    const prev = get().document;
    if (prev && prev.base !== doc?.base) prev.base.close?.();
    set({ document: doc, pointer: null });
    if (doc) get().fit();
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
    const { document, canvasSize } = get();
    if (!document || canvasSize.width === 0) return set({ fitted: true });
    set({ viewport: fitTransform(document, canvasSize), fitted: true });
  },
  actualSize() {
    const { document, canvasSize, viewport } = get();
    if (!document) return;
    const p = screenToImage(viewport, centre(canvasSize));
    set({ viewport: centreAt(document, canvasSize, 1, p), fitted: false });
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
    const { document, viewport } = get();
    if (!document || !screen) return set({ pointer: null });
    const p = screenToImage(viewport, screen);
    const inside = p.x >= 0 && p.y >= 0 && p.x < document.width && p.y < document.height;
    set({ pointer: inside ? { x: Math.floor(p.x), y: Math.floor(p.y) } : null });
  },
  setCheckerboard(on) {
    set({ checkerboard: on });
  },
  setStatusLine(on) {
    set({ statusLine: on });
  },
}));
