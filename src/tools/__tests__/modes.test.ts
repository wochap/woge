import { beforeEach, describe, expect, it } from "vitest";
import { useEditor } from "../../store/editor";
import { applyCrop, formatCropStatus } from "../crop/math";
import { applyResize, percentOf, setHeight, setPercent, setWidth } from "../resize/math";
import { cancelMode, confirmMode, enterMode, nudge, setCropPreset } from "../mode";
import { newDocument } from "../../model/document";
import { canUndo } from "../../store/history";

const src = { path: null, name: "a.png", width: 1920, height: 1080 };
const bitmap = { width: 1920, height: 1080, close() {} } as unknown as ImageBitmap;

describe("crop math", () => {
  it("confirm on an unresized document", () => {
    const d = applyCrop(newDocument(src), { x: 240, y: 120, w: 1240, h: 720 });
    expect(d.crop).toEqual({ x: 240, y: 120, w: 1240, h: 720 });
    expect(d.size).toEqual({ w: 1240, h: 720 });
  });
  it("keeps a prior 50% resize", () => {
    const d = applyCrop(
      { ...newDocument(src), size: { w: 960, h: 540 } },
      { x: 0, y: 0, w: 1000, h: 600 },
    );
    expect(d.size).toEqual({ w: 500, h: 300 });
  });
  it("status text", () => {
    expect(formatCropStatus({ x: 240, y: 120, w: 1240, h: 720 })).toBe("crop 1240 × 720 @ 240,120");
  });
});

describe("resize math", () => {
  const orig = { w: 1920, h: 1080 };
  it("percent", () => expect(setPercent(orig, 80)).toEqual({ w: 1536, h: 864 }));
  it("locked width", () => expect(setWidth(orig, orig, 1536, true)).toEqual({ w: 1536, h: 864 }));
  it("unlocked height keeps width", () =>
    expect(setHeight(orig, orig, 500, false)).toEqual({ w: 1920, h: 500 }));
  it("lower bound", () => expect(setWidth(orig, orig, 0, false).w).toBe(1));
  it("percent readout", () => expect(percentOf(orig, { w: 1536, h: 864 })).toBe(80));
  it("only size changes", () => {
    const d = newDocument(src);
    const r = applyResize(d, { w: 960, h: 540 });
    expect({ ...r, size: d.size }).toEqual(d);
  });
});

describe("modes", () => {
  beforeEach(() => {
    useEditor.getState().loadImage(bitmap, src);
  });

  it("crop drag then confirm is one history entry", () => {
    enterMode("crop");
    for (let i = 0; i < 5; i++)
      useEditor.setState({ cropDraft: { x: 240 + i, y: 120, w: 1240, h: 720 } });
    useEditor.setState({ cropDraft: { x: 240, y: 120, w: 1240, h: 720 } });
    confirmMode();
    const s = useEditor.getState();
    expect(s.document!.crop).toEqual({ x: 240, y: 120, w: 1240, h: 720 });
    expect(s.history!.past.length).toBe(1);
    expect(s.mode).toBe("none");
    expect(s.activeTool).toBe("select");
  });

  it("cancel leaves the document and history untouched", () => {
    enterMode("crop");
    useEditor.setState({ cropDraft: { x: 1, y: 1, w: 10, h: 10 } });
    cancelMode();
    const s = useEditor.getState();
    expect(s.document!.crop).toEqual({ x: 0, y: 0, w: 1920, h: 1080 });
    expect(canUndo(s.history)).toBe(false);
  });

  it("nudge and preset", () => {
    enterMode("crop");
    useEditor.setState({ cropDraft: { x: 0, y: 0, w: 1000, h: 1000 } });
    nudge(1, 0);
    expect(useEditor.getState().cropDraft!.x).toBe(1);
    setCropPreset("16:9");
    expect(useEditor.getState().cropDraft!.h).toBe(562);
  });

  it("resize then undo restores size", () => {
    enterMode("resize");
    expect(useEditor.getState().resizeDraft).toEqual({ x: 0, y: 0, w: 1920, h: 1080 });
    useEditor.setState({ resizeDraft: { x: 0, y: 0, w: 960, h: 540 } });
    confirmMode();
    expect(useEditor.getState().document!.size).toEqual({ w: 960, h: 540 });
    useEditor.getState().undo();
    expect(useEditor.getState().document!.size).toEqual({ w: 1920, h: 1080 });
  });

  it("rotate four times: four entries, same document; undo inert mid-drag", () => {
    const start = useEditor.getState().document;
    for (let i = 0; i < 4; i++) useEditor.getState().rotate("cw");
    expect(useEditor.getState().document).toEqual(start);
    expect(useEditor.getState().history!.past.length).toBe(4);
    useEditor.setState({ pointerDrag: true });
    useEditor.getState().undo();
    expect(useEditor.getState().history!.past.length).toBe(4);
    useEditor.setState({ pointerDrag: false });
  });

  it("loading a new image resets history", () => {
    useEditor.getState().rotate("cw");
    useEditor.getState().loadImage(bitmap, src);
    expect(canUndo(useEditor.getState().history)).toBe(false);
  });
});
