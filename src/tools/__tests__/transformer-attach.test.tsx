import { act, render } from "@testing-library/react";
import Konva from "konva";
import { Layer, Rect, Stage } from "react-konva";
import { useEditor } from "../../store/editor";
import { SelectionTransformer } from "../select/SelectionTransformer";

// jsdom has no canvas: hand Konva a context whose every method is a no-op.
beforeAll(() => {
  const ctx = new Proxy({} as Record<string, unknown>, {
    get: (t, k) =>
      k in t ? t[k as string] : k === "getImageData" ? () => ({ data: [] }) : () => ({ width: 0 }),
    set: (t, k, v) => ((t[k as string] = v), true),
  });
  HTMLCanvasElement.prototype.getContext = (() => ctx) as never;
});

function Harness() {
  const objects = useEditor((s) => s.document?.objects ?? []);
  return (
    <Stage width={100} height={100}>
      <Layer>
        {objects.map((o) => (
          <Rect key={o.id} id={o.id} width={10} height={10} />
        ))}
        <SelectionTransformer />
      </Layer>
    </Stage>
  );
}

const get = () => useEditor.getState();
const attached = () => {
  const tr = Konva.stages[Konva.stages.length - 1].findOne("Transformer") as Konva.Transformer;
  return tr.nodes().map((n) => n.id());
};

function setup() {
  get().loadImage({ close() {} } as unknown as ImageBitmap, {
    path: null,
    name: "t",
    width: 100,
    height: 100,
  });
  const id = get().addObject({
    type: "rect",
    x: 0,
    y: 0,
    w: 10,
    h: 10,
    stroke: "red",
    strokeWidth: "M",
    fill: null,
    fillOpacity: 0.25,
    strokeOpacity: 1,
  })!;
  render(<Harness />);
  return id;
}

describe("SelectionTransformer attachment", () => {
  it("attaches to the selection and follows undo/redo", () => {
    const id = setup();
    expect(attached()).toEqual([id]);
    act(() => get().undo());
    expect(attached()).toEqual([]);
    act(() => get().redo());
    act(() => get().select([id]));
    expect(attached()).toEqual([id]);
  });

  it("attaches to a duplicate", () => {
    const id = setup();
    let ids: string[] = [];
    act(() => {
      ids = get().duplicate([id]);
    });
    act(() => get().select(ids));
    expect(attached()).toEqual(ids);
  });

  it("detaches on another tool and re-attaches on Select", () => {
    const id = setup();
    act(() => get().setActiveTool("rect"));
    expect(attached()).toEqual([]);
    act(() => get().setActiveTool("select"));
    act(() => get().select([id]));
    expect(attached()).toEqual([id]);
  });
});
