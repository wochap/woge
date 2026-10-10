import { useEditor } from "../editor";
import type { AnnotationObject, RectObj } from "../../model/objects";

const rect = (x: number): Omit<RectObj, "id" | "z"> => ({
  type: "rect",
  x,
  y: 0,
  w: 10,
  h: 10,
  stroke: "red",
  strokeWidth: "M",
  fill: null,
  fillOpacity: 0.25,
  strokeOpacity: 1,
});

function setup() {
  const s = useEditor.getState();
  s.loadImage({ width: 100, height: 100, close() {} } as unknown as ImageBitmap, {
    path: null,
    name: "t",
    width: 100,
    height: 100,
  });
  return useEditor.getState;
}

const objs = () => useEditor.getState().document!.objects;
const byZ = () => [...objs()].sort((a, b) => a.z - b.z).map((o) => (o as RectObj).x);

describe("object store", () => {
  it("adds with increasing z and selects the new object", () => {
    const get = setup();
    const a = get().addObject(rect(0))!;
    const b = get().addObject(rect(1))!;
    expect(get().selection).toEqual([b]);
    expect(objs().find((o) => o.id === a)!.z).toBeLessThan(objs().find((o) => o.id === b)!.z);
    expect(get().history!.past.length).toBe(2);
  });

  it("reorders forward, backward, front and back", () => {
    const get = setup();
    const ids = [0, 1, 2].map((x) => get().addObject(rect(x))!);
    get().reorder([ids[0]], "front");
    expect(byZ()).toEqual([1, 2, 0]);
    get().reorder([ids[0]], "back");
    expect(byZ()).toEqual([0, 1, 2]);
    get().reorder([ids[0]], "forward");
    expect(byZ()).toEqual([1, 0, 2]);
    get().reorder([ids[0]], "backward");
    expect(byZ()).toEqual([0, 1, 2]);
    const n = get().history!.past.length;
    get().reorder([ids[0]], "back");
    expect(get().history!.past.length).toBe(n);
  });

  it("duplicates with a 10px offset and selects copies", () => {
    const get = setup();
    const a = get().addObject(rect(5))!;
    const copies = get().duplicate([a]);
    expect(copies).toHaveLength(1);
    expect(get().selection).toEqual(copies);
    const c = objs().find((o) => o.id === copies[0]) as RectObj;
    expect([c.x, c.y]).toEqual([15, 10]);
    expect(c.z).toBe(2);
  });

  it("nudges many objects in one history entry", () => {
    const get = setup();
    const a = get().addObject(rect(0))!;
    const b = get().addObject(rect(20))!;
    const n = get().history!.past.length;
    get().updateObjects([a, b], (o: AnnotationObject) => ({ ...o, x: (o as RectObj).x + 10 }));
    expect(get().history!.past.length).toBe(n + 1);
    expect(byZ()).toEqual([10, 30]);
  });

  it("copies, cuts and pastes objects", () => {
    const get = setup();
    const a = get().addObject(rect(0))!;
    get().addObject(rect(50));
    get().select([a]);
    expect(get().copyObjects()).toBe(true);
    expect(get().pasteObjects()).toBe(true);
    expect(objs()).toHaveLength(3);
    expect((objs().find((o) => o.id === get().selection[0]) as RectObj).x).toBe(10);
    expect(get().cutObjects()).toBe(true);
    expect(objs()).toHaveLength(2);
    get().clearSelection();
    expect(get().copyObjects()).toBe(false);
  });

  it("duplicate, clipboard and rotation keep opacity fields", () => {
    const get = setup();
    const style = { strokeOpacity: 0.5, fill: "yellow", fillOpacity: 0.4 } as const;
    const a = get().addObject({ ...rect(0), ...style })!;
    const [dup] = get().duplicate([a]);
    expect(objs().find((o) => o.id === dup)).toMatchObject(style);
    get().select([a]);
    get().copyObjects();
    get().pasteObjects();
    expect(objs().find((o) => o.id === get().selection[0])).toMatchObject(style);
    get().rotate("cw");
    expect(objs().every((o) => (o as RectObj).fillOpacity === 0.4)).toBe(true);
  });

  it("undo prunes stale selection", () => {
    const get = setup();
    get().addObject(rect(0));
    get().undo();
    expect(get().selection).toEqual([]);
  });

  it("deletes selection", () => {
    const get = setup();
    const a = get().addObject(rect(0))!;
    get().deleteObjects([a]);
    expect(objs()).toHaveLength(0);
    expect(get().selection).toEqual([]);
  });
});
