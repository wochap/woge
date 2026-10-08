import { builtInDefaults, mergeState, seedFromConfig } from "../settings";

describe("tool settings", () => {
  it("built-in defaults", () => {
    const d = builtInDefaults();
    expect(d.rect).toEqual({ stroke: "red", strokeWidth: "M", fill: false });
    expect(d.arrow.heads).toBe("end");
    expect(d.text).toMatchObject({ font: "Inter Variable", size: 24, bold: false, plate: false });
  });

  it("config seeds all tools", () => {
    const d = seedFromConfig({ color: "blue", stroke: "L", font_size: 32 });
    expect([d.rect.stroke, d.ellipse.stroke, d.arrow.stroke, d.text.color]).toEqual([
      "blue",
      "blue",
      "blue",
      "blue",
    ]);
    expect(d.arrow.strokeWidth).toBe("L");
    expect(d.text.size).toBe(32);
  });

  it("state wins over config", () => {
    const base = seedFromConfig({ color: "blue" });
    const { tools, recentFonts } = mergeState(base, {
      version: 1,
      tools: { rect: { stroke: "green" } },
      recentFonts: ["Fira Code"],
    });
    expect(tools.rect.stroke).toBe("green");
    expect(tools.ellipse.stroke).toBe("blue");
    expect(recentFonts).toEqual(["Fira Code"]);
  });

  it("ignores other versions and malformed fields", () => {
    const base = builtInDefaults();
    expect(mergeState(base, { version: 2, tools: { rect: { stroke: "green" } } }).tools).toEqual(
      base,
    );
    expect(
      mergeState(base, { version: 1, tools: { rect: { stroke: "chartreuse", fill: 3 } } }).tools,
    ).toEqual(base);
    expect(mergeState(base, "garbage").tools).toEqual(base);
  });
});
