import { useEditor, type Mode } from "../store/editor";
import { clampMove, fitAspect, clampSide } from "../model/geometry";
import { rotatedDims } from "../model/document";
import { applyCrop, presetRatio } from "./crop/math";
import { applyResize, originalSize, setHeight, setWidth } from "./resize/math";

const store = useEditor.getState;

/** Enter crop or resize mode; switching from another mode cancels it first. */
export function enterMode(mode: Exclude<Mode, "none">) {
  const s = store();
  const doc = s.document;
  if (!doc) return;
  if (s.mode === mode) return;
  if (s.mode !== "none") cancelMode();
  if (mode === "crop") {
    const full = rotatedDims(doc);
    const partial = doc.crop.w < full.w || doc.crop.h < full.h;
    useEditor.setState({
      mode,
      activeTool: "crop",
      cropDraft: partial ? { ...doc.crop } : null,
      cropPreset: "free",
    });
    store().fit();
  } else {
    useEditor.setState({
      mode,
      activeTool: "resize",
      resizeDraft: { ...doc.size },
      resizeLock: true,
    });
  }
}

function leave(refit: boolean) {
  useEditor.setState({
    mode: "none",
    activeTool: "select",
    cropDraft: null,
    resizeDraft: null,
    pointerDrag: false,
  });
  if (refit) store().fit();
}

export function confirmMode() {
  const s = store();
  const doc = s.document;
  if (!doc) return;
  if (s.mode === "crop") {
    const rect = s.cropDraft;
    leave(false);
    if (rect) store().commit(applyCrop(doc, rect));
    store().fit();
  } else if (s.mode === "resize") {
    const size = s.resizeDraft;
    leave(false);
    if (size && (size.w !== doc.size.w || size.h !== doc.size.h))
      store().commit(applyResize(doc, size));
    if (store().fitted) store().fit();
  }
}

export function cancelMode() {
  const s = store();
  if (s.mode === "none") return;
  leave(s.mode === "crop" || s.fitted);
}

/** Arrow keys: move the crop rect, or step W/H in resize mode (respecting the lock). */
export function nudge(dx: number, dy: number) {
  const s = store();
  const doc = s.document;
  if (!doc) return;
  if (s.mode === "crop" && s.cropDraft) {
    const r = s.cropDraft;
    useEditor.setState({
      cropDraft: clampMove({ ...r, x: r.x + dx, y: r.y + dy }, rotatedDims(doc)),
    });
  } else if (s.mode === "resize" && s.resizeDraft) {
    const orig = originalSize(doc);
    const cur = s.resizeDraft;
    const next =
      dx !== 0
        ? setWidth(orig, cur, cur.w + dx, s.resizeLock)
        : setHeight(orig, cur, cur.h - dy, s.resizeLock);
    useEditor.setState({ resizeDraft: { w: clampSide(next.w), h: clampSide(next.h) } });
  }
}

/** Pick a crop preset; the current rect is re-fit to it around its centre. */
export function setCropPreset(preset: ReturnType<typeof store>["cropPreset"]) {
  const s = store();
  const ratio = presetRatio(preset);
  let cropDraft = s.cropDraft;
  if (cropDraft && ratio) {
    const f = fitAspect(cropDraft, ratio);
    cropDraft = { ...f, x: Math.round(f.x), y: Math.round(f.y) };
  }
  useEditor.setState({ cropPreset: preset, cropDraft });
}
