import { describe, expect, it } from "vitest";
import { newDocument, rotatedDims, scaleFactor, visibleSize } from "../document";
import { rotateDocument } from "../geometry";

const src = { path: "/tmp/a.png", name: "a.png", width: 1920, height: 1080 };

describe("document", () => {
  it("fresh document", () => {
    const d = newDocument(src);
    expect(d.rotation).toBe(0);
    expect(d.crop).toEqual({ x: 0, y: 0, w: 1920, h: 1080 });
    expect(d.size).toEqual({ w: 1920, h: 1080 });
    expect(d.objects).toEqual([]);
    expect(visibleSize(d)).toEqual({ w: 1920, h: 1080 });
  });

  it("round-trips through JSON", () => {
    const d = {
      ...rotateDocument(newDocument(src), "cw"),
      crop: { x: 10, y: 20, w: 300, h: 400 },
      size: { w: 150, h: 200 },
    };
    expect(JSON.parse(JSON.stringify(d))).toEqual(d);
  });

  it("rotated dims and scale factor", () => {
    const d = rotateDocument(newDocument(src), "cw");
    expect(rotatedDims(d)).toEqual({ w: 1080, h: 1920 });
    const c = {
      ...newDocument(src),
      crop: { x: 100, y: 50, w: 800, h: 600 },
      size: { w: 400, h: 300 },
    };
    expect(scaleFactor(c)).toEqual({ x: 0.5, y: 0.5 });
  });
});
