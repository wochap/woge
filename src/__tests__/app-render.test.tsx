import { act, render, screen } from "@testing-library/react";
import { useEditor } from "../store/editor";

const topBarRenders = vi.fn();

vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow: () => ({ onCloseRequested: () => Promise.resolve(() => {}) }),
}));
vi.mock("../canvas/Stage", () => ({ Stage: () => null }));
vi.mock("../chrome/TopBar", () => ({
  TopBar: () => {
    topBarRenders();
    return null;
  },
}));
vi.mock("../useInputs", () => ({
  useInputs: () => ({ dropActive: false, openDialog: () => {}, openClipboard: () => {} }),
}));

import App from "../App";

describe("App render cascade", () => {
  it("does not re-render App on setPointer while the status line updates", () => {
    useEditor.getState().loadImage({ close() {} } as unknown as ImageBitmap, {
      path: null,
      name: "t",
      width: 100,
      height: 100,
    });
    useEditor.getState().setViewport({ x: 0, y: 0, scale: 1 });
    render(<App />);
    const before = topBarRenders.mock.calls.length;
    act(() => useEditor.getState().setPointer({ x: 40, y: 50 }));
    const p = useEditor.getState().pointer;
    expect(p).not.toBeNull();
    expect(screen.getByText(`x ${p!.x} y ${p!.y}`)).toBeInTheDocument();
    expect(topBarRenders.mock.calls.length).toBe(before);
  });
});
