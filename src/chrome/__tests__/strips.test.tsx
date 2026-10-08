import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import Konva from "konva";
import { useEditor } from "../../store/editor";
import { builtInDefaults, useSettings } from "../../store/settings";
import { applyStyle, stripContext } from "../strips/apply";
import { FontCombobox } from "../strips/FontCombobox";
import { foldTransform } from "../../tools/select/SelectionTransformer";
import type { RectObj, TextObj } from "../../model/objects";

vi.mock("../../lib/backend", () => ({
  writeState: () => Promise.resolve(),
  readState: () => Promise.resolve(null),
  listFonts: () => Promise.resolve([]),
}));

function setup() {
  useSettings.setState({ tools: builtInDefaults(), recentFonts: [] });
  useEditor.getState().loadImage({ close() {} } as unknown as ImageBitmap, {
    path: null,
    name: "t",
    width: 1000,
    height: 1000,
  });
  const s = useEditor.getState;
  const r = s().addObject({
    type: "rect",
    x: 0,
    y: 0,
    w: 10,
    h: 10,
    stroke: "blue",
    strokeWidth: "M",
    fill: false,
  })!;
  const a = s().addObject({
    type: "arrow",
    x1: 0,
    y1: 0,
    x2: 9,
    y2: 9,
    heads: "end",
    stroke: "blue",
    strokeWidth: "M",
  })!;
  return { r, a };
}

describe("strip semantics", () => {
  it("colour with selection updates the object and the default", () => {
    const { r } = setup();
    useEditor.getState().select([r]);
    const ctx = stripContext("select", [r], useEditor.getState().document!.objects)!;
    expect(ctx.kind).toBe("rect");
    const n = useEditor.getState().history!.past.length;
    applyStyle(ctx, { stroke: "green" });
    const o = useEditor.getState().document!.objects.find((x) => x.id === r) as RectObj;
    expect(o.stroke).toBe("green");
    expect(useEditor.getState().history!.past.length).toBe(n + 1);
    expect(useSettings.getState().tools.rect.stroke).toBe("green");
  });

  it("colour without selection changes only the tool default", () => {
    setup();
    useEditor.getState().clearSelection();
    const ctx = stripContext("arrow", [], useEditor.getState().document!.objects)!;
    const n = useEditor.getState().history!.past.length;
    applyStyle(ctx, { stroke: "yellow" });
    expect(useSettings.getState().tools.arrow.stroke).toBe("yellow");
    expect(useSettings.getState().tools.rect.stroke).toBe("red");
    expect(useEditor.getState().history!.past.length).toBe(n);
  });

  it("mixed selection", () => {
    const { r, a } = setup();
    expect(stripContext("select", [r, a], useEditor.getState().document!.objects)!.kind).toBe(
      "mixed",
    );
    expect(stripContext("select", [], useEditor.getState().document!.objects)).toBeNull();
  });
});

describe("FontCombobox", () => {
  it("filters, groups recent and picks with the keyboard", async () => {
    const onChange = vi.fn();
    const load = () =>
      Promise.resolve([
        "Inter Variable",
        "JetBrains Mono Variable",
        "DejaVu Sans Mono",
        "Noto Sans",
      ]);
    render(
      <FontCombobox
        value="Inter Variable"
        recent={["Noto Sans"]}
        onChange={onChange}
        loadFonts={load}
      />,
    );
    await act(async () => {});
    fireEvent.click(screen.getByRole("button", { name: "Font" }));
    expect(screen.getByText("Recent")).toBeInTheDocument();
    const search = screen.getByLabelText("Search fonts");
    fireEvent.change(search, { target: { value: "mono" } });
    await waitFor(() =>
      expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual([
        "JetBrains Mono Variable",
        "DejaVu Sans Mono",
      ]),
    );
    fireEvent.keyDown(search, { key: "ArrowDown" });
    fireEvent.keyDown(search, { key: "Enter" });
    expect(onChange).toHaveBeenCalledWith("DejaVu Sans Mono");
  });
});

describe("transform folding", () => {
  it("rect scale folds into size; stroke width key unchanged", () => {
    const o: RectObj = {
      id: "r",
      type: "rect",
      z: 1,
      x: 0,
      y: 0,
      w: 10,
      h: 20,
      stroke: "red",
      strokeWidth: "M",
      fill: false,
    };
    const n = new Konva.Group({ x: 5, y: 5, width: 10, height: 20, scaleX: 2, scaleY: 2 });
    expect(foldTransform(o, n, "bottom-right")).toMatchObject({
      x: 5,
      y: 5,
      w: 20,
      h: 40,
      strokeWidth: "M",
    });
    expect(n.scaleX()).toBe(1);
  });

  it("text corner scales size, side sets wrap width", () => {
    const t: TextObj = {
      id: "t",
      type: "text",
      z: 1,
      x: 0,
      y: 0,
      text: "hi",
      color: "red",
      font: "Inter Variable",
      size: 24,
      bold: false,
      plate: false,
      w: 100,
    };
    expect(foldTransform(t, new Konva.Group({ scaleX: 2, scaleY: 2 }), "bottom-right").size).toBe(
      48,
    );
    const side = foldTransform(t, new Konva.Group({ scaleX: 1.5, scaleY: 1 }), "middle-right");
    expect(side).toMatchObject({ size: 24, w: 150 });
  });
});
