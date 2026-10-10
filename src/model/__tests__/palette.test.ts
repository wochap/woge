import { describe, expect, it } from "vitest";
import { contrastKey, swatchDigit } from "../palette";

describe("contrastKey", () => {
  it("picks black or white by luminance", () => {
    expect(contrastKey("yellow", "mocha")).toBe("black");
    expect(contrastKey("blue", "latte")).toBe("white");
    expect(contrastKey("white", "mocha")).toBe("black");
    expect(contrastKey("black", "latte")).toBe("white");
  });
});

describe("swatchDigit", () => {
  it("numbers swatches 1…9, 0", () => {
    expect(swatchDigit("red")).toBe("1");
    expect(swatchDigit("black")).toBe("0");
  });
});
