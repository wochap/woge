import { act, render, screen } from "@testing-library/react";
import { useEditor } from "../store/editor";
import { builtInDefaults, useSettings } from "../store/settings";
import type { BadgeObj, RectObj } from "../model/objects";

vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow: () => ({ onCloseRequested: () => Promise.resolve(() => {}) }),
}));
vi.mock("../canvas/Stage", () => ({ Stage: () => null }));
vi.mock("../useInputs", () => ({
  useInputs: () => ({ dropActive: false, openDialog: () => {}, openClipboard: () => {} }),
}));
vi.mock("../lib/backend", () => ({
  writeState: () => Promise.resolve(),
  readState: () => Promise.resolve(null),
  listFonts: () => Promise.resolve([]),
}));

import App from "../App";

const ed = () => useEditor.getState();
const press = (init: KeyboardEventInit) =>
  act(() => {
    window.dispatchEvent(new KeyboardEvent("keydown", { cancelable: true, ...init }));
  });
const obj = <T,>(id: string) => ed().document!.objects.find((o) => o.id === id) as T;
const past = () => ed().history!.past.length;

function setup() {
  useSettings.setState({ tools: builtInDefaults(), recentFonts: [] });
  ed().loadImage({ close() {} } as unknown as ImageBitmap, {
    path: null,
    name: "t",
    width: 1000,
    height: 1000,
  });
  const rect = ed().addObject({
    type: "rect",
    x: 0,
    y: 0,
    w: 10,
    h: 10,
    stroke: "blue",
    strokeWidth: "S",
    fill: "red",
    fillOpacity: 0.5,
    strokeOpacity: 1,
  })!;
  const arrow = ed().addObject({
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
  act(() => ed().setActiveTool("select"));
  return { rect, arrow };
}

describe("colour role follows shortcuts", () => {
  it("⇧3 flips to Fill and fill becomes yellow", () => {
    const { rect } = setup();
    act(() => ed().select([rect]));
    render(<App />);
    expect(screen.getByRole("radio", { name: /Border/ })).toBeChecked();
    press({ key: "#", code: "Digit3", shiftKey: true });
    expect(screen.getByRole("radio", { name: /Fill/ })).toBeChecked();
    expect(obj<RectObj>(rect).fill).toBe("yellow");
    expect(screen.getByRole("radio", { name: "yellow" })).toBeChecked();
  });

  it("} switches to Fill and { on arrows does nothing", () => {
    const { rect, arrow } = setup();
    act(() => ed().select([rect]));
    render(<App />);
    press({ key: "}", code: "BracketRight", shiftKey: true });
    expect(ed().colourRole).toBe("secondary");
    expect(obj<RectObj>(rect).fillOpacity).toBe(0.6);
    act(() => ed().select([arrow]));
    act(() => ed().setActiveTool("select"));
    expect(ed().colourRole).toBe("primary");
    press({ key: "{", code: "BracketLeft", shiftKey: true });
    expect(ed().colourRole).toBe("primary");
  });

  it("resets to primary when the kind changes", () => {
    const { rect, arrow } = setup();
    act(() => ed().select([rect]));
    render(<App />);
    press({ key: "#", code: "Digit3", shiftKey: true });
    expect(ed().colourRole).toBe("secondary");
    act(() => ed().select([arrow]));
    expect(ed().colourRole).toBe("primary");
  });
});

describe("width shortcuts", () => {
  it("Alt+L sets selection and default in one history entry", () => {
    const { rect } = setup();
    act(() => ed().select([rect]));
    render(<App />);
    const n = past();
    press({ key: "¬", code: "KeyL", altKey: true });
    expect(obj<RectObj>(rect).strokeWidth).toBe("L");
    expect(useSettings.getState().tools.rect.strokeWidth).toBe("L");
    expect(past()).toBe(n + 1);
    expect(ed().activeTool).toBe("select");
  });

  it("Alt+S on the Brush tool changes its default", () => {
    setup();
    act(() => ed().setActiveTool("brush"));
    render(<App />);
    press({ key: "ß", code: "KeyS", altKey: true });
    expect(useSettings.getState().tools.brush.strokeWidth).toBe("S");
  });

  it("Alt+M sets badge size", () => {
    setup();
    const b = ed().addObject({
      type: "badge",
      x: 5,
      y: 5,
      n: 1,
      color: "blue",
      size: "S",
    } as never)!;
    act(() => ed().select([b]));
    render(<App />);
    press({ key: "µ", code: "KeyM", altKey: true });
    expect(obj<BadgeObj>(b).size).toBe("M");
  });

  it("does nothing for text", () => {
    setup();
    const t = ed().addObject({
      type: "text",
      x: 0,
      y: 0,
      text: "a",
      color: "yellow",
      colorOpacity: 1,
      font: "Inter Variable",
      size: 24,
      bold: false,
      plate: null,
      plateOpacity: 0.7,
    })!;
    act(() => ed().select([t]));
    render(<App />);
    const n = past();
    press({ key: "µ", code: "KeyM", altKey: true });
    expect(past()).toBe(n);
  });
});
