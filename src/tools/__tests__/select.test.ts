import { useEditor } from "../../store/editor";
import type { RectObj } from "../../model/objects";
import {
  marqueeSelect,
  nudgeSelection,
  objectPointerDown,
  selectionBounds,
} from "../select/useSelectTool";

const rect = (x: number, w = 10): Omit<RectObj, "id" | "z"> => ({
  type: "rect",
  x,
  y: 0,
  w,
  h: 10,
  stroke: "red",
  strokeWidth: "M",
  fill: false,
});

function setup() {
  useEditor.getState().loadImage({ close() {} } as unknown as ImageBitmap, {
    path: null,
    name: "t",
    width: 1000,
    height: 1000,
  });
  const s = useEditor.getState;
  return [0, 100, 200].map((x) => s().addObject(rect(x))!);
}

describe("selection", () => {
  it("marquee selects exactly the intersecting objects", () => {
    const [a, b] = setup();
    marqueeSelect({ x: 5, y: 5, w: 100, h: 20 }, false);
    expect(useEditor.getState().selection).toEqual([a, b]);
  });

  it("shift+click toggles", () => {
    const [a, b] = setup();
    objectPointerDown(a, false);
    objectPointerDown(b, true);
    expect(useEditor.getState().selection).toEqual([a, b]);
    objectPointerDown(a, true);
    expect(useEditor.getState().selection).toEqual([b]);
  });

  it("nudges with one history entry", () => {
    const [a, b] = setup();
    useEditor.getState().select([a, b]);
    const n = useEditor.getState().history!.past.length;
    nudgeSelection(10, 0);
    expect(useEditor.getState().history!.past.length).toBe(n + 1);
    expect(selectionBounds()).toEqual({ x: 10, y: 0, w: 110, h: 10 });
  });

  it("selection bounds", () => {
    const [a] = setup();
    useEditor.getState().updateObjects([a], { w: 760, h: 224 });
    useEditor.getState().select([a]);
    expect(selectionBounds()).toMatchObject({ w: 760, h: 224 });
  });
});
