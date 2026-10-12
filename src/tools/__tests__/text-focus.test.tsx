import { act, fireEvent, render, screen } from "@testing-library/react";
import { useEditor } from "../../store/editor";
import { TextEditorOverlay } from "../text/TextEditorOverlay";
import { startNewText } from "../text/editing";

vi.mock("../../lib/fonts", () => ({ ensureFontLoaded: vi.fn() }));

const objs = () => useEditor.getState().document!.objects;
const frame = () => act(() => new Promise<void>((r) => requestAnimationFrame(() => r())));

function open() {
  useEditor.getState().loadImage({ close() {} } as unknown as ImageBitmap, {
    path: null,
    name: "t",
    width: 1000,
    height: 1000,
  });
  render(<TextEditorOverlay />);
  act(() => startNewText({ x: 10, y: 10 }));
  return screen.getByTestId("text-editor") as HTMLTextAreaElement;
}

describe("new text editor focus", () => {
  it("stays open and focused when blurred in the opening frame", () => {
    const el = open();
    expect(document.activeElement).toBe(el);
    fireEvent.blur(el);
    expect(screen.queryByTestId("text-editor")).not.toBeNull();
    expect(document.activeElement).toBe(el);
  });

  it("lets typing land after the click, then commits on a later blur", async () => {
    const el = open();
    fireEvent.blur(el);
    fireEvent.change(el, { target: { value: "note" } });
    await frame();
    fireEvent.blur(el);
    expect(screen.queryByTestId("text-editor")).toBeNull();
    expect(objs()).toHaveLength(1);
    expect(objs()[0]).toMatchObject({ type: "text", text: "note" });
  });

  it("commits with Ctrl+Enter", () => {
    const el = open();
    fireEvent.change(el, { target: { value: "x" } });
    fireEvent.keyDown(el, { key: "Enter", ctrlKey: true });
    expect(objs()).toHaveLength(1);
  });
});
