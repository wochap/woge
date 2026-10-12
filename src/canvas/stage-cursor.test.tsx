import { act, render, screen } from "@testing-library/react";
import { useEditor } from "../store/editor";
import { Stage } from "./Stage";

vi.mock("react-konva", async () => {
  const Pass = ({ children }: { children?: unknown }) => <>{children as never}</>;
  return {
    Stage: Pass,
    Layer: Pass,
    Group: Pass,
    Rect: () => null,
    Image: () => null,
    Transformer: () => null,
    Circle: () => null,
    Line: () => null,
    Text: () => null,
  };
});

beforeAll(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
});

describe("drawing-tool cursor class", () => {
  it("tool-draw follows the active tool", () => {
    useEditor.getState().loadImage({ close() {} } as unknown as ImageBitmap, {
      path: null,
      name: "t",
      width: 100,
      height: 100,
    });
    render(<Stage checkerboard={false} />);
    const area = screen.getByTestId("canvas-area");
    act(() => useEditor.getState().setActiveTool("brush"));
    expect(area.classList.contains("tool-draw")).toBe(true);
    act(() => useEditor.getState().setActiveTool("select"));
    expect(area.classList.contains("tool-draw")).toBe(false);
    act(() => useEditor.getState().setActiveTool("text"));
    expect(area.classList.contains("tool-draw")).toBe(false);
  });
});
