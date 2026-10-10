import { render, screen } from "@testing-library/react";
import { OptionsStrip, editorRows, stripLabel } from "../OptionsStrip";

describe("OptionsStrip", () => {
  it("Select with nothing selected shows label and hint", () => {
    render(<OptionsStrip compact={false} label={stripLabel("select")} hasDocument />);
    expect(screen.getByRole("toolbar")).toBeInTheDocument();
    expect(screen.getByText("Select")).toBeInTheDocument();
    expect(screen.getByText("Click an object to edit its style")).toBeInTheDocument();
    expect(screen.getByText("Del removes · ? shortcuts")).toBeInTheDocument();
  });

  it("no document shows the no-image hint", () => {
    render(<OptionsStrip compact={false} label="Select" hasDocument={false} />);
    expect(screen.getByText("No image yet · drop, paste or open one")).toBeInTheDocument();
  });

  it("tool with options shows label and no hint", () => {
    render(
      <OptionsStrip compact label={stripLabel("rect")} hasDocument>
        <span>opts</span>
      </OptionsStrip>,
    );
    expect(screen.getByText("Rectangle")).toBeInTheDocument();
    expect(screen.getByText("opts")).toBeInTheDocument();
    expect(screen.queryByText("Click an object to edit its style")).toBeNull();
    expect(stripLabel("resize")).toBe("Resize");
  });

  it("strip row is fixed regardless of state", () => {
    expect(editorRows(true)).toBe("var(--topbar-h) var(--strip-h) 1fr auto");
    expect(editorRows(false)).toContain("var(--strip-h)");
  });
});
