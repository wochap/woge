import {
  applyPatch,
  boundsOf,
  resolveColor,
  rotateObject90,
  scaleObj,
  snap45,
  strokePx,
  translate,
  type ArrowObj,
  type RectObj,
  type TextObj,
} from "../objects";

const r: RectObj = {
  id: "r",
  type: "rect",
  z: 1,
  x: 10,
  y: 20,
  w: 30,
  h: 40,
  stroke: "red",
  strokeWidth: "M",
  fill: null,
  fillOpacity: 0.25,
  strokeOpacity: 1,
};
const a: ArrowObj = {
  id: "a",
  type: "arrow",
  strokeOpacity: 1,
  z: 2,
  x1: 0,
  y1: 0,
  x2: 10,
  y2: 5,
  heads: "end",
  stroke: "blue",
  strokeWidth: "S",
};
const t: TextObj = {
  id: "t",
  type: "text",
  z: 3,
  x: 5,
  y: 5,
  text: "hi",
  color: "red",
  font: "Inter Variable",
  size: 24,
  bold: false,
  plate: null,
  plateOpacity: 0.7,
  colorOpacity: 1,
};

describe("objects", () => {
  it("scales stroke width with image size", () => {
    expect(strokePx("M", { w: 3840, h: 2160 })).toBe(8);
    expect(strokePx("M", { w: 800, h: 600 })).toBe(4);
    expect(strokePx("L", { w: 1920, h: 1080 })).toBe(8);
  });

  it("resolves colours per flavour", () => {
    expect(resolveColor("red", "latte")).toBe("#d20f39");
    expect(resolveColor("red", "mocha")).toBe("#f38ba8");
  });

  it("bounds and translate", () => {
    expect(boundsOf(a)).toEqual({ x: 0, y: 0, w: 10, h: 5 });
    expect(translate(a, 1, 2)).toMatchObject({ x1: 1, y1: 2, x2: 11, y2: 7 });
    expect(translate(r, 1, 2)).toMatchObject({ x: 11, y: 22 });
  });

  it("scales box geometry; text scales size", () => {
    const s = scaleObj(r, boundsOf(r), { x: 10, y: 20, w: 60, h: 80 });
    expect(s).toMatchObject({ w: 60, h: 80, strokeWidth: "M" });
    const b = boundsOf(t);
    expect(scaleObj(t, b, { ...b, w: b.w * 2, h: b.h * 2 }).size).toBe(48);
  });

  it("rotates each type", () => {
    expect(rotateObject90(r, 100, 200, "cw")).toMatchObject({
      x: 200 - 20 - 40,
      y: 10,
      w: 40,
      h: 30,
    });
    expect(rotateObject90(a, 100, 200, "cw")).toMatchObject({ x1: 200, y1: 0, x2: 195, y2: 10 });
  });

  it("snaps to 45°", () => {
    const p = snap45({ x: 0, y: 0 }, { x: Math.cos(0.7), y: Math.sin(0.7) });
    expect(Math.atan2(p.y, p.x)).toBeCloseTo(Math.PI / 4);
  });

  it("patches only fields of the type", () => {
    expect(applyPatch(r, { stroke: "green", heads: "both" })).not.toHaveProperty("heads");
    expect(applyPatch(t, { stroke: "green" })).toMatchObject({ color: "green" });
    expect(applyPatch(a, { fill: "blue", fillOpacity: 0.5 })).toEqual(a);
    expect(applyPatch(r, { plate: "black" })).toEqual(r);
    expect(applyPatch(r, { fill: "blue", fillOpacity: 2 })).toMatchObject({
      fill: "blue",
      fillOpacity: 1,
    });
    expect(applyPatch(t, { plate: "black", plateOpacity: 0.5 })).toMatchObject({
      plate: "black",
      plateOpacity: 0.5,
    });
  });
});
