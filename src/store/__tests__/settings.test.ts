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

describe("paint tool settings", () => {
  it("built-in defaults", () => {
    const d = builtInDefaults();
    expect(d.brush).toEqual({ stroke: "red", strokeWidth: "M", smooth: true });
    expect(d.highlight).toEqual({ stroke: "yellow", strokeWidth: "M" });
    expect(d.redact).toEqual({ mode: "pixelate", strength: 12 });
    expect(d.badge).toEqual({ color: "mauve", size: "M" });
  });

  it("restores paint tools from state, clamping strength", () => {
    const { tools } = mergeState(builtInDefaults(), {
      version: 1,
      tools: {
        redact: { mode: "blur", strength: 16 },
        badge: { color: "blue", size: "L" },
        brush: { smooth: false },
        highlight: { stroke: "green", strokeWidth: "bogus" },
      },
    });
    expect(tools.redact).toEqual({ mode: "blur", strength: 16 });
    expect(tools.badge).toEqual({ color: "blue", size: "L" });
    expect(tools.brush.smooth).toBe(false);
    expect(tools.highlight).toEqual({ stroke: "green", strokeWidth: "M" });
    const big = mergeState(builtInDefaults(), {
      version: 1,
      tools: { redact: { mode: "blur", strength: 99 } },
    });
    expect(big.tools.redact.strength).toBe(40);
  });
});
