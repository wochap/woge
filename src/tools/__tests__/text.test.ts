import { useEditor } from "../../store/editor";
import {
  cancelText,
  commitText,
  openTextEditor,
  startNewText,
  textOverlayPosition,
} from "../text/editing";
import { newDocument } from "../../model/document";
import type { TextObj } from "../../model/objects";

function setup() {
  useEditor.getState().loadImage({ close() {} } as unknown as ImageBitmap, {
    path: null,
    name: "t",
    width: 1000,
    height: 1000,
  });
}
const objs = () => useEditor.getState().document!.objects;

describe("text editing", () => {
  it("creates on commit with one history entry", () => {
    setup();
    startNewText({ x: 500, y: 300 });
    expect(objs()).toHaveLength(0);
    commitText("fix before 0.4");
    expect(objs()).toHaveLength(1);
    expect(objs()[0]).toMatchObject({ type: "text", x: 500, y: 300, text: "fix before 0.4" });
    expect(useEditor.getState().selection).toEqual([objs()[0].id]);
    expect(useEditor.getState().history!.past).toHaveLength(1);
  });

  it("empty commit leaves nothing", () => {
    setup();
    startNewText({ x: 1, y: 1 });
    commitText("");
    expect(objs()).toHaveLength(0);
    startNewText({ x: 1, y: 1 });
    cancelText();
    expect(useEditor.getState().drawing).toBeNull();
  });

  it("editing existing to empty deletes it", () => {
    setup();
    startNewText({ x: 1, y: 1 });
    commitText("a");
    openTextEditor(objs()[0].id);
    expect(useEditor.getState().editingText).toBe(objs()[0].id);
    commitText("  ");
    expect(objs()).toHaveLength(0);
  });

  it("overlay follows document and viewport transforms", () => {
    const d = {
      ...newDocument({ path: null, name: "t", width: 1000, height: 1000 }),
      crop: { x: 100, y: 50, w: 500, h: 500 },
      size: { w: 250, h: 250 },
    };
    const p = textOverlayPosition(d, { x: 10, y: 20, scale: 2 }, { x: 300, y: 150 } as TextObj);
    expect(p).toEqual({ left: 10 + 200 * 0.5 * 2, top: 20 + 100 * 0.5 * 2, scale: 1 });
  });
});
