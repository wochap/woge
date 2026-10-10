import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import Konva from "konva";
import { useEditor } from "../../store/editor";
import { builtInDefaults, useSettings } from "../../store/settings";
import { applyStyle, setColour, snapStep, stepOpacity, stripContext } from "../strips/apply";
import { useAnnotationStrip } from "../strips/AnnotationStrip";
import { dispatchKey } from "../../lib/keys";
import { FontCombobox } from "../strips/FontCombobox";
import { foldTransform } from "../../tools/select/SelectionTransformer";
import type { ArrowObj, RectObj, TextObj } from "../../model/objects";

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
    fill: null,
    fillOpacity: 0.25,
    strokeOpacity: 1,
  })!;
  const a = s().addObject({
    type: "arrow",
    strokeOpacity: 1,
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

const doc = () => useEditor.getState().document!;
const obj = <T,>(id: string) => doc().objects.find((o) => o.id === id) as T;
const past = () => useEditor.getState().history!.past.length;

describe("colour roles", () => {
  it("snaps opacity steps to multiples of 10%", () => {
    expect(snapStep(0.25, 1)).toBe(0.3);
    expect(snapStep(0.3, -1)).toBe(0.2);
    expect(snapStep(0.2, -1)).toBe(0.1);
    expect(snapStep(1, 1)).toBe(1);
    expect(snapStep(0, -1)).toBe(0);
  });

  it("} steps fill opacity, { twice lowers it", () => {
    const { r } = setup();
    useEditor.getState().updateObjects([r], { fill: "yellow", fillOpacity: 0.25 });
    useEditor.getState().select([r]);
    const ctx = () => stripContext("select", [r], doc().objects)!;
    stepOpacity(ctx(), "secondary", 1);
    expect(obj<RectObj>(r).fillOpacity).toBe(0.3);
    stepOpacity(ctx(), "secondary", -1);
    stepOpacity(ctx(), "secondary", -1);
    expect(obj<RectObj>(r).fillOpacity).toBe(0.1);
  });

  it("clamped step adds no history entry", () => {
    const { a } = setup();
    const ctx = stripContext("select", [a], doc().objects)!;
    const n = past();
    stepOpacity(ctx, "primary", 1);
    expect(past()).toBe(n);
  });

  it("arrow ignores the secondary role", () => {
    const { a } = setup();
    const ctx = stripContext("select", [a], doc().objects)!;
    const n = past();
    setColour(ctx, "secondary", "peach");
    stepOpacity(ctx, "secondary", 1);
    expect(past()).toBe(n);
    expect(obj<ArrowObj>(a)).not.toHaveProperty("fill");
  });

  it("mixed selection applies fill only where supported", () => {
    const { r, a } = setup();
    const ctx = stripContext("select", [r, a], doc().objects)!;
    const n = past();
    setColour(ctx, "secondary", "blue");
    expect(past()).toBe(n + 1);
    expect(obj<RectObj>(r)).toMatchObject({ fill: "blue", fillOpacity: 0.25 });
    expect(obj<ArrowObj>(a)).not.toHaveProperty("fill");
  });

  it("digit sets a selected rect's border in one entry, and the default", () => {
    const { r } = setup();
    const n = past();
    setColour(stripContext("select", [r], doc().objects)!, "primary", "green");
    expect(obj<RectObj>(r).stroke).toBe("green");
    expect(past()).toBe(n + 1);
    expect(useSettings.getState().tools.rect.stroke).toBe("green");
  });

  it("⇧3 with Rectangle active changes only the tool default", () => {
    setup();
    useEditor.getState().clearSelection();
    const n = past();
    setColour(stripContext("rect", [], doc().objects)!, "secondary", "yellow");
    expect(useSettings.getState().tools.rect).toMatchObject({ fill: "yellow", fillOpacity: 0.25 });
    expect(past()).toBe(n);
  });

  it("} on text without a plate picks the contrasting plate", () => {
    setup();
    const t = useEditor.getState().addObject({
      type: "text",
      x: 0,
      y: 0,
      text: "hi",
      color: "yellow",
      colorOpacity: 1,
      font: "Inter Variable",
      size: 24,
      bold: false,
      plate: null,
      plateOpacity: 0.7,
    })!;
    stepOpacity(stripContext("select", [t], doc().objects)!, "secondary", 1);
    expect(obj<TextObj>(t)).toMatchObject({ plate: "black", plateOpacity: 0.7 });
  });

  it("digits typed in the text editor are not dispatched", () => {
    const area = document.createElement("textarea");
    const e = new KeyboardEvent("keydown", { key: "3", code: "Digit3", cancelable: true });
    Object.defineProperty(e, "target", { value: area });
    const h = vi.fn();
    expect(dispatchKey(e, { "colour.primary": h })).toBe(false);
    expect(h).not.toHaveBeenCalled();
  });
});

function Host() {
  return <>{useAnnotationStrip()}</>;
}

describe("colour strip", () => {
  it("Fill chip + swatch sets the fill; ⊘ hidden for Border; ⊘ clears and disables", () => {
    const { r } = setup();
    act(() => {
      useEditor.getState().setActiveTool("select");
      useEditor.getState().select([r]);
    });
    const { container } = render(<Host />);
    const none = container.querySelector<HTMLButtonElement>(".swatch-none")!;
    expect(none.style.visibility).toBe("hidden");
    expect(screen.getByRole("radio", { name: "peach" }).title).toBe("Peach 2");
    fireEvent.click(screen.getByRole("radio", { name: /Fill/ }));
    expect(screen.getByRole("radio", { name: "peach" }).title).toBe("Peach ⇧2");
    expect(none.style.visibility).toBe("visible");
    fireEvent.click(screen.getByRole("radio", { name: "blue" }));
    expect(obj<RectObj>(r)).toMatchObject({ fill: "blue", fillOpacity: 0.25 });
    expect(screen.getByText("25%")).toBeInTheDocument();
    fireEvent.click(none);
    expect(obj<RectObj>(r).fill).toBeNull();
    expect(screen.getByText("—")).toBeInTheDocument();
    expect((screen.getByLabelText("Opacity") as HTMLInputElement).disabled).toBe(true);
  });

  it("Text strip shows Text/Plate chips", () => {
    setup();
    act(() => useEditor.getState().setActiveTool("text"));
    render(<Host />);
    expect(screen.getByRole("radio", { name: /Text/ })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /Plate/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Plate" })).toBeNull();
  });

  it("highlighter slider defaults to 50%", () => {
    setup();
    act(() => useEditor.getState().setActiveTool("highlighter"));
    render(<Host />);
    expect((screen.getByLabelText("Opacity") as HTMLInputElement).value).toBe("50");
    expect(screen.queryByText(/multiply/)).toBeNull();
  });

  it("one slider drag makes one history entry", () => {
    const { a } = setup();
    act(() => {
      useEditor.getState().setActiveTool("select");
      useEditor.getState().select([a]);
    });
    render(<Host />);
    const n = past();
    const slider = screen.getByLabelText("Opacity");
    for (const v of ["90", "70", "40"]) fireEvent.change(slider, { target: { value: v } });
    expect(past()).toBe(n);
    expect(obj<ArrowObj>(a).strokeOpacity).toBe(0.4);
    fireEvent.pointerUp(slider);
    expect(past()).toBe(n + 1);
    expect(obj<ArrowObj>(a).strokeOpacity).toBe(0.4);
    act(() => useEditor.getState().undo());
    expect(obj<ArrowObj>(a).strokeOpacity).toBe(1);
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
      fill: null,
      fillOpacity: 0.25,
      strokeOpacity: 1,
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
      plate: null,
      plateOpacity: 0.7,
      colorOpacity: 1,
      w: 100,
    };
    expect(foldTransform(t, new Konva.Group({ scaleX: 2, scaleY: 2 }), "bottom-right").size).toBe(
      48,
    );
    const side = foldTransform(t, new Konva.Group({ scaleX: 1.5, scaleY: 1 }), "middle-right");
    expect(side).toMatchObject({ size: 24, w: 150 });
  });
});
