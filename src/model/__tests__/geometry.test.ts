import type { Document } from "../document";
import { describe, expect, it } from "vitest";
import { newDocument } from "../document";
import {
  clampMove,
  clampRect,
  clampSide,
  fitAspect,
  rectFromDrag,
  resizeFromHandle,
  rotateDocument,
  rotatePoint90,
  rotateRect90,
  snapInt,
} from "../geometry";

const src = { path: null, name: "a", width: 1920, height: 1080 };

describe("rotate", () => {
  it("clockwise swaps dims and maps the crop", () => {
    const d = {
      ...newDocument(src),
      crop: { x: 100, y: 50, w: 800, h: 600 },
      size: { w: 800, h: 600 },
    };
    const r = rotateDocument(d, "cw");
    expect(r.rotation).toBe(90);
    expect(r.crop).toEqual({ x: 430, y: 100, w: 600, h: 800 });
    expect(r.size).toEqual({ w: 600, h: 800 });
  });

  it("full circle returns the start; ccw undoes cw", () => {
    const d = { ...newDocument(src), crop: { x: 100, y: 50, w: 800, h: 600 } };
    let r = d;
    for (let i = 0; i < 4; i++) r = rotateDocument(r, "cw");
    expect(r).toEqual(d);
    expect(rotateDocument(rotateDocument(d, "cw"), "ccw")).toEqual(d);
  });

  it("objects at the crop's top-left end up at its top-right", () => {
    const d = {
      ...newDocument(src),
      crop: { x: 100, y: 50, w: 800, h: 600 },
      objects: [
        {
          id: "a",
          type: "arrow",
          z: 1,
          x1: 100,
          y1: 50,
          x2: 100,
          y2: 50,
          heads: "end",
          stroke: "red",
          strokeWidth: "M",
        },
      ] as Document["objects"],
    };
    const r = rotateDocument(d, "cw");
    expect(r.objects[0]).toMatchObject({ x1: r.crop.x + r.crop.w, y1: r.crop.y });
  });

  it("point and rect helpers agree", () => {
    expect(rotatePoint90({ x: 0, y: 0 }, 10, 5)).toEqual({ x: 5, y: 0 });
    expect(rotatePoint90({ x: 0, y: 0 }, 10, 5, "ccw")).toEqual({ x: 0, y: 10 });
    expect(rotateRect90({ x: 0, y: 0, w: 10, h: 5 }, 10, 5, "ccw")).toEqual({
      x: 0,
      y: 0,
      w: 5,
      h: 10,
    });
  });
});

describe("crop rect", () => {
  const bounds = { w: 1920, h: 1080 };
  it("draw", () => {
    expect(rectFromDrag({ x: 240, y: 120 }, { x: 1480, y: 840 }, null, false)).toEqual({
      x: 240,
      y: 120,
      w: 1240,
      h: 720,
    });
  });
  it("shift draw is square", () => {
    const r = rectFromDrag({ x: 0, y: 0 }, { x: 300, y: 200 }, 1, false);
    expect([r.w, r.h]).toEqual([300, 300]);
  });
  it("alt draws from centre", () => {
    expect(rectFromDrag({ x: 100, y: 100 }, { x: 150, y: 120 }, null, true)).toEqual({
      x: 50,
      y: 80,
      w: 100,
      h: 40,
    });
  });
  it("move clamps flush to the edge", () => {
    expect(clampMove({ x: 1800, y: 0, w: 400, h: 100 }, bounds).x).toBe(1520);
  });
  it("clamp keeps at least 1x1 inside", () => {
    expect(clampRect({ x: -10, y: -10, w: 5, h: 5 }, bounds)).toEqual({ x: 0, y: 0, w: 1, h: 1 });
    expect(clampRect({ x: 1900, y: 0, w: 100, h: 50 }, bounds)).toEqual({
      x: 1900,
      y: 0,
      w: 20,
      h: 50,
    });
  });
  it("16:9 preset re-fit around centre", () => {
    const r = fitAspect({ x: 0, y: 0, w: 1000, h: 1000 }, 16 / 9);
    expect([r.w, r.h]).toEqual([1000, 562]);
    expect(r.y + r.h / 2).toBe(500);
  });
  it("corner resize", () => {
    expect(resizeFromHandle({ x: 0, y: 0, w: 100, h: 100 }, "se", { x: 100, y: 50 })).toEqual({
      x: 0,
      y: 0,
      w: 200,
      h: 150,
    });
  });
  it("corner resize keeps a locked aspect", () => {
    const r = resizeFromHandle(
      { x: 0, y: 0, w: 160, h: 90 },
      "se",
      { x: 160, y: 10 },
      { lockAspect: 16 / 9 },
    );
    expect(r.w / r.h).toBeCloseTo(16 / 9);
  });
  it("alt resize moves the opposite side symmetrically", () => {
    expect(
      resizeFromHandle(
        { x: 100, y: 100, w: 100, h: 100 },
        "e",
        { x: 10, y: 0 },
        { fromCenter: true },
      ),
    ).toEqual({
      x: 90,
      y: 100,
      w: 120,
      h: 100,
    });
  });
  it("snapInt rounds edges", () => {
    expect(snapInt({ x: 0.4, y: 0.6, w: 10.2, h: 0.1 })).toEqual({ x: 0, y: 1, w: 11, h: 1 });
  });
});

describe("resize bounds", () => {
  it("lower and upper", () => {
    expect(clampSide(0)).toBe(1);
    expect(clampSide(-50)).toBe(1);
    expect(clampSide(20000)).toBe(16384);
    expect(resizeFromHandle({ x: 0, y: 0, w: 10, h: 10 }, "e", { x: -50, y: 0 }).w).toBe(1);
  });
});
