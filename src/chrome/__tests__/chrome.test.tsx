import { act, fireEvent, render, screen } from "@testing-library/react";
import { TopBar, type TopBarProps } from "../TopBar";
import { Toolbar } from "../Toolbar";
import { formatPointer } from "../StatusLine";

vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow: () => ({ startDragging: vi.fn(() => Promise.resolve()) }),
}));

const noop = () => {};
const base: TopBarProps = {
  name: "shot.png",
  dims: { width: 1920, height: 1080 },
  loading: false,
  scale: 0.5,
  compactNarrow: false,
  compactShort: false,
  checkerboard: false,
  onFit: noop,
  onActual: noop,
  onZoomIn: noop,
  onZoomOut: noop,
  onToggleCheckerboard: noop,
  onClose: noop,
};

describe("TopBar", () => {
  it("shows name, dimensions and zoom; output actions enabled with a document", () => {
    const onCopy = vi.fn();
    const onSave = vi.fn();
    const onSaveAs = vi.fn();
    render(<TopBar {...base} onCopy={onCopy} onSave={onSave} onSaveAs={onSaveAs} />);
    expect(screen.getByText("shot.png")).toBeInTheDocument();
    expect(screen.getByText("1920 × 1080")).toBeInTheDocument();
    expect(screen.getByText("50%")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Copy" }));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    fireEvent.click(screen.getByRole("button", { name: "Save as" }));
    expect(onCopy).toHaveBeenCalledOnce();
    expect(onSave).toHaveBeenCalledOnce();
    expect(onSaveAs).toHaveBeenCalledOnce();
    expect(screen.getByText("Fit")).toBeInTheDocument();
    expect(screen.queryByLabelText("Unsaved changes")).toBeNull();
  });

  it("output actions disabled without a document; dirty dot", () => {
    const { rerender } = render(<TopBar {...base} name={null} dims={null} scale={null} />);
    expect(screen.getByRole("button", { name: "Copy" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Save as" })).toBeDisabled();
    rerender(<TopBar {...base} dirty />);
    expect(screen.getByLabelText("Unsaved changes")).toBeInTheDocument();
  });

  it("shows a skeleton while loading and 'woge' when empty", () => {
    const { rerender } = render(<TopBar {...base} loading dims={null} />);
    expect(screen.getByLabelText("Loading")).toBeInTheDocument();
    rerender(<TopBar {...base} name={null} dims={null} scale={null} />);
    expect(screen.getByText("woge")).toBeInTheDocument();
  });

  it("opens the zoom menu with all entries", () => {
    render(<TopBar {...base} />);
    fireEvent.click(screen.getByText("50%"));
    const items = Array.from(screen.getByRole("menu").querySelectorAll("button")).map(
      (i) => i.textContent,
    );
    expect(items).toEqual(["Fit⇧1", "100%⇧0", "Zoom inCtrl +", "Zoom outCtrl −", "Checkerboard"]);
  });

  it("compact folds Fit/100% and moves Undo/Redo in", () => {
    render(<TopBar {...base} compactNarrow compactShort />);
    expect(screen.queryByText("Fit")).toBeNull();
    expect(screen.getByRole("button", { name: "Undo" })).toBeInTheDocument();
  });

  it("close calls onClose", () => {
    const onClose = vi.fn();
    render(<TopBar {...base} onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalled();
  });
});

describe("Toolbar", () => {
  it("lists every tool; geometry tools enabled, history follows availability", () => {
    render(<Toolbar activeTool="select" hasDocument showHistory onSelect={noop} />);
    const select = screen.getByRole("button", { name: "Select" });
    expect(select).toBeEnabled();
    expect(select).toHaveClass("active");
    for (const n of ["Crop", "Resize", "Rotate"]) {
      expect(screen.getByRole("button", { name: n })).toBeEnabled();
    }
    for (const n of [
      "Rectangle",
      "Ellipse",
      "Arrow",
      "Text",
      "Brush",
      "Highlighter",
      "Redact",
      "Counter badge",
      "Undo",
      "Redo",
    ]) {
      expect(screen.getByRole("button", { name: n })).toBeDisabled();
    }
  });

  it("shows a tooltip with the shortcut chip", () => {
    vi.useFakeTimers();
    render(<Toolbar activeTool="select" hasDocument showHistory onSelect={noop} />);
    fireEvent.pointerEnter(screen.getByRole("button", { name: "Rectangle" }).parentElement!);
    act(() => vi.advanceTimersByTime(500));
    expect(screen.getByRole("tooltip")).toHaveTextContent("RectangleR");
    vi.useRealTimers();
  });

  it("disables tools without a document", () => {
    render(<Toolbar activeTool="select" hasDocument={false} showHistory onSelect={noop} />);
    expect(screen.getByRole("button", { name: "Select" })).toBeDisabled();
  });
});

it("formats the pointer", () => {
  expect(formatPointer({ x: 120, y: 45 })).toBe("x 120  y 45");
  expect(formatPointer(null)).toBe("");
});
